

import { usuarioService, PerfilUsuario } from '@/services/UsuarioService'

/* ======================================================================
   TIPOS
   ====================================================================== */

interface Role {
  value: string
  label: string
}

interface EmployeeFormData {
  name:     string
  email:    string   // obrigatório pelo Users & Permissions do Strapi
  phone:    string
  cpf:      string
  address:  string
  role:     string   // valor do enum PerfilUsuario
  password: string
  isActive: boolean
}

interface ValidationError {
  field:   string
  message: string
}

interface CreateEmployeeResult {
  id:   string
  code: string   // ex.: "EMP-0007"
}

/* ======================================================================
   PORT DO SERVIÇO
   ====================================================================== */

interface EmployeeFormServicePort {
  getRoles(): Promise<Role[]>
  createEmployee(data: EmployeeFormData): Promise<CreateEmployeeResult>
}

/* ======================================================================
   API SERVICE  (produção — usa UsuarioService)
   ====================================================================== */

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
    const entity = await usuarioService.create({
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

/* ======================================================================
   MOCK SERVICE  (desenvolvimento local — sem backend)
   ====================================================================== */

class MockEmployeeFormService implements EmployeeFormServicePort {
  async getRoles(): Promise<Role[]> {
    await new Promise<void>(r => setTimeout(r, 100))
    return [
      { value: PerfilUsuario.Admin,   label: 'Administrador' },
      { value: PerfilUsuario.Cozinha, label: 'Cozinha'       },
    ]
  }

  async createEmployee(data: EmployeeFormData): Promise<CreateEmployeeResult> {
    await new Promise<void>(r => setTimeout(r, 700))
    const id = String(100 + Math.floor(Math.random() * 900))
    console.log('[Mock] Funcionário criado:', { ...data, id })
    return { id, code: `EMP-${id.padStart(4, '0')}` }
  }
}

/* ======================================================================
   ▼ SWAP HERE
   Produção  → new ApiEmployeeFormService()
   Dev/local → new MockEmployeeFormService()
   ====================================================================== */
const employeeFormService: EmployeeFormServicePort = new ApiEmployeeFormService()

/* ======================================================================
   HELPERS DE DOM
   ====================================================================== */

function el<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector)
  if (!found) throw new Error(`[Form] Elemento não encontrado: ${selector}`)
  return found
}

/* ======================================================================
   MÁSCARAS DE INPUT
   ====================================================================== */

function applyMaskCPF(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <=  3) return d
  if (d.length <=  6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <=  9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

function applyMaskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <=  2) return d.length ? `(${d}` : ''
  if (d.length <=  6) return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function initMasks(): void {
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

/* ======================================================================
   TOGGLE DE VISIBILIDADE DA SENHA
   ====================================================================== */

function initPasswordToggle(): void {
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

/* ======================================================================
   CARGA DINÂMICA DOS CARGOS
   ====================================================================== */

async function loadRoles(): Promise<void> {
  const select = el<HTMLSelectElement>('#role')
  try {
    const roles = await employeeFormService.getRoles()
    roles.forEach(role => {
      const opt = document.createElement('option')
      opt.value       = role.value
      opt.textContent = role.label
      select.appendChild(opt)
    })
  } catch (err) {
    console.error('[Form] Erro ao carregar cargos:', err)
  }
}

/* ======================================================================
   MODO EDIÇÃO  (detecta ?id= na URL e pré-preenche o form)
   ====================================================================== */

async function loadEmployeeForEdit(): Promise<void> {
  const id = new URLSearchParams(window.location.search).get('id')
  if (!id) return  // modo criação — nada a fazer

  const titleEl = document.querySelector<HTMLHeadingElement>('.page-title')
  if (titleEl) titleEl.textContent = 'Editar Funcionário'

  const saveBtnLabel = document.querySelector<HTMLButtonElement>('#btn-save')
  if (saveBtnLabel) saveBtnLabel.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">save</span> Salvar Alterações`

  try {
    const entity = await usuarioService.getById(Number(id))
    const a      = entity

    el<HTMLInputElement>('#name').value    = a.username
    el<HTMLInputElement>('#email').value   = a.email
    el<HTMLInputElement>('#phone').value   = applyMaskPhone(a.whatsapp)
    el<HTMLInputElement>('#cpf').value     = applyMaskCPF(a.cpf)
    el<HTMLInputElement>('#address').value = a.endereco ?? ''
    el<HTMLInputElement>('#toggle-active').checked = a.ativo

    // Aguarda o loadRoles() terminar antes de setar o valor
    const select = el<HTMLSelectElement>('#role')
    if (select.options.length > 1) {
      select.value = a.perfil
    } else {
      // roles ainda carregando — seta após um tick
      setTimeout(() => { select.value = a.perfil }, 0)
    }

    // Armazena o id para o submit usar update() em vez de create()
    el<HTMLFormElement>('#employee-form').dataset.editId = id
  } catch (err) {
    console.error('[Form] Erro ao carregar funcionário para edição:', err)
    showToast('Não foi possível carregar os dados do funcionário.', 'error')
  }
}

/* ======================================================================
   VALIDAÇÃO
   ====================================================================== */

/** Validação real do dígito verificador do CPF. */
function isValidCPF(cpf: string): boolean {
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

function collectFormData(): EmployeeFormData {
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

function validateForm(data: EmployeeFormData): ValidationError[] {
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

/* ======================================================================
   EXIBIÇÃO DE ERROS
   ====================================================================== */

function showFieldError(fieldId: string, message: string): void {
  const input = document.querySelector(`#${fieldId}`)
  input?.closest<HTMLElement>('.field__input-wrap')?.classList.add('field__input-wrap--error')
  const errorEl = document.querySelector<HTMLElement>(`#error-${fieldId}`)
  if (errorEl) errorEl.textContent = message
}

function clearAllErrors(): void {
  document.querySelectorAll<HTMLElement>('.field__input-wrap--error')
    .forEach(w => w.classList.remove('field__input-wrap--error'))
  document.querySelectorAll<HTMLElement>('[id^="error-"]')
    .forEach(e => { e.textContent = '' })
}

function initInlineValidation(): void {
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

/* ======================================================================
   TOAST DE FEEDBACK
   ====================================================================== */

function showToast(message: string, type: 'success' | 'error'): void {
  document.querySelector('.toast')?.remove()
  const toast = document.createElement('div')
  toast.className = `toast toast--${type}`
  toast.setAttribute('role', 'status')
  toast.setAttribute('aria-live', 'polite')
  toast.innerHTML = `
    <span class="material-symbols-outlined toast__icon" aria-hidden="true">${type === 'success' ? 'check_circle' : 'error'}</span>
    <span>${message}</span>`
  document.body.appendChild(toast)
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('toast--visible')))
  setTimeout(() => {
    toast.classList.remove('toast--visible')
    setTimeout(() => toast.remove(), 300)
  }, 4500)
}

/* ======================================================================
   SUBMIT
   ====================================================================== */

function setSaveLoading(loading: boolean): void {
  const btn = el<HTMLButtonElement>('#btn-save')
  btn.disabled  = loading
  btn.innerHTML = loading
    ? `<span class="material-symbols-outlined btn__spinner" aria-hidden="true">sync</span> Salvando...`
    : `<span class="material-symbols-outlined" aria-hidden="true">save</span> Salvar Funcionário`
}

function initFormSubmit(): void {
  el<HTMLButtonElement>('#btn-save').addEventListener('click', async () => {
    clearAllErrors()
    const data   = collectFormData()
    const errors = validateForm(data)

    if (errors.length > 0) {
      errors.forEach(e => showFieldError(e.field, e.message))
      document.querySelector<HTMLElement>('.field__input-wrap--error input, .field__input-wrap--error select')?.focus()
      return
    }

    setSaveLoading(true)
    try {
      const editId = el<HTMLFormElement>('#employee-form').dataset.editId

      if (editId) {
        // ── MODO EDIÇÃO: usa usuarioService.update() diretamente ──────────
        await usuarioService.update(Number(editId), {
          username: data.name,
          email:    data.email,
          whatsapp: data.phone.replace(/\D/g, ''),
          cpf:      data.cpf.replace(/\D/g, ''),
          endereco: data.address || null,
          perfil:   data.role as PerfilUsuario,
          ativo:    data.isActive,
          ...(data.password ? { password: data.password } : {}),
        })
        showToast('Funcionário atualizado com sucesso!', 'success')
      } else {
        // ── MODO CRIAÇÃO: usa o service port ──────────────────────────────
        const result = await employeeFormService.createEmployee(data)
        showToast(`Funcionário ${result.code} cadastrado com sucesso!`, 'success')
      }

      setTimeout(() => { window.location.href = 'team-management.html' }, 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.'
      showToast(message, 'error')
    } finally {
      setSaveLoading(false)
    }
  })
}

/* ======================================================================
   NAVEGAÇÃO
   ====================================================================== */

function initNavigation(): void {
  el<HTMLButtonElement>('#btn-cancel').addEventListener('click', () => {
    window.location.href = 'team-management.html'
  })

  el<HTMLAnchorElement>('#link-back').addEventListener('click', (e: MouseEvent) => {
    if (hasUnsavedData()) {
      if (!confirm('Tem certeza que deseja sair? Os dados não salvos serão perdidos.')) {
        e.preventDefault()
      }
    }
  })
}

function hasUnsavedData(): boolean {
  const inputs = document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
    '#employee-form input:not([type="checkbox"]), #employee-form select'
  )
  return Array.from(inputs).some(i => i.value.trim() !== '' && i.value !== '')
}

/* ======================================================================
   INICIALIZAÇÃO
   ====================================================================== */

async function init(): Promise<void> {
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