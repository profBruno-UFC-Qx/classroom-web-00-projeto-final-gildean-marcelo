import { state } from "./state";

// =============================================================================
// PAGINATION
// =============================================================================

function buildPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  const add  = (p: number) => { if (!pages.includes(p)) pages.push(p); };
  const dots = ()          => { if (pages[pages.length - 1] !== "...") pages.push("..."); };
  add(1);
  if (current > 3)         dots();
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) add(p);
  if (current < total - 2) dots();
  add(total);
  return pages;
}

/** onReload é chamado após a página ser trocada, para recarregar a tabela. */
export function renderPagination(onReload: () => void): void {
  const info     = document.getElementById("pagination-info");
  const controls = document.getElementById("pagination-controls");
  if (!info || !controls) return;

  const { currentPage, pageSize, totalOrders, totalPages, orders } = state;
  if (totalOrders === 0) { info.textContent = ""; controls.innerHTML = ""; return; }

  const start = (currentPage - 1) * pageSize + 1;
  const end   = Math.min(start + orders.length - 1, totalOrders);
  info.textContent = `Mostrando ${start} a ${end} de ${totalOrders} pedidos`;

  controls.innerHTML = `
    <button class="page-btn page-btn--nav" data-page="${currentPage - 1}"
      aria-label="Página anterior" ${currentPage <= 1 ? "disabled" : ""}>
      <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
    </button>
    ${buildPageRange(currentPage, totalPages).map((p) =>
      p === "..."
        ? `<span class="pagination__ellipsis" aria-hidden="true">…</span>`
        : `<button class="page-btn ${p === currentPage ? "page-btn--active" : ""}"
             data-page="${p}" aria-label="Página ${p}"
             ${p === currentPage ? 'aria-current="page"' : ""}>${p}</button>`
    ).join("")}
    <button class="page-btn page-btn--nav" data-page="${currentPage + 1}"
      aria-label="Próxima página" ${currentPage >= totalPages ? "disabled" : ""}>
      <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
    </button>`;

  controls.querySelectorAll<HTMLButtonElement>("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = Number(btn.dataset.page);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        state.currentPage = page;
        onReload();
      }
    });
  });
}
