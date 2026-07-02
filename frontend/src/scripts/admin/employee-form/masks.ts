import { el } from '../shared/dom'

export function applyMaskCPF(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <=  3) return d
  if (d.length <=  6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <=  9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

export function applyMaskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <=  2) return d.length ? `(${d}` : ''
  if (d.length <=  6) return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

export function initMasks(): void {
  const cpfInput   = el<HTMLInputElement>('#cpf')
  const phoneInput = el<HTMLInputElement>('#phone')
  cpfInput.addEventListener('input', () => {
    const pos = cpfInput.selectionStart ?? cpfInput.value.length
    cpfInput.value = applyMaskCPF(cpfInput.value)
    cpfInput.setSelectionRange(pos, pos)
  })
  phoneInput.addEventListener('input', () => {
    phoneInput.value = applyMaskPhone(phoneInput.value)
  })
}

export function initPasswordToggle(): void {
  const input  = el<HTMLInputElement>('#password')
  const btn    = el<HTMLButtonElement>('#btn-toggle-password')
  const icon   = el<HTMLSpanElement>('#icon-password-toggle')
  btn.addEventListener('click', () => {
    const isHidden      = input.type === 'password'
    input.type          = isHidden ? 'text' : 'password'
    icon.textContent    = isHidden ? 'visibility_off' : 'visibility'
    btn.setAttribute('aria-label', isHidden ? 'Ocultar senha' : 'Mostrar senha')
  })
}
