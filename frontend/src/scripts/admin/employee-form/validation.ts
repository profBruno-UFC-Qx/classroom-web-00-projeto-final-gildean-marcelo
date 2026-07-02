import { el } from '../shared/dom'
import type { EmployeeFormData, ValidationError } from './types'

/** Validação real do dígito verificador do CPF. */
export function isValidCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  for (let t = 9; t <= 10; t++) {
    let sum = 0
    for (let i = 0; i < t; i++) sum += Number(d[i]) * (t + 1 - i)
    const rem = (sum * 10) % 11
    if (Number(d[t]) !== (rem >= 10 ? 0 : rem)) return false
  }
  return true
}

export function collectFormData(): EmployeeFormData {
  return {
    name:     el<HTMLInputElement>('#name').value.trim(),
    email:    el<HTMLInputElement>('#email').value.trim(),
    phone:    el<HTMLInputElement>('#phone').value.trim(),
    cpf:      el<HTMLInputElement>('#cpf').value.trim(),
    address:  el<HTMLInputElement>('#address').value.trim(),
    role:     el<HTMLSelectElement>('#role').value,
    password: el<HTMLInputElement>('#password').value,
    isActive: el<HTMLInputElement>('#toggle-active').checked,
  }
}

export function validateForm(data: EmployeeFormData): ValidationError[] {
  const errors: ValidationError[] = []

  if (!data.name)
    errors.push({ field: 'name', message: 'Nome completo é obrigatório.' })

  if (!data.email)
    errors.push({ field: 'email', message: 'E-mail é obrigatório.' })
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.push({ field: 'email', message: 'E-mail inválido.' })

  if (!data.phone)
    errors.push({ field: 'phone', message: 'Telefone é obrigatório.' })
  else if (data.phone.replace(/\D/g, '').length < 10)
    errors.push({ field: 'phone', message: 'Número inválido. Use (DDD) + número.' })

  if (!data.cpf)
    errors.push({ field: 'cpf', message: 'CPF é obrigatório.' })
  else if (!isValidCPF(data.cpf))
    errors.push({ field: 'cpf', message: 'CPF inválido.' })

  if (!data.role)
    errors.push({ field: 'role', message: 'Selecione uma função.' })

  return errors
}

export function showFieldError(fieldId: string, message: string): void {
  const input = document.querySelector(`#${fieldId}`)
  input?.closest<HTMLElement>('.field__input-wrap')?.classList.add('field__input-wrap--error')
  const errorEl = document.querySelector<HTMLElement>(`#error-${fieldId}`)
  if (errorEl) errorEl.textContent = message
}

export function clearAllErrors(): void {
  document.querySelectorAll<HTMLElement>('.field__input-wrap--error')
    .forEach(w => w.classList.remove('field__input-wrap--error'))
  document.querySelectorAll<HTMLElement>('[id^="error-"]')
    .forEach(e => { e.textContent = '' })
}

export function initInlineValidation(): void {
  ['name', 'email', 'phone', 'cpf', 'role'].forEach(fieldId => {
    const input = document.querySelector(`#${fieldId}`)
    const clear = () => {
      input?.closest<HTMLElement>('.field__input-wrap')?.classList.remove('field__input-wrap--error')
      const errorEl = document.querySelector<HTMLElement>(`#error-${fieldId}`)
      if (errorEl) errorEl.textContent = ''
    }
    input?.addEventListener('input',  clear)
    input?.addEventListener('change', clear)
  })
}
