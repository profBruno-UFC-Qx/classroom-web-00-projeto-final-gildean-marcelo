export function toggleSenha(btn: HTMLButtonElement, input: HTMLInputElement): void {
  const estaOculta = input.type === 'password'
  input.type = estaOculta ? 'text' : 'password'

  const icone = btn.querySelector('i')
  if (!icone) return

  if (estaOculta) {
    icone.classList.remove('ph-eye-slash')
    icone.classList.add('ph-eye')
    btn.setAttribute('aria-label', 'Ocultar senha')
  } else {
    icone.classList.remove('ph-eye')
    icone.classList.add('ph-eye-slash')
    btn.setAttribute('aria-label', 'Mostrar senha')
  }
}

// Estado de Carregamento do Botão
const SPINNER_HTML = '<i class="ph ph-circle-notch ph-spin"></i>'
export function setLoading(btn: HTMLButtonElement, carregando: boolean): void {
  if (carregando) {
    btn.disabled = true
    btn.dataset.textoOriginal = btn.innerHTML
    btn.innerHTML = SPINNER_HTML
  } else {
    btn.disabled = false
    if (btn.dataset.textoOriginal) {
      btn.innerHTML = btn.dataset.textoOriginal
      delete btn.dataset.textoOriginal
    }
  }
}

// Mensagens de Feedback no Formulário
const CLASSE_FEEDBACK = 'feedback-msg'
export type TipoFeedback = 'erro' | 'sucesso'
export function showFeedback(
  form: HTMLFormElement,
  msg: string | null,
  tipo: TipoFeedback = 'erro'
): void {
  // Remove feedback anterior
  const anterior = form.querySelector(`.${CLASSE_FEEDBACK}`)
  if (anterior) anterior.remove()

  if (!msg) return

  const el = document.createElement('p')
  el.className = `${CLASSE_FEEDBACK} ${CLASSE_FEEDBACK}--${tipo}`
  el.setAttribute('role', 'alert')
  el.textContent = msg

  const btnSubmit = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  if (btnSubmit) {
    form.insertBefore(el, btnSubmit)
  } else {
    form.appendChild(el)
  }
}

// Mascaras de Input

export function formatarCPF(valor: string): string {
  const digits = valor.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function formatarWhatsApp(valor: string): string {
  const digits = valor.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}



export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

export function sanitizeImageUrl(url: string | null): string {
  if (!url) return 'https://placehold.co/400x300/e2e8f0/64748b?text=Sem+Imagem'
  // Fix absolute paths mistakenly saved in DB
  const pathPart = url.split('/frontend')[1]
  if (pathPart) {
    return pathPart
  }
  return url
}
