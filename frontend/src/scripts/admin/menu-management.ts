
import {
  produtoService,
  StatusProduto,
  type ProdutoAttributes,
  type CreateProdutoDto,
  type UpdateProdutoDto,
} from '@/services/ProdutoService'

import {
  categoriaService,
  type CategoriaAttributes,
} from '@/services/CategoriaService'

import type { StrapiEntity } from '@/api/StrapiAdapters'
import { verificarAcessoAdmin, getUsuarioLogado, getToken, limparSessao } from '@/utils/auth'
import { PerfilUsuario } from '@/services/UsuarioService'

if (!verificarAcessoAdmin([PerfilUsuario.Admin])) {
  throw new Error('Acesso restrito a administradores.')
}

// ============================================================
// Tipos internos da UI — camada de apresentação
// ============================================================

type ProductStatus = 'active' | 'paused'

interface Product {
  id:          number
  name:        string
  description: string
  category:    string        // nome para exibição
  categoryId:  number | null // id para filtragem/submissão
  price:       number
  status:      ProductStatus
  image:       string | null
}

interface Category {
  id:   number
  name: string
}

/**
 * Dados que o formulário entrega para create / update.
 * imageFile: arquivo novo selecionado pelo usuário (null = sem mudança).
 * imageUrl:  URL atual da imagem (vinda da API ao editar).
 */
interface ProductFormData {
  name:        string
  description: string
  categoryId:  number
  price:       number
  status:      ProductStatus
  imageFile:   File | null
  imageUrl:    string | null
}

interface ProductFilters {
  search:     string
  categoryId: number | null
  status:     'all' | ProductStatus
}

interface PaginatedResult<T> {
  data:    T[]
  total:   number
  page:    number
  perPage: number
}

interface ProductMetrics {
  total:      number
  categories: number
  active:     number
  paused:     number
}

// ============================================================
// Mappers — StrapiEntity → tipo interno
// ============================================================

// Strapi v5: StrapiEntity<T> = T & { id, documentId } — sem wrapper "attributes".
// Os campos do Content Type ficam direto na entidade.
function mapProduto(entity: StrapiEntity<ProdutoAttributes>): Product {
  // categoria é populada como objeto flat (StrapiEntity<CategoriaAttributes>)
  const cat = entity.categoria
  return {
    id:          entity.id,
    name:        entity.nome,
    description: entity.descricao ?? '',
    category:    cat?.nome ?? '—',
    categoryId:  cat?.id ?? null,
    price:       entity.preco,
    status:      entity.situacao === StatusProduto.Ativo ? 'active' : 'paused',
    image:       entity.imagem_url ?? null,
  }
}

function mapCategoria(entity: StrapiEntity<CategoriaAttributes>): Category {
  // Strapi v5 flat: nome fica direto na entidade
  return { id: entity.id, name: entity.nome }
}

function toStrapiStatus(s: ProductStatus): StatusProduto {
  return s === 'active' ? StatusProduto.Ativo : StatusProduto.Pausado
}

// ============================================================
// Interface do serviço — contrato usado pelo Controller
// ============================================================

interface IProductService {
  getProducts(
    page: number,
    perPage: number,
    filters: ProductFilters,
  ): Promise<PaginatedResult<Product>>

  getProductById(id: number): Promise<Product>

  getCategories(): Promise<Category[]>

  createProduct(data: ProductFormData): Promise<Product>

  updateProduct(id: number, data: ProductFormData): Promise<Product>

  deleteProduct(id: number): Promise<void>

  getMetrics(): Promise<ProductMetrics>
}

// ============================================================
// ApiProductService — implementação real com Strapi
// ============================================================

class ApiProductService implements IProductService {

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
// Controller
// ============================================================

const PER_PAGE = 4

class MenuManagementController {
  private service: IProductService

  // Estado de paginação e filtros
  private page    = 1
  private filters: ProductFilters = { search: '', categoryId: null, status: 'all' }

  // Estado do modal / formulário
  private editingProduct:   Product | null = null
  private categories:       Category[]    = []
  private pendingImageFile: File | null   = null   // arquivo novo selecionado
  private currentImageUrl:  string | null = null   // URL atual ao editar
  private isSubmitting      = false
  private searchTimer: ReturnType<typeof setTimeout> | null = null

  // Refs de DOM — resolvidas uma vez no init()
  private $tableBody!:   HTMLElement
  private $tableInfo!:   HTMLElement
  private $pagination!:  HTMLElement
  private $metricsGrid!: HTMLElement
  private $searchInput!: HTMLInputElement
  private $modal!:       HTMLElement
  private $modalTitle!:  HTMLElement
  private $form!:        HTMLFormElement
  private $submitBtn!:   HTMLButtonElement

  constructor(service: IProductService) {
    this.service = service
  }

  init(): void {
    this.resolveRefs()
    this.bindStaticEvents()
    this.renderSidebarUser()
    // Carrega categorias, métricas e produtos em paralelo
    void Promise.all([
      this.loadCategories(),
      this.loadMetrics(),
      this.loadProducts(),
    ])
  }

  private renderSidebarUser(): void {
    const user = getUsuarioLogado()
    if (!user) return
    const PERFIL_LABEL: Record<string, string> = { admin: 'Administrador', cozinha: 'Cozinha', cliente: 'Cliente' }
    const nameEl = document.querySelector<HTMLElement>('.sidebar__user-name')
    const roleEl = document.querySelector<HTMLElement>('.sidebar__user-role')
    if (nameEl) nameEl.textContent = user.username
    if (roleEl) roleEl.textContent = PERFIL_LABEL[user.perfil] ?? user.perfil
  }

  // ----------------------------------------------------------
  // DOM helpers
  // ----------------------------------------------------------

  private el<T extends HTMLElement = HTMLElement>(id: string): T {
    const el = document.getElementById(id) as T | null
    if (!el) throw new Error(`#${id} não encontrado no DOM`)
    return el
  }

  private resolveRefs(): void {
    this.$tableBody   = this.el('table-body')
    this.$tableInfo   = this.el('table-info')
    this.$pagination  = this.el('pagination')
    this.$metricsGrid = this.el('metrics-grid')
    this.$searchInput = this.el<HTMLInputElement>('search-input')
    this.$modal       = this.el('product-modal')
    this.$modalTitle  = this.el('modal-title')
    this.$form        = this.el<HTMLFormElement>('product-form')
    this.$submitBtn   = this.el<HTMLButtonElement>('modal-submit')
  }

  // ----------------------------------------------------------
  // Event binding (elementos estáticos do HTML)
  // ----------------------------------------------------------

  private bindStaticEvents(): void {

    // Busca com debounce de 350 ms
    this.$searchInput.addEventListener('input', () => {
      if (this.searchTimer) clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.filters.search = this.$searchInput.value
        this.page = 1
        void this.loadProducts()
      }, 350)
    })

    // Novo produto
    this.el('btn-new-product').addEventListener('click', () => this.openModal(null))

    // Filtro avançado — stub; conecte seu painel de filtros aqui
    // Sugestão: ao abrir o painel, use this.categories (já carregado)
    // para popular um <select> de categoria e chame:
    //   this.filters.categoryId = selectedId
    //   this.filters.status = selectedStatus
    //   this.page = 1
    //   void this.loadProducts()
    this.el('btn-filter').addEventListener('click', () => {
      console.info('[MenuManagement] Painel de filtros — implemente conforme necessário.')
    })

    // Topbar stubs
    this.el('btn-notifications').addEventListener('click', () => {
      console.info('[MenuManagement] Notificações — implemente conforme necessário.')
    })
    this.el('btn-logout').addEventListener('click', () => {
      limparSessao()
      window.location.href = '/src/pages/user/login.html'
    })

    // Modal: fechar
    this.el('modal-close').addEventListener('click',    () => this.closeModal())
    this.el('modal-cancel').addEventListener('click',   () => this.closeModal())
    this.el('modal-backdrop').addEventListener('click', () => this.closeModal())
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.closeModal()
    })

    // Submit via botão fora do <form>
    this.$form.addEventListener('submit', (e: Event) => {
      e.preventDefault()
      void this.handleSubmit()
    })
    this.$submitBtn.addEventListener('click', () => {
      this.$form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
    })

    this.bindUploadArea()
  }

  private bindUploadArea(): void {
    const area  = document.getElementById('image-upload-area')
    const input = document.getElementById('image-file-input') as HTMLInputElement | null
    if (!area || !input) return

    area.addEventListener('click',   () => input.click())
    area.addEventListener('keydown', (e: Event) => {
      const ke = e as KeyboardEvent
      if (ke.key === 'Enter' || ke.key === ' ') { e.preventDefault(); input.click() }
    })

    area.addEventListener('dragover', (e: Event) => {
      e.preventDefault()
      area.classList.add('upload-area--drag-over')
    })
    area.addEventListener('dragleave', () => area.classList.remove('upload-area--drag-over'))

    area.addEventListener('drop', (e: Event) => {
      e.preventDefault()
      area.classList.remove('upload-area--drag-over')
      const file = (e as DragEvent).dataTransfer?.files[0]
      if (file) this.setPendingImage(file, area)
    })

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (file) this.setPendingImage(file, area)
    })
  }

  // ----------------------------------------------------------
  // Carregamento de dados
  // ----------------------------------------------------------

  private async loadCategories(): Promise<void> {
    try {
      this.categories = await this.service.getCategories()
      // Popula (e habilita) o select imediatamente.
      // Se o modal já estiver aberto quando a resposta chegar,
      // o select é atualizado no lugar sem precisar reabrir.
      this.populateCategorySelect()
    } catch (err) {
      console.error('[MenuManagement] Falha ao carregar categorias:', err)
      // Desativa o select e exibe mensagem de erro
      const select = document.getElementById('prod-category') as HTMLSelectElement | null
      if (select) {
        select.innerHTML = '<option value="" disabled selected>Erro ao carregar categorias</option>'
        select.disabled  = true
      }
    }
  }

  private async loadMetrics(): Promise<void> {
    try {
      const m = await this.service.getMetrics()
      this.renderMetrics(m)
    } catch (err) {
      console.error('[MenuManagement] Falha ao carregar métricas:', err)
    }
  }

  private async loadProducts(): Promise<void> {
    this.setTableLoading(true)
    try {
      const result = await this.service.getProducts(this.page, PER_PAGE, this.filters)
      this.renderRows(result.data)
      this.renderTableInfo(result)
      this.renderPagination(result)
    } catch (err) {
      console.error('[MenuManagement] Falha ao carregar produtos:', err)
      this.$tableBody.innerHTML = `
        <div class="table-empty">
          <span class="material-symbols-outlined table-empty__icon" aria-hidden="true">error_outline</span>
          <p class="table-empty__text">Falha ao carregar produtos.</p>
          <p class="table-empty__sub">Verifique sua conexão e tente novamente.</p>
        </div>`
    } finally {
      this.setTableLoading(false)
    }
  }

  // ----------------------------------------------------------
  // Renderização
  // ----------------------------------------------------------

  private renderMetrics(m: ProductMetrics): void {
    const items = [
      { label: 'Total Items', value: m.total,      icon: 'restaurant',   cls: 'metric-value--primary' },
      { label: 'Categories',  value: m.categories, icon: 'category',     cls: 'metric-value--primary' },
      { label: 'Active',      value: m.active,     icon: 'check_circle', cls: 'metric-value--active'  },
      { label: 'Paused',      value: m.paused,     icon: 'pause_circle', cls: 'metric-value--paused'  },
    ]
    this.$metricsGrid.innerHTML = items.map(item => `
      <div class="metric-card">
        <div class="metric-card__header">
          <span class="material-symbols-outlined metric-card__icon" aria-hidden="true">${item.icon}</span>
          <span class="metric-card__label">${item.label}</span>
        </div>
        <span class="metric-card__value ${item.cls}">${item.value}</span>
      </div>`).join('')
  }

  private renderRows(products: Product[]): void {
    if (products.length === 0) {
      this.$tableBody.innerHTML = `
        <div class="table-empty">
          <span class="material-symbols-outlined table-empty__icon" aria-hidden="true">search_off</span>
          <p class="table-empty__text">Nenhum produto encontrado.</p>
          <p class="table-empty__sub">Tente ajustar sua busca ou filtros.</p>
        </div>`
      return
    }

    this.$tableBody.innerHTML = products.map(p => this.rowHTML(p)).join('')

    this.$tableBody.querySelectorAll<HTMLButtonElement>('.row-action--edit').forEach(btn => {
      btn.addEventListener('click', () => void this.handleEdit(Number(btn.dataset.id)))
    })
    this.$tableBody.querySelectorAll<HTMLButtonElement>('.row-action--delete').forEach(btn => {
      btn.addEventListener('click', () => void this.handleDelete(Number(btn.dataset.id)))
    })
  }

  private rowHTML(p: Product): string {
    const paused = p.status === 'paused'
    const thumb  = p.image
      ? `<img class="product-thumb__img" src="${p.image}" alt="${this.esc(p.name)}" loading="lazy">`
      : `<span class="material-symbols-outlined product-thumb__placeholder" aria-hidden="true">image</span>`

    const badge = paused
      ? `<span class="status-badge status-badge--paused">
           <span class="status-badge__dot" aria-hidden="true"></span>Paused
         </span>`
      : `<span class="status-badge status-badge--active">
           <span class="status-badge__dot" aria-hidden="true"></span>Active
         </span>`

    return `
      <div class="table-row${paused ? ' table-row--paused' : ''}" data-id="${p.id}" role="row">
        <div class="table-cell table-cell--name" role="cell">
          <div class="product-thumb${paused ? ' product-thumb--dim' : ''}">${thumb}</div>
          <div class="${paused ? 'product-info--dim' : ''}">
            <p class="product-name">${this.esc(p.name)}</p>
            <p class="product-desc">${this.esc(p.description)}</p>
          </div>
        </div>
        <div class="table-cell table-cell--category" role="cell">
          <span class="category-chip">${this.esc(p.category)}</span>
        </div>
        <div class="table-cell table-cell--price${paused ? ' product-info--dim' : ''}" role="cell">
          $${p.price.toFixed(2)}
        </div>
        <div class="table-cell table-cell--status" role="cell">${badge}</div>
        <div class="table-cell table-cell--actions" role="cell">
          <button class="row-action row-action--edit"   data-id="${p.id}" aria-label="Editar ${this.esc(p.name)}" title="Editar">
            <span class="material-symbols-outlined" aria-hidden="true">edit</span>
          </button>
          <button class="row-action row-action--delete" data-id="${p.id}" aria-label="Excluir ${this.esc(p.name)}" title="Excluir">
            <span class="material-symbols-outlined" aria-hidden="true">delete</span>
          </button>
        </div>
      </div>`
  }

  private renderTableInfo(result: PaginatedResult<Product>): void {
    if (result.total === 0) { this.$tableInfo.textContent = 'Nenhum resultado encontrado'; return }
    const start = (result.page - 1) * result.perPage + 1
    const end   = Math.min(result.page * result.perPage, result.total)
    this.$tableInfo.textContent = `Exibindo ${start}–${end} de ${result.total} produtos`
  }

  private renderPagination(result: PaginatedResult<Product>): void {
    const totalPages = Math.ceil(result.total / result.perPage)
    if (totalPages <= 1) { this.$pagination.innerHTML = ''; return }

    const { page } = result
    const range    = this.pageRange(page, totalPages)
    let pagesHTML  = ''
    let prev: number | null = null

    for (const n of range) {
      if (prev !== null && n - prev > 1) {
        pagesHTML += `<span class="pagination__dots" aria-hidden="true">…</span>`
      }
      pagesHTML += `
        <button class="pagination__btn${n === page ? ' pagination__btn--active' : ''}"
                data-page="${n}"
                aria-label="Página ${n}"
                ${n === page ? 'aria-current="page"' : ''}>${n}</button>`
      prev = n
    }

    this.$pagination.innerHTML = `
      <button class="pagination__btn pagination__btn--nav" data-page="${page - 1}"
              aria-label="Página anterior" ${page === 1 ? 'disabled' : ''}>
        <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
      </button>
      ${pagesHTML}
      <button class="pagination__btn pagination__btn--nav" data-page="${page + 1}"
              aria-label="Próxima página" ${page === totalPages ? 'disabled' : ''}>
        <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
      </button>`

    this.$pagination
      .querySelectorAll<HTMLButtonElement>('.pagination__btn[data-page]')
      .forEach(btn => {
        btn.addEventListener('click', () => {
          const target = Number(btn.dataset.page)
          if (!isNaN(target) && target >= 1 && target <= totalPages && target !== this.page) {
            this.page = target
            void this.loadProducts()
          }
        })
      })
  }

  private pageRange(current: number, total: number): number[] {
    const s = new Set<number>([1, total])
    for (let i = current - 1; i <= current + 1; i++) {
      if (i >= 1 && i <= total) s.add(i)
    }
    return Array.from(s).sort((a, b) => a - b)
  }

  // ----------------------------------------------------------
  // Modal
  // ----------------------------------------------------------

  private openModal(product: Product | null): void {
    this.editingProduct = product
    this.$modalTitle.textContent = product ? 'Editar Produto' : 'Adicionar Novo Produto'
    this.resetForm()
    this.populateCategorySelect()
    if (product) this.populateForm(product)

    this.$modal.classList.add('modal--open')
    this.$modal.setAttribute('aria-hidden', 'false')

    setTimeout(() => {
      (this.$form.querySelector<HTMLElement>('input, select, textarea'))?.focus()
    }, 50)
  }

  private closeModal(): void {
    if (!this.$modal.classList.contains('modal--open')) return
    this.$modal.classList.remove('modal--open')
    this.$modal.setAttribute('aria-hidden', 'true')
    this.editingProduct = null
    this.resetForm()
    this.el('btn-new-product').focus()
  }

  private resetForm(): void {
    this.$form.reset()
    this.setSubmitting(false)
    this.pendingImageFile = null
    this.currentImageUrl  = null

    this.$form.querySelectorAll('.field--error').forEach(el => el.classList.remove('field--error'))

    const area = document.getElementById('image-upload-area')
    if (area) {
      area.innerHTML = `
        <span class="material-symbols-outlined upload-area__icon" aria-hidden="true">add_a_photo</span>
        <span class="upload-area__label">Clique para enviar ou arraste aqui</span>
        <span class="upload-area__hint">SVG, PNG, JPG ou GIF (máx. 5 MB)</span>`
    }

    const fileInput = document.getElementById('image-file-input') as HTMLInputElement | null
    if (fileInput) fileInput.value = ''
  }

  private populateForm(p: Product): void {
    this.el<HTMLInputElement>('prod-name').value           = p.name
    this.el<HTMLSelectElement>('prod-category').value      = String(p.categoryId ?? '')
    this.el<HTMLInputElement>('prod-price').value          = String(p.price)
    this.el<HTMLTextAreaElement>('prod-desc').value        = p.description
    this.el<HTMLInputElement>('prod-status').checked       = p.status === 'active'

    // Preserva a URL atual para não sobrescrevê-la caso o usuário não troque a imagem
    this.currentImageUrl  = p.image
    this.pendingImageFile = null

    if (p.image) {
      const area = document.getElementById('image-upload-area')
      if (area) {
        area.innerHTML = `<img class="upload-area__preview" src="${p.image}" alt="Imagem atual do produto">`
      }
    }
  }

  /**
   * Popula o <select id="prod-category"> com as categorias carregadas via API.
   * Chamado após loadCategories() e a cada abertura do modal.
   * O select começa disabled no HTML e é habilitado após o carregamento.
   */
  private populateCategorySelect(): void {
    const select = document.getElementById('prod-category') as HTMLSelectElement | null
    if (!select) return

    // Guarda o valor atual para restaurar ao editar
    const currentValue = select.value

    select.innerHTML = ''

    if (this.categories.length === 0) {
      const opt       = document.createElement('option')
      opt.value       = ''
      opt.disabled    = true
      opt.selected    = true
      opt.textContent = 'Nenhuma categoria disponível'
      select.appendChild(opt)
      select.disabled = true
      return
    }

    // Placeholder padrão
    const ph       = document.createElement('option')
    ph.value       = ''
    ph.disabled    = true
    ph.selected    = !currentValue
    ph.textContent = 'Selecionar categoria…'
    select.appendChild(ph)

    for (const cat of this.categories) {
      const opt       = document.createElement('option')
      opt.value       = String(cat.id)
      opt.textContent = cat.name
      if (String(cat.id) === currentValue) opt.selected = true
      select.appendChild(opt)
    }

    select.disabled = false
  }

  // ----------------------------------------------------------
  // Formulário — submissão, leitura, validação
  // ----------------------------------------------------------

  private async handleSubmit(): Promise<void> {
    if (this.isSubmitting) return
    if (!this.validate()) return

    const data = this.readForm()
    this.setSubmitting(true)

    try {
      if (this.editingProduct) {
        await this.service.updateProduct(this.editingProduct.id, data)
      } else {
        await this.service.createProduct(data)
      }
      this.closeModal()
      void this.loadMetrics()
      void this.loadProducts()
    } catch (err) {
      console.error('[MenuManagement] Falha ao salvar produto:', err)
      // TODO: exibir toast de erro para o usuário
      this.setSubmitting(false)
    }
  }

  private readForm(): ProductFormData {
    const categoryId = parseInt(
      this.el<HTMLSelectElement>('prod-category').value,
      10,
    )
    return {
      name:        this.el<HTMLInputElement>('prod-name').value.trim(),
      categoryId:  isNaN(categoryId) ? 0 : categoryId,
      price:       parseFloat(this.el<HTMLInputElement>('prod-price').value) || 0,
      description: this.el<HTMLTextAreaElement>('prod-desc').value.trim(),
      status:      this.el<HTMLInputElement>('prod-status').checked ? 'active' : 'paused',
      imageFile:   this.pendingImageFile,
      imageUrl:    this.currentImageUrl,
    }
  }

  private validate(): boolean {
    type Rule = { id: string; check: (el: HTMLElement) => boolean }

    const rules: Rule[] = [
      {
        id:    'prod-name',
        check: el => (el as HTMLInputElement).value.trim().length > 0,
      },
      {
        id:    'prod-category',
        check: el => {
          const v = parseInt((el as HTMLSelectElement).value, 10)
          return !isNaN(v) && v > 0
        },
      },
      {
        id:    'prod-price',
        check: el => {
          const v = parseFloat((el as HTMLInputElement).value)
          return !isNaN(v) && v > 0
        },
      },
    ]

    let valid = true
    for (const rule of rules) {
      const el      = document.getElementById(rule.id)
      const wrapper = el?.closest('.field')
      if (!el || !wrapper) continue
      if (rule.check(el)) {
        wrapper.classList.remove('field--error')
      } else {
        wrapper.classList.add('field--error')
        valid = false
      }
    }
    return valid
  }

  private setSubmitting(loading: boolean): void {
    this.isSubmitting        = loading
    this.$submitBtn.disabled = loading
    this.$submitBtn.textContent = loading ? 'Salvando…' : 'Salvar Produto'
  }

  // ----------------------------------------------------------
  // Ações de linha
  // ----------------------------------------------------------

  private async handleEdit(id: number): Promise<void> {
    try {
      const product = await this.service.getProductById(id)
      this.openModal(product)
    } catch (err) {
      console.error('[MenuManagement] Falha ao buscar produto para edição:', err)
    }
  }

  private async handleDelete(id: number): Promise<void> {
    const rowEl = this.$tableBody.querySelector<HTMLElement>(`[data-id="${id}"]`)
    const name  = rowEl?.querySelector('.product-name')?.textContent?.trim() ?? 'este produto'

    if (!window.confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return

    try {
      await this.service.deleteProduct(id)

      // Recua uma página se a página atual ficou vazia
      const check = await this.service.getProducts(this.page, PER_PAGE, this.filters)
      if (check.data.length === 0 && this.page > 1) this.page--

      void this.loadMetrics()
      void this.loadProducts()
    } catch (err) {
      console.error('[MenuManagement] Falha ao excluir produto:', err)
    }
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------

  private setTableLoading(loading: boolean): void {
    this.$tableBody.classList.toggle('table-body--loading', loading)
  }

  private setPendingImage(file: File, container: HTMLElement): void {
    if (!file.type.startsWith('image/')) return
    this.pendingImageFile = file
    const reader = new FileReader()
    reader.onload = e => {
      container.innerHTML = `
        <img class="upload-area__preview" src="${e.target?.result}" alt="Preview">`
    }
    reader.readAsDataURL(file)
  }

  /** Escapa HTML para evitar XSS em innerHTML dinâmico. */
  private esc(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}

// ============================================================
// Bootstrap
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const service: IProductService = new ApiProductService()
  const controller = new MenuManagementController(service)
  controller.init()
})

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