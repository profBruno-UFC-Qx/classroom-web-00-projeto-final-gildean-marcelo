import { usuarioService, PerfilUsuario } from '@/services/UsuarioService'
import type { EmployeeFormServicePort, Role, EmployeeFormData, CreateEmployeeResult } from './types'

class ApiEmployeeFormService implements EmployeeFormServicePort {

  /**
   * Retorna os perfis de funcionário disponíveis para seleção.
   * Não faz chamada à API — os valores vêm do enum PerfilUsuario.
   * Para adicionar novos perfis: expanda o enum e recrie o campo no Strapi.
   */
  async getRoles(): Promise<Role[]> {
    return [
      { value: PerfilUsuario.Admin,   label: 'Administrador' },
      { value: PerfilUsuario.Cozinha, label: 'Cozinha'       },
    ]
  }

  async createEmployee(data: EmployeeFormData): Promise<CreateEmployeeResult> {
    const entity = await usuarioService.createFuncionario({
      username:  data.name,
      email:     data.email,
      // Gera senha temporária se não informada.
      // O funcionário deverá trocar no primeiro acesso.
      password:  data.password || this.generateTempPassword(),
      whatsapp:  data.phone.replace(/\D/g, ''),  // armazena só dígitos
      cpf:       data.cpf.replace(/\D/g, ''),    // armazena só dígitos
      endereco:  data.address.trim() || undefined,
      perfil:    data.role as PerfilUsuario,
      ativo:     data.isActive,
      emServico: false,   // novo funcionário começa fora de turno
    })
    const id = String(entity.id)
    return { id, code: `EMP-${id.padStart(4, '0')}` }
  }

  /** Senha aleatória de 12 chars (letras + números sem ambíguos). */
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    return Array.from({ length: 12 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
  }
}

export const employeeFormService: EmployeeFormServicePort = new ApiEmployeeFormService()
