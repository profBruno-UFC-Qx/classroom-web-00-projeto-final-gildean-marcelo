export function showToast(message: string, type: 'success' | 'error'): void {
  document.querySelector('.toast')?.remove()
  const toast = document.createElement('div')
  toast.className = `toast toast--${type}`
  toast.setAttribute('role', 'status')
  toast.setAttribute('aria-live', 'polite')
  toast.innerHTML = `
    <span class="material-symbols-outlined toast__icon" aria-hidden="true">${type === 'success' ? 'check_circle' : 'error'}</span>
    <span>${message}</span>`
  document.body.appendChild(toast)
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('toast--visible')))
  setTimeout(() => {
    toast.classList.remove('toast--visible')
    setTimeout(() => toast.remove(), 300)
  }, 4500)
}
