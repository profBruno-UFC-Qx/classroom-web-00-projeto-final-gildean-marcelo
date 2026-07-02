/**
 * Sidebar/topbar compartilhados por todas as telas admin: nome/cargo do
 * usuário logado e botão de logout. Estrutura de DOM idêntica em todas
 * as páginas (.sidebar__user-name, .sidebar__user-role, #btn-logout).
 */

import { getUsuarioLogado, limparSessao } from '@/utils/auth'

const LOGIN_URL = '/src/pages/user/login.html'

export const PERFIL_LABEL: Record<string, string> = {
  admin: 'Administrador',
  cozinha: 'Cozinha',
  cliente: 'Cliente',
}

export function renderSidebarUser(): void {
  const user = getUsuarioLogado()
  if (!user) return
  const nameEl = document.querySelector<HTMLElement>('.sidebar__user-name')
  const roleEl = document.querySelector<HTMLElement>('.sidebar__user-role')
  if (nameEl) nameEl.textContent = user.username
  if (roleEl) roleEl.textContent = PERFIL_LABEL[user.perfil] ?? user.perfil
}

export function initLogoutButton(): void {
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    limparSessao()
    window.location.href = LOGIN_URL
  })
}

/** Conveniência: aplica os dois comportamentos acima de uma vez. */
export function initAdminTopbar(): void {
  renderSidebarUser()
  initLogoutButton()
}
