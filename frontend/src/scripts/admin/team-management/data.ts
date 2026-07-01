import { el } from '../shared/dom'
import { employeeService } from './api-service'
import { employeeRowHTML, renderPagination } from './render'
import { state } from './state'

export async function loadEmployees(): Promise<void> {
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
