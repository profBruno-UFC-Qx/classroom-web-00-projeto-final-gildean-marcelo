import { el } from '../shared/dom'
import { employeeService } from './api-service'
import { loadEmployees } from './data'
import { renderMetrics } from './render'
import { state } from './state'

export function initTableActions(): void {
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

export function initPagination(): void {
  el<HTMLDivElement>('#pagination').addEventListener('click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-page]')
    if (!btn || btn.disabled) return
    const page = Number(btn.dataset.page)
    if (!page || page === state.currentPage || page < 1 || page > state.totalPages) return
    state.currentPage = page
    loadEmployees()
  })
}

export function initSearch(): void {
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

export function initAddEmployee(): void {
  el<HTMLButtonElement>('#btn-add-employee').addEventListener('click', () => {
    window.location.href = 'employee-form.html'
  })
}
