import { el } from '../shared/dom'
import { state } from './state'
import type { Employee, EmployeeStatus, TeamStats } from './types'

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

export function employeeRowHTML(emp: Employee): string {
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

export function renderPagination(): void {
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

export function renderMetrics(stats: TeamStats): void {
  el<HTMLDivElement>('#metrics-grid').innerHTML = METRIC_CONFIGS.map(c => `
    <div class="metric-card">
      <div class="metric-card__header">
        <span class="material-symbols-outlined metric-card__icon" aria-hidden="true">${c.icon}</span>
        <span class="metric-card__label">${c.label}</span>
      </div>
      <span class="metric-card__value metric-card__value--${c.modifier}">${stats[c.key]}</span>
    </div>`).join('')
}

export function renderMetricsSkeleton(): void {
  el<HTMLDivElement>('#metrics-grid').innerHTML = METRIC_CONFIGS.map(() =>
    '<div class="metric-card skeleton-row" style="min-height:116px;border-radius:var(--radius-xl)"></div>'
  ).join('')
}
