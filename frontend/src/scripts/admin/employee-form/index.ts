import { PerfilUsuario } from '@/services/UsuarioService'
import { verificarAcessoAdmin } from '@/utils/auth'
import { initAdminTopbar } from '../shared/layout'
import { initMasks, initPasswordToggle } from './masks'
import { initInlineValidation } from './validation'
import { loadRoles, loadEmployeeForEdit, initFormSubmit, initNavigation } from './form'

if (!verificarAcessoAdmin([PerfilUsuario.Admin])) {
  throw new Error('Acesso restrito a administradores.')
}

async function init(): Promise<void> {
  initAdminTopbar()
  await loadRoles()           // popula <select> antes de qualquer coisa
  await loadEmployeeForEdit() // pré-preenche se ?id= presente (modo edição)
  initMasks()
  initPasswordToggle()
  initInlineValidation()
  initFormSubmit()
  initNavigation()
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(err => console.error('[Form] init:', err))
})
