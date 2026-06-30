/**
 * team-management.ts — Danny's Fresh Market
 *
 * Requer Vite (ou tsc-alias) para resolver "@/".
 * HTML: <script type="module" src="./team-management.js">
 *
 * ⚠️  Strapi — antes de ativar ApiEmployeeService:
 *   1. Content-Type Builder → User → Add field:
 *      Name: emServico | Type: Boolean | Default: false | Required: false
 *   2. Settings → Roles → Authenticated → Users-permissions → Users:
 *      Habilitar: find, findOne, update, destroy (perfil admin)
 *   3. Reiniciar o Strapi após salvar o content-type.
 */

import { usuarioService, PerfilUsuario } from '@/services/UsuarioService'
import type { UsuarioEntity } from '@/services/UsuarioService'

/* ======================================================================
   TIPOS
   ====================================================================== */

type EmployeeStatus = 'on-duty' | 'active' | 'inactive'

interface Employee {
  id:     string
  name:   string
  code:   string
  avatar: string
  role:   string
  email:  string
  phone:  string
  status: EmployeeStatus
}

interface TeamStats {
  total:    number
  active:   number
  onDuty:   number
  inactive: number
}

interface PaginatedResult<T> {
  data:       T[]
  total:      number
  page:       number
  perPage:    number
  totalPages: number
}

interface EmployeeServicePort {
  getEmployees(page: number, perPage: number): Promise<PaginatedResult<Employee>>
  getStats(): Promise<TeamStats>
  searchEmployees(query: string, page: number, perPage: number): Promise<PaginatedResult<Employee>>
  deleteEmployee(id: string): Promise<void>
}

/* ======================================================================
   ADAPTADORES  UsuarioEntity → Employee
   ====================================================================== */

const PERFIL_LABELS: Record<string, string> = {
  [PerfilUsuario.Admin]:   'Administrador',
  [PerfilUsuario.Cozinha]: 'Cozinha',
  [PerfilUsuario.Cliente]: 'Cliente',
}

function resolveStatus(ativo: boolean, emServico: boolean): EmployeeStatus {
  if (!ativo)    return 'inactive'
  if (emServico) return 'on-duty'
  return 'active'
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return raw
}

function toEmployee(entity: UsuarioEntity): Employee {
  const a  = entity
  const id = String(entity.id)
  return {
    id,
    name:   a.username,
    code:   `EMP-${id.padStart(4, '0')}`,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(a.username)}&background=ecefe7&color=191d18&size=48`,
    role:   PERFIL_LABELS[a.perfil] ?? a.perfil,
    email:  a.email,
    phone:  formatPhone(a.whatsapp),
    status: resolveStatus(a.ativo, a.emServico ?? false),
  }
}

/* ======================================================================
   API SERVICE  (produção — usa UsuarioService)
   ====================================================================== */

class ApiEmployeeService implements EmployeeServicePort {
  /**
   * Cache em memória com TTL de 30 s.
   *
   * Por que paginação client-side?
   * /api/users não retorna meta.pagination real; list() sempre retorna
   * total = length da página corrente. Para equipes de até ~1000 pessoas,
   * buscar todos de uma vez e paginar no front é a abordagem pragmática.
   * Para equipes maiores, implemente um endpoint customizado no Strapi
   * com paginação server-side e substitua fetchAllStaff().
   */
  private cache: { employees: Employee[]; updatedAt: number } | null = null
  private readonly CACHE_TTL_MS = 30_000
  private pendingFetch: Promise<Employee[]> | null = null

  private async fetchAllStaff(): Promise<Employee[]> {
    const now = Date.now()
    if (this.cache && now - this.cache.updatedAt < this.CACHE_TTL_MS) {
      return this.cache.employees
    }
    // Deduplica chamadas simultâneas (ex: loadEmployees + getStats em init)
    if (this.pendingFetch) return this.pendingFetch

    this.pendingFetch = usuarioService
      .listFuncionarios({
        sort:       ['username:asc'],
        pagination: { page: 1, pageSize: 1000 },
      })
      .then(result => {
        const employees  = result.data.map(toEmployee)
        this.cache       = { employees, updatedAt: Date.now() }
        this.pendingFetch = null
        return employees
      })
      .catch(err => {
        this.pendingFetch = null
        throw err
      })

    return this.pendingFetch
  }

  invalidateCache(): void {
    this.cache        = null
    this.pendingFetch = null
  }

  async getEmployees(page: number, perPage: number): Promise<PaginatedResult<Employee>> {
    const all   = await this.fetchAllStaff()
    const start = (page - 1) * perPage
    return {
      data:       all.slice(start, start + perPage),
      total:      all.length,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(all.length / perPage)),
    }
  }

  async getStats(): Promise<TeamStats> {
    // Lê do cache (populado por getEmployees) — sem nova requisição
    const all = await this.fetchAllStaff()
    return {
      total:    all.length,
      active:   all.filter(e => e.status !== 'inactive').length,
      onDuty:   all.filter(e => e.status === 'on-duty').length,
      inactive: all.filter(e => e.status === 'inactive').length,
    }
  }

  async searchEmployees(query: string, page: number, perPage: number): Promise<PaginatedResult<Employee>> {
    const all = await this.fetchAllStaff()
    const q   = query.toLowerCase()
    const filtered = all.filter(e =>
      e.name.toLowerCase().includes(q)                                      ||
      e.role.toLowerCase().includes(q)                                      ||
      e.email.toLowerCase().includes(q)                                     ||
      e.code.toLowerCase().includes(q)                                      ||
      e.phone.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
    )
    const start = (page - 1) * perPage
    return {
      data:       filtered.slice(start, start + perPage),
      total:      filtered.length,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(filtered.length / perPage)),
    }
  }

  async deleteEmployee(id: string): Promise<void> {
    // Soft-delete: desativa o funcionário sem apagar do banco.
    // Para exclusão permanente: usuarioService.delete(Number(id))
    await usuarioService.desativar(Number(id))
    this.invalidateCache()
  }
}

/* ======================================================================
   MOCK SERVICE  (desenvolvimento local — sem backend)
   ====================================================================== */

class MockEmployeeService implements EmployeeServicePort {
  private employees: Employee[] = [
    { id:'1',  name:'Sarah Jenkins',   code:'EMP-0001', avatar:'https://i.pravatar.cc/48?u=sarah.j',    role:'Administrador', email:'s.jenkins@dannys.com',   phone:'(11) 98000-0192', status:'on-duty'  },
    { id:'2',  name:'Marcus Thorne',   code:'EMP-0002', avatar:'https://i.pravatar.cc/48?u=marcus.t',   role:'Cozinha',       email:'m.thorne@dannys.com',    phone:'(11) 97000-0231', status:'active'   },
    { id:'3',  name:'Elena Rodriguez', code:'EMP-0003', avatar:'https://i.pravatar.cc/48?u=elena.r',    role:'Cozinha',       email:'e.rodriguez@dannys.com', phone:'(11) 96000-0844', status:'on-duty'  },
    { id:'4',  name:'David Kim',       code:'EMP-0004', avatar:'https://i.pravatar.cc/48?u=david.k',    role:'Administrador', email:'d.kim@dannys.com',       phone:'(11) 95000-0912', status:'inactive' },
    { id:'5',  name:'Ana Costa',       code:'EMP-0005', avatar:'https://i.pravatar.cc/48?u=ana.c',      role:'Cozinha',       email:'a.costa@dannys.com',     phone:'(11) 94000-0303', status:'active'   },
    { id:'6',  name:'Lucas Mendes',    code:'EMP-0006', avatar:'https://i.pravatar.cc/48?u=lucas.m',    role:'Cozinha',       email:'l.mendes@dannys.com',    phone:'(11) 93000-0447', status:'on-duty'  },
    { id:'7',  name:'Priya Sharma',    code:'EMP-0007', avatar:'https://i.pravatar.cc/48?u=priya.s',    role:'Cozinha',       email:'p.sharma@dannys.com',    phone:'(11) 92000-0558', status:'on-duty'  },
    { id:'8',  name:'Tom Nakamura',    code:'EMP-0008', avatar:'https://i.pravatar.cc/48?u=tom.n',      role:'Cozinha',       email:'t.nakamura@dannys.com',  phone:'(11) 91000-0623', status:'on-duty'  },
    { id:'9',  name:'Clara Walsh',     code:'EMP-0009', avatar:'https://i.pravatar.cc/48?u=clara.w',    role:'Administrador', email:'c.walsh@dannys.com',     phone:'(11) 90000-0711', status:'active'   },
    { id:'10', name:'James Obi',       code:'EMP-0010', avatar:'https://i.pravatar.cc/48?u=james.o',    role:'Cozinha',       email:'j.obi@dannys.com',       phone:'(11) 89000-0832', status:'active'   },
    { id:'11', name:'Nina Pereira',    code:'EMP-0011', avatar:'https://i.pravatar.cc/48?u=nina.p',     role:'Cozinha',       email:'n.pereira@dannys.com',   phone:'(11) 88000-0945', status:'active'   },
    { id:'12', name:'Carlos Vega',     code:'EMP-0012', avatar:'https://i.pravatar.cc/48?u=carlos.v',   role:'Cozinha',       email:'c.vega@dannys.com',      phone:'(11) 87000-0156', status:'on-duty'  },
    { id:'13', name:'Sophie Lee',      code:'EMP-0013', avatar:'https://i.pravatar.cc/48?u=sophie.l',   role:'Administrador', email:'s.lee@dannys.com',       phone:'(11) 86000-0267', status:'active'   },
    { id:'14', name:'Omar Hassan',     code:'EMP-0014', avatar:'https://i.pravatar.cc/48?u=omar.h',     role:'Cozinha',       email:'o.hassan@dannys.com',    phone:'(11) 85000-0378', status:'inactive' },
    { id:'15', name:'Rita Almeida',    code:'EMP-0015', avatar:'https://i.pravatar.cc/48?u=rita.a',     role:'Administrador', email:'r.almeida@dannys.com',   phone:'(11) 84000-0489', status:'active'   },
    { id:'16', name:'Ben Carter',      code:'EMP-0016', avatar:'https://i.pravatar.cc/48?u=ben.c',      role:'Cozinha',       email:'b.carter@dannys.com',    phone:'(11) 83000-0590', status:'active'   },
    { id:'17', name:'Yuki Tanaka',     code:'EMP-0017', avatar:'https://i.pravatar.cc/48?u=yuki.t',     role:'Cozinha',       email:'y.tanaka@dannys.com',    phone:'(11) 82000-0601', status:'on-duty'  },
    { id:'18', name:'Grace Owusu',     code:'EMP-0018', avatar:'https://i.pravatar.cc/48?u=grace.o',    role:'Administrador', email:'g.owusu@dannys.com',     phone:'(11) 81000-0712', status:'active'   },
    { id:'19', name:'Diego Rios',      code:'EMP-0019', avatar:'https://i.pravatar.cc/48?u=diego.r',    role:'Cozinha',       email:'d.rios@dannys.com',      phone:'(11) 80000-0823', status:'active'   },
    { id:'20', name:'Layla Ahmed',     code:'EMP-0020', avatar:'https://i.pravatar.cc/48?u=layla.a',    role:'Cozinha',       email:'l.ahmed@dannys.com',     phone:'(11) 79000-0934', status:'active'   },
    { id:'21', name:'Finn Murphy',     code:'EMP-0021', avatar:'https://i.pravatar.cc/48?u=finn.m',     role:'Administrador', email:'f.murphy@dannys.com',    phone:'(11) 78000-0145', status:'on-duty'  },
    { id:'22', name:'Amara Diallo',    code:'EMP-0022', avatar:'https://i.pravatar.cc/48?u=amara.d',    role:'Cozinha',       email:'a.diallo@dannys.com',    phone:'(11) 77000-0256', status:'active'   },
    { id:'23', name:'Chen Wei',        code:'EMP-0023', avatar:'https://i.pravatar.cc/48?u=chen.w',     role:'Cozinha',       email:'c.wei@dannys.com',       phone:'(11) 76000-0367', status:'active'   },
    { id:'24', name:'Isabela Mota',    code:'EMP-0024', avatar:'https://i.pravatar.cc/48?u=isabela.m',  role:'Administrador', email:'i.mota@dannys.com',      phone:'(11) 75000-0478', status:'active'   },
  ]
  private delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

  async getEmployees(page: number, perPage: number): Promise<PaginatedResult<Employee>> {
    await this.delay(180)
    const start = (page - 1) * perPage
    return { data: this.employees.slice(start, start + perPage), total: this.employees.length, page, perPage, totalPages: Math.ceil(this.employees.length / perPage) }
  }
  async getStats(): Promise<TeamStats> {
    await this.delay(80)
    const e = this.employees
    return { total: e.length, active: e.filter(x => x.status !== 'inactive').length, onDuty: e.filter(x => x.status === 'on-duty').length, inactive: e.filter(x => x.status === 'inactive').length }
  }
  async searchEmployees(query: string, page: number, perPage: number): Promise<PaginatedResult<Employee>> {
    await this.delay(150)
    const q = query.toLowerCase()
    const filtered = this.employees.filter(e => e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.code.toLowerCase().includes(q))
    const start = (page - 1) * perPage
    return { data: filtered.slice(start, start + perPage), total: filtered.length, page, perPage, totalPages: Math.max(1, Math.ceil(filtered.length / perPage)) }
  }
  async deleteEmployee(id: string): Promise<void> {
    await this.delay(200)
    const idx = this.employees.findIndex(e => e.id === id)
    if (idx !== -1) this.employees.splice(idx, 1)
  }
}

/* ======================================================================
   ▼ SWAP HERE
   Produção  → new ApiEmployeeService()
   Dev/local → new MockEmployeeService()
   ====================================================================== */
const employeeService: EmployeeServicePort = new ApiEmployeeService()

/* ======================================================================
   ESTADO DA APLICAÇÃO
   ====================================================================== */

interface AppState {
  currentPage:    number
  perPage:        number
  searchQuery:    string
  totalEmployees: number
  totalPages:     number
}

const state: AppState = { currentPage: 1, perPage: 4, searchQuery: '', totalEmployees: 0, totalPages: 1 }

/* ======================================================================
   HELPERS DE DOM
   ====================================================================== */

function el<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector)
  if (!found) throw new Error(`[TeamManagement] Elemento não encontrado: ${selector}`)
  return found
}

/* ======================================================================
   RENDER: STATUS BADGE
   ====================================================================== */

const STATUS_LABELS: Record<EmployeeStatus, string> = { 'on-duty': 'On Duty', 'active': 'Active', 'inactive': 'Inactive' }

function badgeHTML(status: EmployeeStatus): string {
  return `<span class="badge badge--${status}"><span class="badge__dot" aria-hidden="true"></span>${STATUS_LABELS[status]}</span>`
}

/* ======================================================================
   RENDER: LINHA DE FUNCIONÁRIO
   ====================================================================== */

function employeeRowHTML(emp: Employee): string {
  const inactive = emp.status === 'inactive'
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=ecefe7&color=191d18&size=48`
  return `
    <div class="employee-row${inactive ? ' employee-row--inactive' : ''}" data-employee-id="${emp.id}" role="row">
      <div class="employee-row__employee">
        <div class="employee-row__avatar${inactive ? ' employee-row__avatar--dim' : ''}">
          <img src="${emp.avatar}" alt="${emp.name}" loading="lazy" onerror="this.onerror=null;this.src='${fallback}'">
        </div>
        <div class="employee-row__info">
          <span class="employee-row__name">${emp.name}</span>
          <span class="employee-row__code">${emp.code}</span>
        </div>
      </div>
      <div class="employee-row__role">${emp.role}</div>
      <div class="employee-row__contact">
        <span class="employee-row__email">${emp.email}</span>
        <span class="employee-row__phone">${emp.phone}</span>
      </div>
      <div class="employee-row__status">${badgeHTML(emp.status)}</div>
      <div class="employee-row__actions">
        <button class="action-btn action-btn--edit"   data-action="edit"   data-id="${emp.id}" aria-label="Editar ${emp.name}"    title="Editar">
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button class="action-btn action-btn--delete" data-action="delete" data-id="${emp.id}" aria-label="Desativar ${emp.name}" title="Desativar">
          <span class="material-symbols-outlined">person_off</span>
        </button>
      </div>
    </div>`
}

/* ======================================================================
   RENDER: PAGINAÇÃO
   ====================================================================== */

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const WINDOW = 2; const result: (number | '...')[] = []; let prev = 0
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - WINDOW && i <= current + WINDOW)) {
      if (prev && i - prev > 1) result.push('...')
      result.push(i); prev = i
    }
  }
  return result
}

function renderPagination(): void {
  const { currentPage, totalPages, totalEmployees, perPage } = state
  const start    = totalEmployees === 0 ? 0 : (currentPage - 1) * perPage + 1
  const end      = Math.min(currentPage * perPage, totalEmployees)
  const pageBtns = buildPageNumbers(currentPage, totalPages).map(p => {
    if (p === '...') return `<span class="pagination__ellipsis" aria-hidden="true">…</span>`
    const active = p === currentPage
    return `<button class="page-btn${active ? ' page-btn--active' : ''}" data-page="${p}" aria-label="Página ${p}" ${active ? 'aria-current="page" disabled' : ''}>${p}</button>`
  }).join('')
  el<HTMLDivElement>('#pagination').innerHTML = `
    <span class="pagination__info">Showing ${start} to ${end} of ${totalEmployees} entries</span>
    <div class="pagination__controls">
      <button class="page-btn" data-page="${currentPage - 1}" aria-label="Anterior" ${currentPage === 1 ? 'disabled' : ''}><span class="material-symbols-outlined">chevron_left</span></button>
      ${pageBtns}
      <button class="page-btn" data-page="${currentPage + 1}" aria-label="Próxima"  ${currentPage === totalPages ? 'disabled' : ''}><span class="material-symbols-outlined">chevron_right</span></button>
    </div>`
}

/* ======================================================================
   RENDER: MÉTRICAS
   ====================================================================== */

interface MetricConfig { icon: string; label: string; key: keyof TeamStats; modifier: 'primary' | 'error' }
const METRIC_CONFIGS: MetricConfig[] = [
  { icon: 'groups',       label: 'Total Employees', key: 'total',    modifier: 'primary' },
  { icon: 'check_circle', label: 'Active',          key: 'active',   modifier: 'primary' },
  { icon: 'storefront',   label: 'On Duty',         key: 'onDuty',   modifier: 'primary' },
  { icon: 'pause_circle', label: 'Inactive',        key: 'inactive', modifier: 'error'   },
]

function renderMetrics(stats: TeamStats): void {
  el<HTMLDivElement>('#metrics-grid').innerHTML = METRIC_CONFIGS.map(c => `
    <div class="metric-card">
      <div class="metric-card__header">
        <span class="material-symbols-outlined metric-card__icon" aria-hidden="true">${c.icon}</span>
        <span class="metric-card__label">${c.label}</span>
      </div>
      <span class="metric-card__value metric-card__value--${c.modifier}">${stats[c.key]}</span>
    </div>`).join('')
}

function renderMetricsSkeleton(): void {
  el<HTMLDivElement>('#metrics-grid').innerHTML = METRIC_CONFIGS.map(() =>
    '<div class="metric-card skeleton-row" style="min-height:116px;border-radius:var(--radius-xl)"></div>'
  ).join('')
}

/* ======================================================================
   CARREGAR FUNCIONÁRIOS
   ====================================================================== */

async function loadEmployees(): Promise<void> {
  const listEl = el<HTMLDivElement>('#employee-list')
  listEl.innerHTML = Array.from({ length: state.perPage }, () => '<div class="skeleton-row"></div>').join('')
  el<HTMLDivElement>('#pagination').innerHTML = ''
  try {
    const result = state.searchQuery
      ? await employeeService.searchEmployees(state.searchQuery, state.currentPage, state.perPage)
      : await employeeService.getEmployees(state.currentPage, state.perPage)
    state.totalEmployees = result.total
    state.totalPages     = result.totalPages
    listEl.innerHTML = result.data.length
      ? result.data.map(employeeRowHTML).join('')
      : '<div class="empty-state">Nenhum funcionário encontrado.</div>'
    renderPagination()
  } catch (err) {
    listEl.innerHTML = '<div class="empty-state empty-state--error">Falha ao carregar. Tente novamente.</div>'
    console.error('[TeamManagement] loadEmployees:', err)
  }
}

/* ======================================================================
   HANDLERS DE EVENTOS
   ====================================================================== */

function initTableActions(): void {
  el<HTMLDivElement>('#employee-list').addEventListener('click', async (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]')
    if (!btn) return
    const { action, id } = btn.dataset as { action: string; id: string }

    if (action === 'edit') {
      // Navega para o form de edição passando o id via query string
      window.location.href = `employee-form.html?id=${id}`
    }

    if (action === 'delete') {
      if (!confirm('Desativar este funcionário? Ele perderá o acesso ao sistema.')) return
      btn.disabled = true
      try {
        await employeeService.deleteEmployee(id)
        // Sequential: loadEmployees recheia o cache; getStats lê dele sem nova req
        await loadEmployees()
        const stats = await employeeService.getStats()
        renderMetrics(stats)
      } catch (err) {
        console.error('[TeamManagement] deleteEmployee:', err)
        alert('Não foi possível desativar o funcionário. Tente novamente.')
        btn.disabled = false
      }
    }
  })
}

function initPagination(): void {
  el<HTMLDivElement>('#pagination').addEventListener('click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-page]')
    if (!btn || btn.disabled) return
    const page = Number(btn.dataset.page)
    if (!page || page === state.currentPage || page < 1 || page > state.totalPages) return
    state.currentPage = page
    loadEmployees()
  })
}

function initSearch(): void {
  const input = el<HTMLInputElement>('#search-input')
  let debounce: ReturnType<typeof setTimeout>
  input.addEventListener('input', () => {
    clearTimeout(debounce)
    debounce = setTimeout(() => {
      state.searchQuery = input.value.trim()
      state.currentPage = 1
      loadEmployees()
    }, 300)
  })
}

function initAddEmployee(): void {
  el<HTMLButtonElement>('#btn-add-employee').addEventListener('click', () => {
    window.location.href = 'employee-form.html'
  })
}

function initFilters(): void {
  el<HTMLButtonElement>('#btn-filters').addEventListener('click', () => {
    // TODO: painel de filtros por perfil/status
    console.log('[TeamManagement] Abrir filtros')
  })
}

/* ======================================================================
   INICIALIZAÇÃO
   ====================================================================== */

async function init(): Promise<void> {
  initTableActions()
  initPagination()
  initSearch()
  initAddEmployee()
  initFilters()

  renderMetricsSkeleton()

  // Sequential: loadEmployees popula o cache da ApiEmployeeService;
  // getStats reutiliza esse cache sem disparar nova requisição.
  await loadEmployees()
  const stats = await employeeService.getStats()
  renderMetrics(stats)
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(err => console.error('[TeamManagement] init:', err))
})