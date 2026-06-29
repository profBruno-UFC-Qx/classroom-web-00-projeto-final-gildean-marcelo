import { StrapiCrudService } from '@/api/StrapiCrudService'
import type { StrapiEntity, StrapiQueryParams } from '@/api/StrapiAdapters'
import type { CategoriaAttributes } from './CategoriaService'


export enum StatusProduto {
  Ativo   = 'ativo',
  Pausado = 'pausado',
}

export interface ProdutoAttributes {
  nome:       string
  descricao:  string | null
  preco:      number
  imagem_url: string | null
  situacao:   StatusProduto
  categoria:  (StrapiEntity<CategoriaAttributes> & { nome: string }) | null
  createdAt:  string
  updatedAt:  string
}

export interface CreateProdutoDto {
  nome:        string
  categoria:   number
  preco:       number
  descricao?:  string
  imagem_url?: string
  situacao?:   StatusProduto
}

export interface UpdateProdutoDto {
  nome?:       string
  categoria?:  number
  preco?:      number
  descricao?:  string | null
  imagem_url?: string | null
  situacao?:   StatusProduto
}


export class ProdutoService extends StrapiCrudService<ProdutoAttributes, CreateProdutoDto, UpdateProdutoDto> {

  constructor() {
    super('/api/produtos')
  }

  async create(payload: CreateProdutoDto) {
    return super.create({
      ...payload,
      situacao: payload.situacao ?? StatusProduto.Ativo,
    })
  }

  async update(id: number, payload: UpdateProdutoDto) {
    return super.update(id, payload)
  }

  async getWithCategoria(id: number) {
    return this.getById(id, { populate: ['categoria'] })
  }

  async listByCategoria(categoriaId: number, params?: StrapiQueryParams<ProdutoAttributes>) {
    return this.list({
      ...params,
      filters: {
        ...params?.filters,
        situacao:  { $eq: StatusProduto.Ativo },
        categoria: { id: { $eq: categoriaId } },
      },
      sort:     ['nome:asc'],
      populate: ['categoria'],
    })
  }

  async listAtivos(params?: StrapiQueryParams<ProdutoAttributes>) {
    return this.list({
      ...params,
      filters:  { ...params?.filters, situacao: { $eq: StatusProduto.Ativo } },
      sort:     ['nome:asc'],
      populate: ['categoria'],
    })
  }

  /**
   * Listagem irrestrita (sem filtro de situacao) com populate de categoria.
   *
   * Necessário porque list() em StrapiCrudService é protected, não
   * acessível diretamente de fora da hierarquia de classe.
   * Usado pelo painel admin para exibir TODOS os produtos
   * (ativos + pausados) com filtros dinâmicos.
   *
   * @param params - Quaisquer StrapiQueryParams; populate padrão ['categoria']
   *                 pode ser sobrescrito via params.populate.
   */
  async listAll(params?: StrapiQueryParams<ProdutoAttributes>) {
    return this.list({
      populate: ['categoria'],
      ...params,          // params sobrescreve o populate padrão se necessário
    })
  }

  async pausar(id: number) {
    return this.update(id, { situacao: StatusProduto.Pausado })
  }

  async reativar(id: number) {
    return this.update(id, { situacao: StatusProduto.Ativo })
  }
}

export const produtoService = new ProdutoService()