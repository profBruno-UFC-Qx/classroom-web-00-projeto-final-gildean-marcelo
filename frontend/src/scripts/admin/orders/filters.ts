import { state } from "./state";
import type { DateFilter, StatusFilter } from "./types";

// =============================================================================
// EVENT HANDLERS
// =============================================================================

let searchTimeout: ReturnType<typeof setTimeout>;

export function attachSearchListener(onReload: () => void): void {
  const input = document.getElementById("search-input") as HTMLInputElement | null;
  if (!input) return;
  input.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = input.value.trim();
      state.currentPage = 1;
      onReload();
    }, 300);
  });
}

function toggleDropdown(which: "status" | "date"): void {
  const isOpen = state.activeDropdown === which;
  closeAllDropdowns();
  if (!isOpen) {
    const dropdownId = which === "status" ? "status-dropdown" : "date-dropdown";
    const btnId      = which === "status" ? "btn-status-filter" : "btn-date-filter";
    document.getElementById(dropdownId)?.removeAttribute("hidden");
    document.getElementById(btnId)?.setAttribute("aria-expanded", "true");
    state.activeDropdown = which;
  }
}

function closeAllDropdowns(): void {
  ["status-dropdown", "date-dropdown"].forEach((id)  => document.getElementById(id)?.setAttribute("hidden", ""));
  ["btn-status-filter", "btn-date-filter"].forEach((id) => document.getElementById(id)?.setAttribute("aria-expanded", "false"));
  state.activeDropdown = null;
}

export function attachFilterListeners(onReload: () => void): void {
  document.getElementById("btn-status-filter")?.addEventListener("click", (e) => { e.stopPropagation(); toggleDropdown("status"); });
  document.getElementById("btn-date-filter")?.addEventListener("click",   (e) => { e.stopPropagation(); toggleDropdown("date"); });

  document.querySelectorAll<HTMLLIElement>("#status-dropdown [data-value]").forEach((item) => {
    item.addEventListener("click", () => {
      document.querySelectorAll("#status-dropdown [data-value]").forEach((el) => { el.classList.remove("filter-dropdown__item--active"); el.setAttribute("aria-selected", "false"); });
      item.classList.add("filter-dropdown__item--active");
      item.setAttribute("aria-selected", "true");
      const label = document.getElementById("status-filter-label");
      if (label) label.textContent = item.textContent?.trim() ?? "Todos os Status";
      state.statusFilter = item.dataset.value as StatusFilter;
      state.currentPage  = 1;
      closeAllDropdowns();
      onReload();
    });
  });

  document.querySelectorAll<HTMLLIElement>("#date-dropdown [data-value]").forEach((item) => {
    item.addEventListener("click", () => {
      document.querySelectorAll("#date-dropdown [data-value]").forEach((el) => { el.classList.remove("filter-dropdown__item--active"); el.setAttribute("aria-selected", "false"); });
      item.classList.add("filter-dropdown__item--active");
      item.setAttribute("aria-selected", "true");
      const label = document.getElementById("date-filter-label");
      if (label) label.textContent = item.textContent?.trim() ?? "Hoje";
      state.dateFilter  = item.dataset.value as DateFilter;
      state.currentPage = 1;
      closeAllDropdowns();
      onReload();
    });
  });

  document.addEventListener("click", () => closeAllDropdowns());
}
