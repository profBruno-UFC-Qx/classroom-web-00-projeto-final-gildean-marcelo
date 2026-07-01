import { escapeHtml } from '../shared/dom'
import { formatarMoeda } from '@/utils/ui'
import type { PaginatedResult, Product, ProductMetrics } from './types'

export function metricsHTML(m: ProductMetrics): string {
  const items = [
    { label: 'Total Items', value: m.total,      icon: 'restaurant',   cls: 'metric-value--primary' },
    { label: 'Categories',  value: m.categories, icon: 'category',     cls: 'metric-value--primary' },
    { label: 'Active',      value: m.active,     icon: 'check_circle', cls: 'metric-value--active'  },
    { label: 'Paused',      value: m.paused,     icon: 'pause_circle', cls: 'metric-value--paused'  },
  ]
  return items.map(item => `
    <div class="metric-card">
      <div class="metric-card__header">
        <span class="material-symbols-outlined metric-card__icon" aria-hidden="true">${item.icon}</span>
        <span class="metric-card__label">${item.label}</span>
      </div>
      <span class="metric-card__value ${item.cls}">${item.value}</span>
    </div>`).join('')
}

export function rowHTML(p: Product): string {
  const paused = p.status === 'paused'
  const thumb  = p.image
    ? `<img class="product-thumb__img" src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy">`
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
          <p class="product-name">${escapeHtml(p.name)}</p>
          <p class="product-desc">${escapeHtml(p.description)}</p>
        </div>
      </div>
      <div class="table-cell table-cell--category" role="cell">
        <span class="category-chip">${escapeHtml(p.category)}</span>
      </div>
      <div class="table-cell table-cell--price${paused ? ' product-info--dim' : ''}" role="cell">
        ${formatarMoeda(p.price)}
      </div>
      <div class="table-cell table-cell--status" role="cell">${badge}</div>
      <div class="table-cell table-cell--actions" role="cell">
        <button class="row-action row-action--edit"   data-id="${p.id}" aria-label="Editar ${escapeHtml(p.name)}" title="Editar">
          <span class="material-symbols-outlined" aria-hidden="true">edit</span>
        </button>
        <button class="row-action row-action--delete" data-id="${p.id}" aria-label="Excluir ${escapeHtml(p.name)}" title="Excluir">
          <span class="material-symbols-outlined" aria-hidden="true">delete</span>
        </button>
      </div>
    </div>`
}

export function tableInfoText(result: PaginatedResult<Product>): string {
  if (result.total === 0) return 'Nenhum resultado encontrado'
  const start = (result.page - 1) * result.perPage + 1
  const end   = Math.min(result.page * result.perPage, result.total)
  return `Exibindo ${start}–${end} de ${result.total} produtos`
}

function pageRange(current: number, total: number): number[] {
  const s = new Set<number>([1, total])
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= total) s.add(i)
  }
  return Array.from(s).sort((a, b) => a - b)
}

export function paginationHTML(page: number, totalPages: number): string {
  if (totalPages <= 1) return ''

  const range   = pageRange(page, totalPages)
  let pagesHTML = ''
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

  return `
    <button class="pagination__btn pagination__btn--nav" data-page="${page - 1}"
            aria-label="Página anterior" ${page === 1 ? 'disabled' : ''}>
      <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
    </button>
    ${pagesHTML}
    <button class="pagination__btn pagination__btn--nav" data-page="${page + 1}"
            aria-label="Próxima página" ${page === totalPages ? 'disabled' : ''}>
      <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
    </button>`
}
