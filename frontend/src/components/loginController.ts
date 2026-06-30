import { usuarioService } from '@/services/UsuarioService'
import { salvarSessao, redirecionarSeLogado } from '@/utils/auth'
import { toggleSenha, setLoading, showFeedback } from '@/utils/ui'
import { HttpError } from '@/api/HttpClient'


redirecionarSeLogado()


const form = document.querySelector<HTMLFormElement>('#form-login')
const inputEmail = document.querySelector<HTMLInputElement>('#email')
const inputSenha = document.querySelector<HTMLInputElement>('#senha')
const btnSubmit = form?.querySelector<HTMLButtonElement>('button[type="submit"]')
const btnOlho = document.querySelector<HTMLButtonElement>('.input-acao-btn')


if (!form || !inputEmail || !inputSenha || !btnSubmit) {
  console.error('[loginController] Elementos do DOM não encontrados. Verifique os IDs no login.html.')
}


if (btnOlho && inputSenha) {
  btnOlho.addEventListener('click', () => {
    toggleSenha(btnOlho, inputSenha)
  })
}



form?.addEventListener('submit', async (e: SubmitEvent) => {
  e.preventDefault()

  showFeedback(form, null)

  const email = inputEmail!.value.trim()
  const senha = inputSenha!.value

  if (!email || !senha) return

  setLoading(btnSubmit!, true)

  try {
    const { jwt, user } = await usuarioService.login(email, senha)
    salvarSessao(jwt, user)
    window.location.href = '/index.html'

  } catch (err) {
    if (err instanceof HttpError) {
      // 400 / 401
      if (err.status === 400 || err.status === 401) {
        showFeedback(form, 'E-mail ou senha incorretos. Tente novamente.', 'erro')
      } else {
        showFeedback(form, `Erro inesperado (${err.status}). Tente novamente.`, 'erro')
      }
    } else {
      showFeedback(form, 'Sem conexão com o servidor. Verifique sua internet.', 'erro')
    }

  } finally {
    setLoading(btnSubmit!, false)
  }
})
