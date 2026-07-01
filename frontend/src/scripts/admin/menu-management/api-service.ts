import { produtoService, StatusProduto, type CreateProdutoDto, type UpdateProdutoDto } from '@/services/ProdutoService'
import { categoriaService } from '@/services/CategoriaService'
import { getToken } from '@/utils/auth'
import { mapCategoria, mapProduto, toStrapiStatus } from './mappers'
import type { Category, IProductService, PaginatedResult, Product, ProductFilters, ProductFormData, ProductMetrics } from './types'

export class ApiProductService implements IProductService {

  // ----------------------------------------------------------
  // Upload de imagem para Strapi Media Library
  //
  // Strapi expõe POST /api/upload (multipart/form-data) protegido por
  // JWT Bearer (não por cookie de sessão). Como FormData não pode ser
  // serializado como JSON, fazemos o fetch diretamente em vez de usar
  // httpClient, mas reaproveitamos a mesma baseURL e token de sessão.
  // ----------------------------------------------------------
  private async uploadImage(file: File): Promise<string> {
    const form = new FormData()
    form.append('files', file, file.name)

    const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:1337'
    const token = getToken()

    const res = await fetch(`${baseURL}/api/upload`, {
      method:  'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body:    form,
    })

    if (!res.ok) {
      throw new Error(`Upload falhou: ${res.status} ${res.statusText}`)
    }

    const [uploaded] = (await res.json()) as Array<{ url: string }>

    // Strapi retorna caminho relativo ("/uploads/...").
    return uploaded.url
  }

  // ----------------------------------------------------------
  // Listagem paginada com filtros
  // ----------------------------------------------------------
  async getProducts(
    page: number,
    perPage: number,
    filters: ProductFilters,
  ): Promise<PaginatedResult<Product>> {

    const strapiFilters: Record<string, unknown> = {}

    // Busca textual em nome e descrição.
    // ⚠️  Busca em categoria.nome (relation) exige deep-filter habilitado
    //     no Strapi — veja as notas de configuração no final do arquivo.
    //     Por ora limitamos a campos diretos para segurança.
    if (filters.search.trim()) {
      strapiFilters.$or = [
        { nome:     { $containsi: filters.search } },
        { descricao: { $containsi: filters.search } },
      ]
    }

    if (filters.categoryId !== null) {
      strapiFilters.categoria = { id: { $eq: filters.categoryId } }
    }

    if (filters.status !== 'all') {
      strapiFilters.situacao = { $eq: toStrapiStatus(filters.status) }
    }

    // listAll() expõe o método protegido list() do StrapiCrudService.
    // Veja a nota no ProdutoService.ts sobre a adição desse método.
    const result = await produtoService.listAll({
      filters:    strapiFilters,
      sort:       ['nome:asc'],
      populate:   ['categoria'],
      pagination: { page, pageSize: perPage },
    })

    return {
      data:    result.data.map(mapProduto),
      total:   result.pagination.total,
      page:    result.pagination.page,
      perPage: result.pagination.pageSize,
    }
  }

  // ----------------------------------------------------------
  // Produto individual (para edição)
  // ----------------------------------------------------------
  async getProductById(id: number): Promise<Product> {
    // getWithCategoria já faz populate: ['categoria']
    const result = await produtoService.getWithCategoria(id)
    // getById / getWithCategoria retorna StrapiEntity<T> diretamente
    return mapProduto(result)
  }

  // ----------------------------------------------------------
  // Criação
  // ----------------------------------------------------------
  async createProduct(data: ProductFormData): Promise<Product> {
    let imageUrl = data.imageUrl

    if (data.imageFile) {
      imageUrl = await this.uploadImage(data.imageFile)
    }

    const payload: CreateProdutoDto = {
      nome:       data.name,
      categoria:  data.categoryId,
      preco:      data.price,
      descricao:  data.description || undefined,
      imagem_url: imageUrl ?? undefined,
      situacao:   toStrapiStatus(data.status),
    }

    const created = await produtoService.create(payload)
    // Re-fetch para ter a relação categoria populada com dados completos
    return this.getProductById(created.id)
  }

  // ----------------------------------------------------------
  // Atualização
  // ----------------------------------------------------------
  async updateProduct(id: number, data: ProductFormData): Promise<Product> {
    let imageUrl = data.imageUrl

    if (data.imageFile) {
      imageUrl = await this.uploadImage(data.imageFile)
    }

    const payload: UpdateProdutoDto = {
      nome:       data.name,
      categoria:  data.categoryId,
      preco:      data.price,
      descricao:  data.description || null,
      imagem_url: imageUrl,
      situacao:   toStrapiStatus(data.status),
    }

    const updated = await produtoService.update(id, payload)
    return this.getProductById(updated.id)
  }

  // ----------------------------------------------------------
  // Exclusão
  // ----------------------------------------------------------
  async deleteProduct(id: number): Promise<void> {
    // delete() é herdado de StrapiCrudService como método público
    await produtoService.delete(id)
  }

  // ----------------------------------------------------------
  // Categorias para o select do formulário
  // ----------------------------------------------------------
  async getCategories(): Promise<Category[]> {
    const result = await categoriaService.listAtivas()
    return result.data.map(mapCategoria)
  }

  // ----------------------------------------------------------
  // Métricas para o grid de cards
  // 3 chamadas paralelas com pageSize:1 (apenas queremos o total da paginação)
  // Se o volume de dados crescer, considere um endpoint customizado no Strapi
  // que retorne os 4 números em uma só chamada.
  // ----------------------------------------------------------
  async getMetrics(): Promise<ProductMetrics> {
    const [allRes, activeRes, catsRes] = await Promise.all([
      produtoService.listAll({ pagination: { pageSize: 1 } }),
      produtoService.listAll({
        filters:    { situacao: { $eq: StatusProduto.Ativo } },
        pagination: { pageSize: 1 },
      }),
      categoriaService.listAtivas({ pagination: { pageSize: 1 } }),
    ])

    const total      = allRes.pagination.total
    const active     = activeRes.pagination.total
    const paused     = total - active
    const categories = catsRes.pagination.total

    return { total, categories, active, paused }
  }
}

// ============================================================
// NOTAS DE CONFIGURAÇÃO DO STRAPI
// ============================================================
//
// 1. CAMPO imagem_url no Content Type "Produto"
//    - Tipo: Text (Short Text) ou Custom Field para URL
//    - Nullable: true
//    - O upload vai para /api/upload e retorna { url }
//    - Se preferir Strapi Media (relation), troque imagem_url por um
//      campo "imagem" do tipo Media e ajuste o mapper/mapProduto.
//
// 2. PERMISSÕES (Settings → Roles → Authenticated ou Public)
//    Produto:   find, findOne, create, update, delete
//    Categoria: find
//    Upload:    upload  ← necessário para o uploadImage()
//
// 3. DEEP FILTERS (busca por categoria.nome)
//    Para habilitar $or com campos de relação no Strapi 4,
//    adicione em config/middlewares.js:
//      { name: 'strapi::query', config: { deepLimit: 10 } }
//    ou em sua rota customizada com { populate: 'deep' }.
//    Enquanto não habilitado, a busca cobre só nome e descricao.
//
// 4. ENDPOINT DE MÉTRICAS (opcional — otimização)
//    Se as 3 chamadas de getMetrics() pesarem em produção, crie um
//    controller customizado no Strapi:
//      GET /api/produtos/metricas
//    que retorna { total, ativo, pausado, categorias } em uma query
//    SQL com COUNT + GROUP BY situacao.
//
// 5. POPULATE padrão (recomendado)
//    Em src/api/produto/routes/produto.js, configure middlewares
//    para que GET /api/produtos já venha com populate: ['categoria'],
//    evitando passar o parâmetro em cada chamada.
//    Exemplo:
//      module.exports = { routes: [...defaultRoutes] }
//    + middlewares: [{ name: 'strapi::populate', config: { populate: ['categoria'] } }]
