import { PerfilUsuario } from '@/services/UsuarioService'
import { verificarAcessoAdmin } from '@/utils/auth'
import { initAdminTopbar } from '../shared/layout'
import { employeeService } from './api-service'
import { loadEmployees } from './data'
import { initAddEmployee, initPagination, initSearch, initTableActions } from './events'
import { renderMetrics, renderMetricsSkeleton } from './render'

if (!verificarAcessoAdmin([PerfilUsuario.Admin])) {
  throw new Error('Acesso restrito a administradores.')
}

async function init(): Promise<void> {
  initTableActions()
  initPagination()
  initSearch()
  initAddEmployee()
  initAdminTopbar()

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
