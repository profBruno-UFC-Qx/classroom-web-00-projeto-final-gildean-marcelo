import { usuarioService } from '@/services/UsuarioService'
import { salvarSessao, redirecionarSeLogado } from '@/utils/auth'
import {
  toggleSenha,
  setLoading,
  showFeedback,
  formatarCPF,
  formatarWhatsApp,
  apenasDigitos,
} from '@/utils/ui'
import { HttpError } from '@/api/HttpClient'

redirecionarSeLogado()

const form = document.querySelector<HTMLFormElement>('#form-cadastro')
const inputNome = document.querySelector<HTMLInputElement>('#nome')
const inputEmail = document.querySelector<HTMLInputElement>('#email')
const inputCPF = document.querySelector<HTMLInputElement>('#cpf')
const inputWhatsApp = document.querySelector<HTMLInputElement>('#whatsapp')
const inputEndereco = document.querySelector<HTMLInputElement>('#endereco')
const inputSenha = document.querySelector<HTMLInputElement>('#senha')
const inputConfirmar = document.querySelector<HTMLInputElement>('#confirmar-senha')
const btnSubmit = form?.querySelector<HTMLButtonElement>('button[type="submit"]')
const btnVoltar = document.querySelector<HTMLButtonElement>('.cadastro-header_voltar')


const [btnOlhoSenha, btnOlhoConfirmar] = Array.from(
  document.querySelectorAll<HTMLButtonElement>('.input-acao-btn')
)

if (!form || !inputNome || !inputEmail || !inputCPF || !inputWhatsApp ||
  !inputEndereco || !inputSenha || !inputConfirmar || !btnSubmit) {
  console.error('[cadastroController] Elementos do DOM não encontrados.')
}

btnVoltar?.addEventListener('click', () => {
  history.back()
})


if (btnOlhoSenha && inputSenha) {
  btnOlhoSenha.addEventListener('click', () => {
    toggleSenha(btnOlhoSenha, inputSenha)
  })
}

if (btnOlhoConfirmar && inputConfirmar) {
  btnOlhoConfirmar.addEventListener('click', () => {
    toggleSenha(btnOlhoConfirmar, inputConfirmar)
  })
}


inputCPF?.addEventListener('input', () => {
  inputCPF.value = formatarCPF(inputCPF.value)
})

inputWhatsApp?.addEventListener('input', () => {
  inputWhatsApp.value = formatarWhatsApp(inputWhatsApp.value)
})


form?.addEventListener('submit', async (e: SubmitEvent) => {
  e.preventDefault()
  showFeedback(form, null)
  if (inputSenha!.value !== inputConfirmar!.value) {
    showFeedback(form, 'As senhas não conferem. Verifique e tente novamente.', 'erro')
    inputConfirmar!.focus()
    return
  }

  setLoading(btnSubmit!, true)

  try {
    const dto = {
      username: inputNome!.value.trim(),
      email: inputEmail!.value.trim(),
      password: inputSenha!.value,
      whatsapp: apenasDigitos(inputWhatsApp!.value),
      cpf: apenasDigitos(inputCPF!.value),
      endereco: inputEndereco!.value.trim(),
    }
    const { jwt, user } = await usuarioService.registrar(dto)

    salvarSessao(jwt, user)
    window.location.href = 'index.html'

  } catch (err) {
    if (err instanceof HttpError) {
      const mensagem = extrairMensagemStrapi(err.body) ??
        `Erro inesperado (${err.status}). Tente novamente.`
      showFeedback(form, mensagem, 'erro')
    } else {
      showFeedback(form, 'Sem conexão com o servidor. Verifique a internet.', 'erro')
    }

  } finally {
    setLoading(btnSubmit!, false)
  }
})

// ─── Helper: extrai mensagem legível do corpo de erro do Strapi ──────────────

function extrairMensagemStrapi(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null

  const b = body as Record<string, unknown>

  // Formato: { error: { message: "..." } }
  if (b['error'] && typeof b['error'] === 'object') {
    const erro = b['error'] as Record<string, unknown>
    if (typeof erro['message'] === 'string') {
      return traduzirErroStrapi(erro['message'])
    }
  }

  // Formato: { message: [{ messages: [{ message: "..." }] }] }
  if (Array.isArray(b['message'])) {
    const primeiro = (b['message'] as unknown[])[0]
    if (primeiro && typeof primeiro === 'object') {
      const msgs = (primeiro as Record<string, unknown>)['messages']
      if (Array.isArray(msgs) && msgs.length > 0) {
        const m = (msgs[0] as Record<string, unknown>)['message']
        if (typeof m === 'string') return traduzirErroStrapi(m)
      }
    }
  }

  return null
}

//Traduz as mensagens de erro mais comuns do Strapi para português.
function traduzirErroStrapi(msg: string): string {
  const errosConhecidos: Record<string, string> = {
    'Email or Username are already taken.': 'Este e-mail já está cadastrado.',
    'email must be a valid email': 'Informe um endereço de e-mail válido.',
    'username must be at least 3 characters': 'O nome deve ter ao menos 3 caracteres.',
  }

  for (const [chave, traducao] of Object.entries(errosConhecidos)) {
    if (msg.toLowerCase().includes(chave.toLowerCase())) return traducao
  }

  if (msg.toLowerCase().includes('unique')) {
    return 'Um dos seus dados (e-mail, CPF ou WhatsApp) já está em uso.'
  }

  return msg
}
