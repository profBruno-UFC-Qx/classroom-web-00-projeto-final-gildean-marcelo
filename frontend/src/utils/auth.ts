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


export function isAutenticado(): boolean {
  return getToken() !== null && getUsuarioLogado() !== null
}


export function redirecionarSeLogado(destino = 'index.html'): void {
  if (isAutenticado()) {
    window.location.replace(destino)
  }
}
