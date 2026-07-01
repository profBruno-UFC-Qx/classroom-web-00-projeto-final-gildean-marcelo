import type { UsuarioEntity } from '@/services/UsuarioService'
import { PERFIL_LABEL } from '../shared/layout'
import type { Employee, EmployeeStatus } from './types'

export function resolveStatus(ativo: boolean, emServico: boolean): EmployeeStatus {
  if (!ativo)    return 'inactive'
  if (emServico) return 'on-duty'
  return 'active'
}

export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return 'Não informado'
  const d = raw.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return raw
}

export function toEmployee(entity: UsuarioEntity): Employee {
  const a  = entity
  const id = String(entity.id)
  return {
    id,
    name:   a.username,
    code:   `EMP-${id.padStart(4, '0')}`,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(a.username)}&background=ecefe7&color=191d18&size=48`,
    role:   PERFIL_LABEL[a.perfil] ?? a.perfil,
    email:  a.email,
    phone:  formatPhone(a.whatsapp),
    status: resolveStatus(a.ativo, a.emServico ?? false),
  }
}
