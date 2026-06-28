/**
 * employee-form.ts
 * Danny's Fresh Market · Cadastro de Funcionário
 *
 * Compilar: tsc employee-form.ts --target ES2017 --lib ES2017,DOM --strict
 * Saída:    employee-form.js  (referenciado no HTML)
 *
 * Para conectar ao backend, implemente ApiEmployeeFormService
 * e troque a linha marcada com "▼ SWAP HERE".
 */

/* ======================================================================
   TIPOS
   ====================================================================== */

interface Role {
  value: string;
  label: string;
}

interface EmployeeFormData {
  name:     string;
  phone:    string;
  cpf:      string;
  address:  string;
  role:     string;
  password: string;
  isActive: boolean;
}

interface ValidationError {
  field:   string;
  message: string;
}

interface CreateEmployeeResult {
  id:   string;
  code: string;  // ex.: "EMP-4231"
}

/* ======================================================================
   PORT DO SERVIÇO
   ====================================================================== */

interface EmployeeFormServicePort {
  getRoles(): Promise<Role[]>;
  createEmployee(data: EmployeeFormData): Promise<CreateEmployeeResult>;
}

/* ======================================================================
   MOCK DATA
   ====================================================================== */

const MOCK_ROLES: Role[] = [
  { value: 'gerente',     label: 'Gerente'      },
  { value: 'supervisor',  label: 'Supervisor'    },
  { value: 'caixa',       label: 'Caixa'         },
  { value: 'atendimento', label: 'Atendimento'   },
  { value: 'chapeiro',    label: 'Chapeiro'      },
  { value: 'montador',    label: 'Montador'      },
  { value: 'entregador',  label: 'Entregador'    },
  { value: 'estoque',     label: 'Estoquista'    },
  { value: 'limpeza',     label: 'Limpeza'       },
  { value: 'seguranca',   label: 'Segurança'     },
];

/* ======================================================================
   MOCK SERVICE
   ====================================================================== */

class MockEmployeeFormService implements EmployeeFormServicePort {

  async getRoles(): Promise<Role[]> {
    await this.delay(120);
    return [...MOCK_ROLES];
  }

  async createEmployee(data: EmployeeFormData): Promise<CreateEmployeeResult> {
    await this.delay(700);
    const code = `EMP-${1000 + Math.floor(Math.random() * 9000)}`;
    console.log('[Mock] Funcionário criado:', { ...data, code });
    return {
      id:   String(Date.now()),
      code,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/* ======================================================================
   REAL API SERVICE  (descomentar quando o Strapi estiver pronto)
   ====================================================================== */

// class ApiEmployeeFormService implements EmployeeFormServicePort {
//   constructor(private readonly baseUrl: string) {}
//
//   async getRoles(): Promise<Role[]> {
//     const r = await fetch(`${this.baseUrl}/roles`);
//     if (!r.ok) throw new Error('Falha ao carregar cargos');
//     return r.json();
//   }
//
//   async createEmployee(data: EmployeeFormData): Promise<CreateEmployeeResult> {
//     const r = await fetch(`${this.baseUrl}/employees`, {
//       method:  'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body:    JSON.stringify(data),
//     });
//     if (!r.ok) {
//       const err = await r.json().catch(() => ({})) as { message?: string };
//       throw new Error(err.message ?? `Erro ${r.status}`);
//     }
//     return r.json();
//   }
// }

/* ======================================================================
   ▼ SWAP HERE — troque para usar a API real:
     const employeeFormService: EmployeeFormServicePort =
       new ApiEmployeeFormService('https://api.dannys.com');
   ====================================================================== */
const employeeFormService: EmployeeFormServicePort = new MockEmployeeFormService();

/* ======================================================================
   HELPERS DE DOM
   ====================================================================== */

function el<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`[Form] Elemento não encontrado: ${selector}`);
  return found;
}

/* ======================================================================
   MÁSCARAS DE INPUT
   ====================================================================== */

/**
 * Formata CPF: 000.000.000-00
 * Aplica progressivamente conforme o usuário digita.
 */
function applyMaskCPF(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <=  3) return d;
  if (d.length <=  6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <=  9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Formata telefone brasileiro: (11) 90000-0000 ou (11) 0000-0000
 */
function applyMaskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <=  2) return d.length ? `(${d}` : '';
  if (d.length <=  6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function initMasks(): void {
  const cpfInput   = el<HTMLInputElement>('#cpf');
  const phoneInput = el<HTMLInputElement>('#phone');

  cpfInput.addEventListener('input', () => {
    const cursor = cpfInput.selectionStart ?? cpfInput.value.length;
    cpfInput.value = applyMaskCPF(cpfInput.value);
    // Mantém o cursor próximo da posição anterior
    cpfInput.setSelectionRange(cursor, cursor);
  });

  phoneInput.addEventListener('input', () => {
    phoneInput.value = applyMaskPhone(phoneInput.value);
  });
}

/* ======================================================================
   TOGGLE DE VISIBILIDADE DA SENHA
   ====================================================================== */

function initPasswordToggle(): void {
  const input    = el<HTMLInputElement>('#password');
  const btn      = el<HTMLButtonElement>('#btn-toggle-password');
  const icon     = el<HTMLSpanElement>('#icon-password-toggle');

  btn.addEventListener('click', () => {
    const isHidden = input.type === 'password';
    input.type           = isHidden ? 'text' : 'password';
    icon.textContent     = isHidden ? 'visibility_off' : 'visibility';
    btn.setAttribute('aria-label', isHidden ? 'Ocultar senha' : 'Mostrar senha');
  });
}

/* ======================================================================
   CARGA DINÂMICA DOS CARGOS
   ====================================================================== */

async function loadRoles(): Promise<void> {
  const select = el<HTMLSelectElement>('#role');
  try {
    const roles = await employeeFormService.getRoles();
    roles.forEach(role => {
      const opt       = document.createElement('option');
      opt.value       = role.value;
      opt.textContent = role.label;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('[Form] Erro ao carregar cargos:', err);
    // Mantém apenas o placeholder se a chamada falhar
  }
}

/* ======================================================================
   VALIDAÇÃO
   ====================================================================== */

/**
 * Validação do dígito verificador do CPF (algoritmo oficial).
 */
function isValidCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;

  for (let t = 9; t <= 10; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += Number(d[i]) * (t + 1 - i);
    const rem = (sum * 10) % 11;
    if (Number(d[t]) !== (rem >= 10 ? 0 : rem)) return false;
  }
  return true;
}

function collectFormData(): EmployeeFormData {
  return {
    name:     el<HTMLInputElement>('#name').value.trim(),
    phone:    el<HTMLInputElement>('#phone').value.trim(),
    cpf:      el<HTMLInputElement>('#cpf').value.trim(),
    address:  el<HTMLInputElement>('#address').value.trim(),
    role:     el<HTMLSelectElement>('#role').value,
    password: el<HTMLInputElement>('#password').value,
    isActive: el<HTMLInputElement>('#toggle-active').checked,
  };
}

function validateForm(data: EmployeeFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.name) {
    errors.push({ field: 'name', message: 'Nome completo é obrigatório.' });
  }

  if (!data.phone) {
    errors.push({ field: 'phone', message: 'Telefone é obrigatório.' });
  } else if (data.phone.replace(/\D/g, '').length < 10) {
    errors.push({ field: 'phone', message: 'Número inválido. Use (DDD) + número.' });
  }

  if (!data.cpf) {
    errors.push({ field: 'cpf', message: 'CPF é obrigatório.' });
  } else if (!isValidCPF(data.cpf)) {
    errors.push({ field: 'cpf', message: 'CPF inválido.' });
  }

  if (!data.role) {
    errors.push({ field: 'role', message: 'Selecione uma função.' });
  }

  return errors;
}

/* ======================================================================
   EXIBIÇÃO DE ERROS
   ====================================================================== */

function showFieldError(fieldId: string, message: string): void {
  const input = document.querySelector(`#${fieldId}`);
  const wrap  = input?.closest<HTMLElement>('.field__input-wrap');
  if (wrap) wrap.classList.add('field__input-wrap--error');

  const errorEl = document.querySelector<HTMLElement>(`#error-${fieldId}`);
  if (errorEl) errorEl.textContent = message;
}

function clearAllErrors(): void {
  document.querySelectorAll<HTMLElement>('.field__input-wrap--error')
    .forEach(w => w.classList.remove('field__input-wrap--error'));
  document.querySelectorAll<HTMLElement>('[id^="error-"]')
    .forEach(e => { e.textContent = ''; });
}

/**
 * Limpa o erro de um campo individualmente assim que o usuário
 * começa a corrigir o valor.
 */
function initInlineValidation(): void {
  ['name', 'phone', 'cpf', 'role'].forEach(fieldId => {
    const input = document.querySelector(`#${fieldId}`);
    input?.addEventListener('input', () => {
      const wrap    = input.closest<HTMLElement>('.field__input-wrap');
      const errorEl = document.querySelector<HTMLElement>(`#error-${fieldId}`);
      wrap?.classList.remove('field__input-wrap--error');
      if (errorEl) errorEl.textContent = '';
    });
    // select dispara 'change'
    input?.addEventListener('change', () => {
      const wrap    = input.closest<HTMLElement>('.field__input-wrap');
      const errorEl = document.querySelector<HTMLElement>(`#error-${fieldId}`);
      wrap?.classList.remove('field__input-wrap--error');
      if (errorEl) errorEl.textContent = '';
    });
  });
}

/* ======================================================================
   TOAST DE FEEDBACK
   ====================================================================== */

function showToast(message: string, type: 'success' | 'error'): void {
  document.querySelector('.toast')?.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <span class="material-symbols-outlined toast__icon" aria-hidden="true">
      ${type === 'success' ? 'check_circle' : 'error'}
    </span>
    <span>${message}</span>`;

  document.body.appendChild(toast);

  // Força reflow para a transição de entrada funcionar
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast--visible'));
  });

  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

/* ======================================================================
   SUBMIT DO FORMULÁRIO
   ====================================================================== */

function setSaveLoading(loading: boolean): void {
  const btn = el<HTMLButtonElement>('#btn-save');
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<span class="material-symbols-outlined btn__spinner" aria-hidden="true">sync</span> Salvando...`
    : `<span class="material-symbols-outlined" aria-hidden="true">save</span> Salvar Funcionário`;
}

function initFormSubmit(): void {
  el<HTMLButtonElement>('#btn-save').addEventListener('click', async () => {
    clearAllErrors();

    const data   = collectFormData();
    const errors = validateForm(data);

    if (errors.length > 0) {
      errors.forEach(e => showFieldError(e.field, e.message));

      // Foca no primeiro campo inválido para feedback imediato
      const firstInvalid = document.querySelector<HTMLElement>(
        '.field__input-wrap--error input, .field__input-wrap--error select',
      );
      firstInvalid?.focus();
      return;
    }

    setSaveLoading(true);
    try {
      const result = await employeeFormService.createEmployee(data);
      showToast(`Funcionário ${result.code} cadastrado com sucesso!`, 'success');

      // TODO: redirecionar para a lista após salvar
      // setTimeout(() => { window.location.href = 'team-management.html'; }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.';
      showToast(message, 'error');
    } finally {
      setSaveLoading(false);
    }
  });
}

/* ======================================================================
   NAVEGAÇÃO
   ====================================================================== */

function initNavigation(): void {
  // Botão Cancelar
  el<HTMLButtonElement>('#btn-cancel').addEventListener('click', () => {
    // TODO: substituir por rota real do SPA / router
    window.location.href = 'team-management.html';
  });

  // Link "Voltar para a lista" já usa href nativo; não precisa de JS.
  // O handler abaixo é para confirmar saída caso haja dados não salvos.
  el<HTMLAnchorElement>('#link-back').addEventListener('click', (e: MouseEvent) => {
    if (hasUnsavedData()) {
      const confirm = window.confirm('Tem certeza que deseja sair? Os dados não salvos serão perdidos.');
      if (!confirm) e.preventDefault();
    }
  });
}

/** Verifica se o usuário já digitou algo no formulário. */
function hasUnsavedData(): boolean {
  const inputs = document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
    '#employee-form input:not([type="checkbox"]), #employee-form select',
  );
  return Array.from(inputs).some(input => input.value.trim() !== '' && input.value !== '');
}

/* ======================================================================
   INICIALIZAÇÃO
   ====================================================================== */

async function init(): Promise<void> {
  await loadRoles();        // carrega opções do select antes de tudo
  initMasks();
  initPasswordToggle();
  initInlineValidation();
  initFormSubmit();
  initNavigation();
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(err => console.error('[Form] init:', err));
});
