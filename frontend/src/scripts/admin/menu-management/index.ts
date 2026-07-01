import { PerfilUsuario } from '@/services/UsuarioService'
import { verificarAcessoAdmin } from '@/utils/auth'
import { ApiProductService } from './api-service'
import { MenuManagementController } from './controller'
import type { IProductService } from './types'

if (!verificarAcessoAdmin([PerfilUsuario.Admin])) {
  throw new Error('Acesso restrito a administradores.')
}

document.addEventListener('DOMContentLoaded', () => {
  const service: IProductService = new ApiProductService()
  const controller = new MenuManagementController(service)
  controller.init()
})
