import { HistoricoPedidoService } from "./service";
import { state } from "./state";
import { renderTable } from "./table";

// =============================================================================
// LOAD & RENDER  (busca da API + re-renderiza)
// =============================================================================

export async function loadAndRender(): Promise<void> {
  const loading = document.getElementById("orders-loading") as HTMLElement | null;
  const wrapper = document.getElementById("table-wrapper")  as HTMLElement | null;
  const empty   = document.getElementById("orders-empty")   as HTMLElement | null;
  if (!loading || !wrapper || !empty) return;

  state.isLoading = true;
  loading.hidden  = false;
  wrapper.hidden  = true;
  empty.hidden    = true;

  try {
    const result = await HistoricoPedidoService.getOrders({
      page:       state.currentPage,
      pageSize:   state.pageSize,
      search:     state.searchQuery || undefined,
      status:     state.statusFilter,
      dateFilter: state.dateFilter,
    });

    state.orders      = result.data;
    state.totalOrders = result.total;
    state.totalPages  = result.totalPages;

    wrapper.hidden = result.data.length === 0;
    renderTable(loadAndRender);
  } catch (err) {
    console.error("[Orders] Falha ao carregar pedidos:", err);
    // TODO: exibir estado de erro
  } finally {
    state.isLoading = false;
    loading.hidden  = true;
  }
}
