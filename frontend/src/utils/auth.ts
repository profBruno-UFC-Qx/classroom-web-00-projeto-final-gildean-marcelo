import { PerfilUsuario, type LoginResponse } from '@/services/UsuarioService'

const CHAVE_TOKEN = 'strapi_token'
const CHAVE_USER = 'strapi_user'

const LOGIN_URL = '/src/pages/user/login.html'
const ADMIN_DASHBOARD_URL = '/src/pages/admin/dashboard.html'


export function salvarSessao(jwt: string, user: LoginResponse['user']): void {
  localStorage.setItem(CHAVE_TOKEN, jwt)
  localStorage.setItem(CHAVE_USER, JSON.stringify(user))
}

export function limparSessao(): void {
  localStorage.removeItem(CHAVE_TOKEN)
  localStorage.removeItem(CHAVE_USER)
}


export function getToken(): string | null {
  return localStorage.getItem(CHAVE_TOKEN)
}
export function getUsuarioLogado(): LoginResponse['user'] | null {
  const raw = localStorage.getItem(CHAVE_USER)
  if (!raw) return null

  try {
    return JSON.parse(raw) as LoginResponse['user']
  } catch {
    limparSessao()
    return null
  }
}


export function setUsuarioLogado(user: LoginResponse['user']): void {
  localStorage.setItem(CHAVE_USER, JSON.stringify(user))
}

export function isAutenticado(): boolean {
  return getToken() !== null && getUsuarioLogado() !== null
}


/**
 * Destino pós-login: admin cai direto no dashboard administrativo,
 * demais perfis (cliente/cozinha) vão para o app do cliente.
 */
export function getDestinoPosLogin(user: LoginResponse['user'] | null): string {
  return user?.perfil === PerfilUsuario.Admin ? ADMIN_DASHBOARD_URL : '/index.html'
}

export function redirecionarSeLogado(destino?: string): void {
  if (isAutenticado()) {
    window.location.replace(destino ?? getDestinoPosLogin(getUsuarioLogado()))
  }
}

import { showModal } from './ui'

/**
 * Guard síncrono para páginas administrativas: exige usuário autenticado
 * cujo `perfil` esteja em `perfisPermitidos`. Redireciona e retorna false
 * caso contrário — chame no topo do script da página, antes de qualquer
 * manipulação de DOM.
 */
export function verificarAcessoAdmin(
  perfisPermitidos: PerfilUsuario[] = [PerfilUsuario.Admin]
): boolean {
  if (!isAutenticado()) {
    window.location.replace(LOGIN_URL)
    return false
  }

  const user = getUsuarioLogado()
  if (!user || !perfisPermitidos.includes(user.perfil)) {
    window.location.replace('/index.html')
    return false
  }

  return true
}

export async function verificarAcessoRestrito(destinoHome = '/index.html', destinoLogin = '/src/pages/user/login.html'): Promise<boolean> {
  if (isAutenticado()) {
    return true
  }

  const clickedAcao = await showModal(
    'Login Necessário',
    'Para acessar esta página, por favor faça login ou crie uma conta.',
    'aviso',
    {
      labelOk: 'Voltar para Home',
      labelAcao: 'Fazer Login',
      onAcao: () => {
        window.location.replace(destinoLogin)
      }
    }
  )

  if (!clickedAcao) {
    window.location.replace(destinoHome)
  }
  return false
}

export function setupLogoutButton(): void {
  const btnLogout = document.getElementById('btn-logout')
  const btnLogin = document.getElementById('btn-login')

  const isAuth = isAutenticado()

  if (btnLogout) {
    if (!isAuth) {
      btnLogout.style.display = 'none'
    } else {
      btnLogout.addEventListener('click', (e) => {
        e.preventDefault()
        limparSessao()
        window.location.replace('/index.html')
      })
    }
  }

  if (btnLogin) {
    if (isAuth) {
      btnLogin.style.display = 'none'
    }
  }
}

// Inicializa globalmente se o botão existir
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', setupLogoutButton)
}
