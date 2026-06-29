import type { LoginResponse } from '@/services/UsuarioService'

const CHAVE_TOKEN = 'strapi_token'
const CHAVE_USER = 'strapi_user'


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


export function redirecionarSeLogado(destino = '/index.html'): void {
  if (isAutenticado()) {
    window.location.replace(destino)
  }
}

import { showModal } from './ui'

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
