import { elById } from '../shared/dom'
import { initAdminTopbar } from '../shared/layout'
import { metricsHTML, paginationHTML, rowHTML, tableInfoText } from './render'
import type { Category, IProductService, PaginatedResult, Product, ProductFilters, ProductFormData } from './types'

const PER_PAGE = 4

export class MenuManagementController {
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
    initAdminTopbar()
    // Carrega categorias, métricas e produtos em paralelo
    void Promise.all([
      this.loadCategories(),
      this.loadMetrics(),
      this.loadProducts(),
    ])
  }

  // ----------------------------------------------------------
  // DOM refs
  // ----------------------------------------------------------

  private resolveRefs(): void {
    this.$tableBody   = elById('table-body')
    this.$tableInfo   = elById('table-info')
    this.$pagination  = elById('pagination')
    this.$metricsGrid = elById('metrics-grid')
    this.$searchInput = elById<HTMLInputElement>('search-input')
    this.$modal       = elById('product-modal')
    this.$modalTitle  = elById('modal-title')
    this.$form        = elById<HTMLFormElement>('product-form')
    this.$submitBtn   = elById<HTMLButtonElement>('modal-submit')
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
    elById('btn-new-product').addEventListener('click', () => this.openModal(null))

    // Modal: fechar
    elById('modal-close').addEventListener('click',    () => this.closeModal())
    elById('modal-cancel').addEventListener('click',   () => this.closeModal())
    elById('modal-backdrop').addEventListener('click', () => this.closeModal())
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
      this.$metricsGrid.innerHTML = metricsHTML(m)
    } catch (err) {
      console.error('[MenuManagement] Falha ao carregar métricas:', err)
    }
  }

  private async loadProducts(): Promise<void> {
    this.setTableLoading(true)
    try {
      const result = await this.service.getProducts(this.page, PER_PAGE, this.filters)
      this.renderRows(result.data)
      this.$tableInfo.textContent = tableInfoText(result)
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

    this.$tableBody.innerHTML = products.map(p => rowHTML(p)).join('')

    this.$tableBody.querySelectorAll<HTMLButtonElement>('.row-action--edit').forEach(btn => {
      btn.addEventListener('click', () => void this.handleEdit(Number(btn.dataset.id)))
    })
    this.$tableBody.querySelectorAll<HTMLButtonElement>('.row-action--delete').forEach(btn => {
      btn.addEventListener('click', () => void this.handleDelete(Number(btn.dataset.id)))
    })
  }

  private renderPagination(result: PaginatedResult<Product>): void {
    const totalPages = Math.ceil(result.total / result.perPage)
    this.$pagination.innerHTML = paginationHTML(result.page, totalPages)

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
    elById('btn-new-product').focus()
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
    elById<HTMLInputElement>('prod-name').value           = p.name
    elById<HTMLSelectElement>('prod-category').value      = String(p.categoryId ?? '')
    elById<HTMLInputElement>('prod-price').value          = String(p.price)
    elById<HTMLTextAreaElement>('prod-desc').value        = p.description
    elById<HTMLInputElement>('prod-status').checked       = p.status === 'active'

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
      elById<HTMLSelectElement>('prod-category').value,
      10,
    )
    return {
      name:        elById<HTMLInputElement>('prod-name').value.trim(),
      categoryId:  isNaN(categoryId) ? 0 : categoryId,
      price:       parseFloat(elById<HTMLInputElement>('prod-price').value) || 0,
      description: elById<HTMLTextAreaElement>('prod-desc').value.trim(),
      status:      elById<HTMLInputElement>('prod-status').checked ? 'active' : 'paused',
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
}
