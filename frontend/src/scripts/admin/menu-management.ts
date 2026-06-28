/**
 * menu-management.ts
 * Danny's Fresh Market — Admin / Menu Management
 *
 * Compile:  tsc menu-management.ts --target ES2017 --lib ES2017,DOM
 * Or via bundler (vite, esbuild, webpack) pointing to this file.
 *
 * To swap the mock for a real API, implement IProductService
 * and replace `new MockProductService()` in the bootstrap block.
 */

// ============================================================
// Types
// ============================================================

type ProductStatus = 'active' | 'paused';

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  status: ProductStatus;
  image?: string;
}

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  price: number;
  status: ProductStatus;
}

interface ProductFilters {
  search: string;
  category: string;
  status: 'all' | ProductStatus;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

interface ProductMetrics {
  total: number;
  categories: number;
  active: number;
  paused: number;
}

// ============================================================
// Service interface
// Replace MockProductService with ApiProductService when ready.
// ============================================================

interface IProductService {
  getProducts(
    page: number,
    perPage: number,
    filters: ProductFilters,
  ): Promise<PaginatedResult<Product>>;

  getProductById(id: number): Promise<Product>;

  createProduct(data: ProductFormData): Promise<Product>;

  updateProduct(id: number, data: Partial<ProductFormData>): Promise<Product>;

  deleteProduct(id: number): Promise<void>;

  getMetrics(): Promise<ProductMetrics>;
}

// ============================================================
// Mock data
// ============================================================

const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Classic Club Sandwich',
    description: 'Roasted turkey, bacon, lettuce, tomato on sourdough.',
    category: 'Sandwiches',
    price: 14.50,
    status: 'active',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0UoYgFUeNzT2OBnWGP1yjkUFgEaBmM2oMuMcnxuVaW2dnMeo5NcoYPDkR2e6wz0ZjbGKpYKm9E0Nq3zDEichmnCMWbBdYcWC-XOFsVXy5FZhRhK8q-rSzqjDqs0DM5FdD2qK6ZSxglbZHjwWkfeVhFnevY8bWupq-D0w8NsoCr3U687si0wcv2AE37xq88gg63p71Dsr0HZJE8F-xEjd7mVBkLBVnmcLyfyVAmg3gtxRpO28KGpmPtkXK3y1_QUj0Aj6ETPtmDic',
  },
  {
    id: 2,
    name: 'Mediterranean Salad',
    description: 'Mixed greens, feta, olives, cherry tomatoes.',
    category: 'Salads',
    price: 12.00,
    status: 'active',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuARkDXyncMyOgd57BcqqVOpYtY1QQks-vPE5oopViiqXkxCMWFI4FFJ0NQ018NYgpKSzqeVOhcQzt0kXQQ2LpVS4YTP0UvmX72DpXPs1yTgoJZt8VCuXim6XHXyIaWJIJZSx3HQPMMR7qkYknAf9EtkghD2WIcFDGMrqH-AOcuZsFTAzSCm3ExMZzHOOwUyXPXFNzPaFsMR00NhHaVK3jV_hr_97e6ClLkeyJ2yotBUHdIqz691LkFvGW1VcE1ixYFV5vuDC4Qq1UM',
  },
  {
    id: 3,
    name: 'Tomato Basil Soup',
    description: 'Creamy tomato soup with fresh basil garnish.',
    category: 'Soups',
    price: 8.50,
    status: 'paused',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5wdCnAyzyAn2fBkm6Nm5Ux1072hwNfYfd5T80kczTNeMz-H__aj_S_6k_P3dT1Xu6i5U7nntd78er7efGXY5uqQVBlH5deeJN5reX_1Y7glldN__55Wq3z60cA-7Ad-q211xiRuW2_EOe4YjhuoSWiJgmswU-Q2qQP_N5HoMWNsYBk2SUntbsZ0vEhRoxag3qdU3AxsxcGvJZEFvHMPNI9ds87PfjgYDLLwEPWWerLyZOC5taqRjBo7BxYPvtCQHg4nX5NV9UCxg',
  },
  {
    id: 4,
    name: 'Artisan Lemonade',
    description: 'Fresh squeezed lemons, mint, agave syrup.',
    category: 'Beverages',
    price: 4.50,
    status: 'active',
  },
  {
    id: 5,
    name: 'Grilled Chicken Wrap',
    description: 'Herb-marinated chicken, avocado, romaine, chipotle mayo.',
    category: 'Sandwiches',
    price: 13.00,
    status: 'active',
  },
  {
    id: 6,
    name: 'Quinoa Power Bowl',
    description: 'Roasted veggies, chickpeas, tahini dressing.',
    category: 'Salads',
    price: 15.00,
    status: 'active',
  },
  {
    id: 7,
    name: 'French Onion Soup',
    description: 'Slow-cooked caramelized onions, gruyère crust.',
    category: 'Soups',
    price: 9.50,
    status: 'active',
  },
  {
    id: 8,
    name: 'Cold Brew Coffee',
    description: 'Small-batch cold brew, 24-hour steeped.',
    category: 'Beverages',
    price: 5.00,
    status: 'active',
  },
  {
    id: 9,
    name: 'Caprese Panini',
    description: 'Fresh mozzarella, heirloom tomato, basil pesto.',
    category: 'Sandwiches',
    price: 11.50,
    status: 'paused',
  },
  {
    id: 10,
    name: 'Caesar Salad',
    description: 'Romaine, house-made dressing, parmesan, croutons.',
    category: 'Salads',
    price: 11.00,
    status: 'active',
  },
  {
    id: 11,
    name: 'Minestrone',
    description: 'Seasonal vegetables, cannellini beans, pesto.',
    category: 'Soups',
    price: 8.00,
    status: 'active',
  },
  {
    id: 12,
    name: 'Hibiscus Iced Tea',
    description: 'Dried hibiscus flowers, honey, fresh mint.',
    category: 'Beverages',
    price: 4.00,
    status: 'active',
  },
  {
    id: 13,
    name: 'Avocado BLT',
    description: 'Smashed avocado, crispy bacon, heirloom tomato, ciabatta.',
    category: 'Sandwiches',
    price: 14.00,
    status: 'active',
  },
  {
    id: 14,
    name: 'Kale & Beet Salad',
    description: 'Massaged kale, roasted beets, goat cheese, candied walnuts.',
    category: 'Salads',
    price: 13.50,
    status: 'paused',
  },
  {
    id: 15,
    name: 'Ginger Lemon Spritz',
    description: 'Fresh ginger, lemon, sparkling water, agave.',
    category: 'Beverages',
    price: 4.50,
    status: 'active',
  },
];

// ============================================================
// Mock service implementation
// ============================================================

class MockProductService implements IProductService {
  private products: Product[] = [...MOCK_PRODUCTS];
  private nextId: number = MOCK_PRODUCTS.length + 1;

  private delay(ms = 150): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getProducts(
    page: number,
    perPage: number,
    filters: ProductFilters,
  ): Promise<PaginatedResult<Product>> {
    await this.delay();

    let result = [...this.products];

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }

    if (filters.category) {
      result = result.filter(p => p.category === filters.category);
    }

    if (filters.status !== 'all') {
      result = result.filter(p => p.status === filters.status);
    }

    const total = result.length;
    const data = result.slice((page - 1) * perPage, page * perPage);
    return { data, total, page, perPage };
  }

  async getProductById(id: number): Promise<Product> {
    await this.delay(80);
    const product = this.products.find(p => p.id === id);
    if (!product) throw new Error(`Product ${id} not found`);
    return { ...product };
  }

  async createProduct(data: ProductFormData): Promise<Product> {
    await this.delay(220);
    const product: Product = { ...data, id: this.nextId++ };
    this.products.push(product);
    return product;
  }

  async updateProduct(id: number, data: Partial<ProductFormData>): Promise<Product> {
    await this.delay(220);
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) throw new Error(`Product ${id} not found`);
    this.products[index] = { ...this.products[index], ...data };
    return { ...this.products[index] };
  }

  async deleteProduct(id: number): Promise<void> {
    await this.delay(160);
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) throw new Error(`Product ${id} not found`);
    this.products.splice(index, 1);
  }

  async getMetrics(): Promise<ProductMetrics> {
    await this.delay(100);
    const categories = new Set(this.products.map(p => p.category)).size;
    const active  = this.products.filter(p => p.status === 'active').length;
    const paused  = this.products.filter(p => p.status === 'paused').length;
    return { total: this.products.length, categories, active, paused };
  }
}

// ============================================================
// Controller
// ============================================================

const PER_PAGE = 4;

class MenuManagementController {
  private service: IProductService;

  // State
  private page = 1;
  private filters: ProductFilters = { search: '', category: '', status: 'all' };
  private editingProduct: Product | null = null;
  private isSubmitting = false;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // DOM refs — resolved once in init()
  private $tableBody!: HTMLElement;
  private $tableInfo!: HTMLElement;
  private $pagination!: HTMLElement;
  private $metricsGrid!: HTMLElement;
  private $searchInput!: HTMLInputElement;
  private $modal!: HTMLElement;
  private $modalTitle!: HTMLElement;
  private $form!: HTMLFormElement;
  private $submitBtn!: HTMLButtonElement;

  constructor(service: IProductService) {
    this.service = service;
  }

  init(): void {
    this.resolveRefs();
    this.bindStaticEvents();
    void this.loadMetrics();
    void this.loadProducts();
  }

  // ----------------------------------------------------------
  // DOM helpers
  // ----------------------------------------------------------

  private el<T extends HTMLElement = HTMLElement>(id: string): T {
    const el = document.getElementById(id) as T | null;
    if (!el) throw new Error(`#${id} not found in DOM`);
    return el;
  }

  private resolveRefs(): void {
    this.$tableBody  = this.el('table-body');
    this.$tableInfo  = this.el('table-info');
    this.$pagination = this.el('pagination');
    this.$metricsGrid = this.el('metrics-grid');
    this.$searchInput = this.el<HTMLInputElement>('search-input');
    this.$modal      = this.el('product-modal');
    this.$modalTitle = this.el('modal-title');
    this.$form       = this.el<HTMLFormElement>('product-form');
    this.$submitBtn  = this.el<HTMLButtonElement>('modal-submit');
  }

  // ----------------------------------------------------------
  // Static event binding (elements that always exist in HTML)
  // ----------------------------------------------------------

  private bindStaticEvents(): void {
    // Search — debounced 300 ms
    this.$searchInput.addEventListener('input', () => {
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.filters.search = this.$searchInput.value;
        this.page = 1;
        void this.loadProducts();
      }, 300);
    });

    // Open modal for new product
    this.el('btn-new-product').addEventListener('click', () => {
      this.openModal(null);
    });

    // Filter button — stub; connect your filter panel here
    this.el('btn-filter').addEventListener('click', () => {
      console.info('[MenuManagement] Filter panel — implement as needed.');
    });

    // Topbar: notifications & logout stubs
    this.el('btn-notifications').addEventListener('click', () => {
      console.info('[MenuManagement] Notifications panel — implement as needed.');
    });
    this.el('btn-logout').addEventListener('click', () => {
      console.info('[MenuManagement] Logout — implement as needed.');
    });

    // Modal close / cancel
    this.el('modal-close').addEventListener('click', () => this.closeModal());
    this.el('modal-cancel').addEventListener('click', () => this.closeModal());
    this.el('modal-backdrop').addEventListener('click', () => this.closeModal());

    // Keyboard: Escape closes modal
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.closeModal();
    });

    // Form submit (triggered by the submit button outside the <form> tag)
    this.$form.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      void this.handleSubmit();
    });

    this.$submitBtn.addEventListener('click', () => {
      this.$form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });

    // Image upload area
    this.bindUploadArea();
  }

  private bindUploadArea(): void {
    const area  = document.getElementById('image-upload-area');
    const input = document.getElementById('image-file-input') as HTMLInputElement | null;
    if (!area || !input) return;

    area.addEventListener('click', () => input.click());

    area.addEventListener('keydown', (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'Enter' || ke.key === ' ') {
        e.preventDefault();
        input.click();
      }
    });

    area.addEventListener('dragover', (e: Event) => {
      e.preventDefault();
      area.classList.add('upload-area--drag-over');
    });

    area.addEventListener('dragleave', () => {
      area.classList.remove('upload-area--drag-over');
    });

    area.addEventListener('drop', (e: Event) => {
      e.preventDefault();
      area.classList.remove('upload-area--drag-over');
      const de = e as DragEvent;
      const file = de.dataTransfer?.files[0];
      if (file) this.previewUpload(file, area);
    });

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) this.previewUpload(file, area);
    });
  }

  // ----------------------------------------------------------
  // Data loading
  // ----------------------------------------------------------

  private async loadMetrics(): Promise<void> {
    const metrics = await this.service.getMetrics();
    this.renderMetrics(metrics);
  }

  private async loadProducts(): Promise<void> {
    this.setTableLoading(true);
    try {
      const result = await this.service.getProducts(this.page, PER_PAGE, this.filters);
      this.renderRows(result.data);
      this.renderTableInfo(result);
      this.renderPagination(result);
    } finally {
      this.setTableLoading(false);
    }
  }

  // ----------------------------------------------------------
  // Rendering
  // ----------------------------------------------------------

  private renderMetrics(m: ProductMetrics): void {
    const items = [
      { label: 'Total Items', value: m.total,      icon: 'restaurant',   cls: 'metric-value--primary' },
      { label: 'Categories',  value: m.categories, icon: 'category',     cls: 'metric-value--primary' },
      { label: 'Active',      value: m.active,     icon: 'check_circle', cls: 'metric-value--active'  },
      { label: 'Paused',      value: m.paused,     icon: 'pause_circle', cls: 'metric-value--paused'  },
    ];

    this.$metricsGrid.innerHTML = items.map(item => `
      <div class="metric-card">
        <div class="metric-card__header">
          <span class="material-symbols-outlined metric-card__icon" aria-hidden="true">${item.icon}</span>
          <span class="metric-card__label">${item.label}</span>
        </div>
        <span class="metric-card__value ${item.cls}">${item.value}</span>
      </div>`).join('');
  }

  private renderRows(products: Product[]): void {
    if (products.length === 0) {
      this.$tableBody.innerHTML = `
        <div class="table-empty">
          <span class="material-symbols-outlined table-empty__icon" aria-hidden="true">search_off</span>
          <p class="table-empty__text">No products found.</p>
          <p class="table-empty__sub">Try adjusting your search or filters.</p>
        </div>`;
      return;
    }

    this.$tableBody.innerHTML = products.map(p => this.rowHTML(p)).join('');

    // Bind row-level events after injection
    this.$tableBody
      .querySelectorAll<HTMLButtonElement>('.row-action--edit')
      .forEach(btn => {
        btn.addEventListener('click', () => {
          void this.handleEdit(Number(btn.dataset.id));
        });
      });

    this.$tableBody
      .querySelectorAll<HTMLButtonElement>('.row-action--delete')
      .forEach(btn => {
        btn.addEventListener('click', () => {
          void this.handleDelete(Number(btn.dataset.id));
        });
      });
  }

  private rowHTML(p: Product): string {
    const paused = p.status === 'paused';

    const thumb = p.image
      ? `<img class="product-thumb__img" src="${p.image}" alt="${this.esc(p.name)}" loading="lazy">`
      : `<span class="material-symbols-outlined product-thumb__placeholder" aria-hidden="true">image</span>`;

    const badge = paused
      ? `<span class="status-badge status-badge--paused">
           <span class="status-badge__dot" aria-hidden="true"></span>Paused
         </span>`
      : `<span class="status-badge status-badge--active">
           <span class="status-badge__dot" aria-hidden="true"></span>Active
         </span>`;

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
        <div class="table-cell table-cell--status" role="cell">
          ${badge}
        </div>
        <div class="table-cell table-cell--actions" role="cell">
          <button
            class="row-action row-action--edit"
            data-id="${p.id}"
            aria-label="Edit ${this.esc(p.name)}"
            title="Edit">
            <span class="material-symbols-outlined" aria-hidden="true">edit</span>
          </button>
          <button
            class="row-action row-action--delete"
            data-id="${p.id}"
            aria-label="Delete ${this.esc(p.name)}"
            title="Delete">
            <span class="material-symbols-outlined" aria-hidden="true">delete</span>
          </button>
        </div>
      </div>`;
  }

  private renderTableInfo(result: PaginatedResult<Product>): void {
    if (result.total === 0) {
      this.$tableInfo.textContent = 'No entries found';
      return;
    }
    const start = (result.page - 1) * result.perPage + 1;
    const end   = Math.min(result.page * result.perPage, result.total);
    this.$tableInfo.textContent = `Showing ${start} to ${end} of ${result.total} entries`;
  }

  private renderPagination(result: PaginatedResult<Product>): void {
    const totalPages = Math.ceil(result.total / result.perPage);

    if (totalPages <= 1) {
      this.$pagination.innerHTML = '';
      return;
    }

    const { page } = result;
    const range = this.pageRange(page, totalPages);

    let pagesHTML = '';
    let prev: number | null = null;

    for (const n of range) {
      if (prev !== null && n - prev > 1) {
        pagesHTML += `<span class="pagination__dots" aria-hidden="true">…</span>`;
      }
      pagesHTML += `
        <button
          class="pagination__btn${n === page ? ' pagination__btn--active' : ''}"
          data-page="${n}"
          aria-label="Page ${n}"
          ${n === page ? 'aria-current="page"' : ''}>${n}</button>`;
      prev = n;
    }

    this.$pagination.innerHTML = `
      <button
        class="pagination__btn pagination__btn--nav"
        data-page="${page - 1}"
        aria-label="Previous page"
        ${page === 1 ? 'disabled' : ''}>
        <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
      </button>
      ${pagesHTML}
      <button
        class="pagination__btn pagination__btn--nav"
        data-page="${page + 1}"
        aria-label="Next page"
        ${page === totalPages ? 'disabled' : ''}>
        <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
      </button>`;

    this.$pagination
      .querySelectorAll<HTMLButtonElement>('.pagination__btn[data-page]')
      .forEach(btn => {
        btn.addEventListener('click', () => {
          const target = Number(btn.dataset.page);
          if (isNaN(target) || target < 1 || target > totalPages || target === this.page) return;
          this.page = target;
          void this.loadProducts();
        });
      });
  }

  /** Builds a compact page range: always include first, last, and ±1 of current. */
  private pageRange(current: number, total: number): number[] {
    const set = new Set<number>([1, total]);
    for (let i = current - 1; i <= current + 1; i++) {
      if (i >= 1 && i <= total) set.add(i);
    }
    return Array.from(set).sort((a, b) => a - b);
  }

  // ----------------------------------------------------------
  // Modal
  // ----------------------------------------------------------

  private openModal(product: Product | null): void {
    this.editingProduct = product;
    this.$modalTitle.textContent = product ? 'Editar Produto' : 'Adicionar Novo Produto';
    this.resetForm();
    if (product) this.populateForm(product);

    this.$modal.classList.add('modal--open');
    this.$modal.setAttribute('aria-hidden', 'false');

    // Move focus to first focusable field for accessibility
    setTimeout(() => {
      (this.$form.querySelector<HTMLElement>('input, select, textarea'))?.focus();
    }, 50);
  }

  private closeModal(): void {
    if (!this.$modal.classList.contains('modal--open')) return;
    this.$modal.classList.remove('modal--open');
    this.$modal.setAttribute('aria-hidden', 'true');
    this.editingProduct = null;
    this.resetForm();

    // Return focus to the trigger button
    this.el('btn-new-product').focus();
  }

  private resetForm(): void {
    this.$form.reset();
    this.setSubmitting(false);

    // Reset validation states
    this.$form.querySelectorAll('.field--error').forEach(el => {
      el.classList.remove('field--error');
    });

    // Reset upload area to its default placeholder
    const area = document.getElementById('image-upload-area');
    if (area) {
      area.innerHTML = `
        <span class="material-symbols-outlined upload-area__icon" aria-hidden="true">add_a_photo</span>
        <span class="upload-area__label">Clique para enviar ou arraste aqui</span>
        <span class="upload-area__hint">SVG, PNG, JPG ou GIF (máx. 5 MB)</span>`;
    }

    // Reset file input so the same file can be re-selected
    const fileInput = document.getElementById('image-file-input') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
  }

  private populateForm(p: Product): void {
    (this.el<HTMLInputElement>('prod-name')).value     = p.name;
    (this.el<HTMLSelectElement>('prod-category')).value = p.category;
    (this.el<HTMLInputElement>('prod-price')).value    = String(p.price);
    (this.el<HTMLTextAreaElement>('prod-desc')).value  = p.description;
    (this.el<HTMLInputElement>('prod-status')).checked = p.status === 'active';
  }

  // ----------------------------------------------------------
  // Form submission
  // ----------------------------------------------------------

  private async handleSubmit(): Promise<void> {
    if (this.isSubmitting) return;
    if (!this.validate()) return;

    const data = this.readForm();
    this.setSubmitting(true);

    try {
      if (this.editingProduct) {
        await this.service.updateProduct(this.editingProduct.id, data);
      } else {
        await this.service.createProduct(data);
      }
      this.closeModal();
      // Refresh metrics and stay on current page (go back if page is now empty)
      void this.loadMetrics();
      void this.loadProducts();
    } catch (err) {
      console.error('[MenuManagement] Save failed:', err);
      this.setSubmitting(false);
    }
  }

  private readForm(): ProductFormData {
    return {
      name:        (this.el<HTMLInputElement>('prod-name')).value.trim(),
      category:    (this.el<HTMLSelectElement>('prod-category')).value,
      price:       parseFloat((this.el<HTMLInputElement>('prod-price')).value) || 0,
      description: (this.el<HTMLTextAreaElement>('prod-desc')).value.trim(),
      status:      (this.el<HTMLInputElement>('prod-status')).checked ? 'active' : 'paused',
    };
  }

  private validate(): boolean {
    type FieldRule = { id: string; check: (el: HTMLElement) => boolean };

    const rules: FieldRule[] = [
      {
        id: 'prod-name',
        check: el => (el as HTMLInputElement).value.trim().length > 0,
      },
      {
        id: 'prod-category',
        check: el => (el as HTMLSelectElement).value.trim().length > 0,
      },
      {
        id: 'prod-price',
        check: el => {
          const v = parseFloat((el as HTMLInputElement).value);
          return !isNaN(v) && v > 0;
        },
      },
    ];

    let valid = true;

    for (const rule of rules) {
      const el = document.getElementById(rule.id);
      const fieldWrapper = el?.closest('.field');
      if (!el || !fieldWrapper) continue;

      if (rule.check(el)) {
        fieldWrapper.classList.remove('field--error');
      } else {
        fieldWrapper.classList.add('field--error');
        valid = false;
      }
    }

    return valid;
  }

  private setSubmitting(loading: boolean): void {
    this.isSubmitting = loading;
    this.$submitBtn.disabled = loading;
    this.$submitBtn.textContent = loading ? 'Salvando…' : 'Salvar Produto';
  }

  // ----------------------------------------------------------
  // Row actions
  // ----------------------------------------------------------

  private async handleEdit(id: number): Promise<void> {
    try {
      // Real service: swap to getProductById which hits GET /products/:id
      const product = await this.service.getProductById(id);
      this.openModal(product);
    } catch (err) {
      console.error('[MenuManagement] Could not load product for editing:', err);
    }
  }

  private async handleDelete(id: number): Promise<void> {
    // Find the display name from the rendered row for the confirm message
    const rowEl = this.$tableBody.querySelector<HTMLElement>(`[data-id="${id}"]`);
    const name  = rowEl?.querySelector('.product-name')?.textContent?.trim() ?? 'este produto';

    if (!window.confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;

    try {
      await this.service.deleteProduct(id);

      // If the current page becomes empty after deletion, step back
      const check = await this.service.getProducts(this.page, PER_PAGE, this.filters);
      if (check.data.length === 0 && this.page > 1) this.page--;

      void this.loadMetrics();
      void this.loadProducts();
    } catch (err) {
      console.error('[MenuManagement] Delete failed:', err);
    }
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------

  private setTableLoading(loading: boolean): void {
    this.$tableBody.classList.toggle('table-body--loading', loading);
  }

  private previewUpload(file: File, container: HTMLElement): void {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const src = e.target?.result as string;
      container.innerHTML = `
        <img class="upload-area__preview" src="${src}" alt="Product image preview">`;
    };
    reader.readAsDataURL(file);
  }

  /** Escapes HTML special characters to prevent XSS in dynamic innerHTML. */
  private esc(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// ============================================================
// Bootstrap
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  /**
   * Swap MockProductService for your real implementation here.
   *
   * Example:
   *   import { ApiProductService } from './services/product.service';
   *   const service: IProductService = new ApiProductService('https://api.dannys.com');
   */
  const service: IProductService = new MockProductService();
  const controller = new MenuManagementController(service);
  controller.init();
});
