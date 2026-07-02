/**
 * Helpers de DOM reutilizados pelas telas admin.
 */

export function el<T extends HTMLElement = HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector)
  if (!found) throw new Error(`Elemento não encontrado: ${selector}`)
  return found
}

export function elById<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id) as T | null
  if (!found) throw new Error(`Elemento não encontrado: #${id}`)
  return found
}

/** Escapa HTML para evitar XSS em innerHTML dinâmico. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delayMs)
  }
}
