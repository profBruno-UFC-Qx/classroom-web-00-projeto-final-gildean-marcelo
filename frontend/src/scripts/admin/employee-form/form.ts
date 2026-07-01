import { usuarioService, PerfilUsuario } from '@/services/UsuarioService'
import { el } from '../shared/dom'
import { employeeFormService } from './api-service'
import { applyMaskCPF, applyMaskPhone } from './masks'
import { collectFormData, validateForm, showFieldError, clearAllErrors } from './validation'
import { showToast } from './toast'

/* ======================================================================
   CARGA DINÂMICA DOS CARGOS
   ====================================================================== */

export async function loadRoles(): Promise<void> {
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

export async function loadEmployeeForEdit(): Promise<void> {
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
    el<HTMLInputElement>('#phone').value   = applyMaskPhone(a.whatsapp ?? '')
    el<HTMLInputElement>('#cpf').value     = applyMaskCPF(a.cpf ?? '')
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
   SUBMIT
   ====================================================================== */

function setSaveLoading(loading: boolean): void {
  const btn = el<HTMLButtonElement>('#btn-save')
  btn.disabled  = loading
  btn.innerHTML = loading
    ? `<span class="material-symbols-outlined btn__spinner" aria-hidden="true">sync</span> Salvando...`
    : `<span class="material-symbols-outlined" aria-hidden="true">save</span> Salvar Funcionário`
}

export function initFormSubmit(): void {
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

function hasUnsavedData(): boolean {
  const inputs = document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
    '#employee-form input:not([type="checkbox"]), #employee-form select'
  )
  return Array.from(inputs).some(i => i.value.trim() !== '' && i.value !== '')
}

export function initNavigation(): void {
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
