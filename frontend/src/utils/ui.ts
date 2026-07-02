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
  
  if (url.startsWith('/uploads/')) {
    const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:1337'
    return `${baseUrl}${url}`
  }

  // Fix absolute paths mistakenly saved in DB
  const pathPart = url.split('/frontend')[1]
  if (pathPart) {
    return pathPart
  }
  return url
}

export function formatarData(isoString: string): string {
  const data = new Date(isoString)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(data)
}

// Modal Global
export type ModalTipo = 'aviso' | 'erro' | 'info' | 'sucesso' | 'localizacao'

export const ICONES: Record<ModalTipo, string> = {
  aviso: '<i class="ph-bold ph-warning"></i>',
  erro:  '<i class="ph-bold ph-x-circle"></i>',
  info: '<i class="ph-bold ph-info"></i>',
  sucesso: '<i class="ph-bold ph-check-circle"></i>',
  localizacao: '<i class="ph-bold ph-map-pin-area"></i>'
}

export function showModal(
  titulo: string,
  mensagem: string,
  tipo: ModalTipo = 'aviso',
  opcoes?: { labelOk?: string; labelAcao?: string; onAcao?: () => void }
): Promise<boolean> {
  return new Promise(resolve => {
    let overlay  = document.getElementById('modal-overlay')
    if (!overlay) {
      overlay = document.createElement('div')
      overlay.id = 'modal-overlay'
      overlay.className = 'modal-overlay'
      overlay.style.display = 'none'
      overlay.setAttribute('role', 'dialog')
      overlay.setAttribute('aria-modal', 'true')
      overlay.setAttribute('aria-labelledby', 'modal-titulo')
      
      overlay.innerHTML = `
        <div class="modal-box">
            <div class="modal-icon" id="modal-icon"></div>
            <h2 class="modal-titulo" id="modal-titulo"></h2>
            <p class="modal-mensagem" id="modal-mensagem"></p>
            <div class="modal-acoes" id="modal-acoes"></div>
        </div>
      `
      document.body.appendChild(overlay)
    }

    const iconEl   = document.getElementById('modal-icon')!
    const tituloEl = document.getElementById('modal-titulo')!
    const msgEl    = document.getElementById('modal-mensagem')!
    const acoesEl  = document.getElementById('modal-acoes')!

    iconEl.className = `modal-icon modal-icon--${tipo}`
    iconEl.innerHTML = ICONES[tipo]
    tituloEl.textContent = titulo
    msgEl.textContent = mensagem
    acoesEl.innerHTML = ''

    if (opcoes?.labelAcao) {
      const btnAcao = document.createElement('button')
      btnAcao.className = 'modal-btn modal-btn--primario'
      btnAcao.textContent = opcoes.labelAcao
      btnAcao.onclick = () => {
        overlay.style.display = 'none'
        if (opcoes.onAcao) opcoes.onAcao()
        resolve(true)
      }
      acoesEl.appendChild(btnAcao)
    }

    const btnOk = document.createElement('button')
    btnOk.className = opcoes?.labelAcao ? 'modal-btn modal-btn--secundario' : 'modal-btn modal-btn--primario'
    btnOk.textContent = opcoes?.labelOk ?? 'Entendi'
    btnOk.onclick = () => { overlay.style.display = 'none'; resolve(false) }
    acoesEl.appendChild(btnOk)

    overlay.style.display = 'flex'
    acoesEl.querySelector<HTMLButtonElement>('.modal-btn')?.focus()
  })
}
