
import {
  pedidoService,
  SituacaoPedido,
  TipoEntrega,
  FormaPagamento,
  type PedidoEntity,
} from "@/services/PedidoService";
import { verificarAcessoAdmin, getUsuarioLogado, limparSessao } from "@/utils/auth";
import { PerfilUsuario } from "@/services/UsuarioService";

if (!verificarAcessoAdmin([PerfilUsuario.Admin])) {
  throw new Error("Acesso restrito a administradores.");
}

// =============================================================================
// TYPES  (internos — independentes do shape do Strapi)
// =============================================================================

// Todos os status do Strapi representados na UI
type PedidoStatus    = "new" | "preparing" | "ready" | "delivered" | "cancelled";
type PedidoTipo      = "Delivery" | "Balcão";
type PedidoPagamento = "pix" | "card";
type StatusFilter    = PedidoStatus | "all";
type DateFilter      = "today" | "week" | "month";

interface Pedido {
  id:       string;
  number:   number;
  datetime: string;
  customer: string;
  type:     PedidoTipo;
  payment:  PedidoPagamento;
  total:    number;
  status:   PedidoStatus;
}

interface PedidoItem {
  id:        string;
  name:      string;
  quantity:  number;
  unitPrice: number;
}

interface PedidoDetail extends Pedido {
  deliveryAddress?: string;  // usuario.endereco — [3]
  tableInfo?:       string;  // reservado para quando TipoEntrega.Salao existir
  items:            PedidoItem[];
  notes?:           string;  // observacao_geral
}

interface PaginatedResult<T> {
  data:       T[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}

interface GetOrdersParams {
  page:        number;
  pageSize:    number;
  search?:     string;
  status?:     StatusFilter;
  dateFilter?: DateFilter;
}

// =============================================================================
// MAPPERS  Strapi → tipos internos
// =============================================================================

function mapSituacaoToStatus(s: SituacaoPedido): PedidoStatus {
  switch (s) {
    case SituacaoPedido.Recebido:   return "new";
    case SituacaoPedido.Preparando: return "preparing";
    case SituacaoPedido.Pronto:     return "ready";
    case SituacaoPedido.Entregue:   return "delivered";
    case SituacaoPedido.Cancelado:  return "cancelled";
    default:                        return "new";
  }
}

function mapStatusToSituacao(s: PedidoStatus): SituacaoPedido | null {
  switch (s) {
    case "new":       return SituacaoPedido.Recebido;
    case "preparing": return SituacaoPedido.Preparando;
    case "ready":     return SituacaoPedido.Pronto;
    case "delivered": return SituacaoPedido.Entregue;
    case "cancelled": return SituacaoPedido.Cancelado;
    default:          return null;
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const hh = d.getHours().toString().padStart(2, "0");
  const mi = d.getMinutes().toString().padStart(2, "0");
  return `${dd}/${mm} - ${hh}:${mi}`;
}

function mapEntityToPedido(entity: PedidoEntity): Pedido {
  const usuario = entity.users_permissions_user;
  return {
    id:       String(entity.id),
    number:   entity.id,
    datetime: formatDateTime(entity.createdAt),
    customer: usuario?.username ?? "Cliente",
    type:     entity.tipo_entrega === TipoEntrega.Delivery ? "Delivery" : "Balcão",
    payment:  entity.forma_pagamento === FormaPagamento.Pix ? "pix" : "card",
    total:    entity.total,
    status:   mapSituacaoToStatus(entity.situacao),
  };
}

function mapEntityToPedidoDetail(entity: PedidoEntity): PedidoDetail {
  const base    = mapEntityToPedido(entity);
  const usuario = entity.users_permissions_user;

  return {
    ...base,
    // endereco_entrega é o campo gravado no próprio pedido no momento da
    // compra; cai para o endereço do perfil do usuário como fallback.
    deliveryAddress:
      entity.tipo_entrega === TipoEntrega.Delivery
        ? (entity.endereco_entrega ?? usuario?.endereco ?? undefined)
        : undefined,
    items: (entity.item_pedidos ?? []).map((item) => ({
      id:        String(item.id),
      name:      item.produto?.nome ?? "(produto)",
      quantity:  item.quantidade,
      unitPrice: item.preco_unitario_cobrado,
    })),
    notes: entity.observacao_geral ?? undefined,
  };
}

// =============================================================================
// SERVICE LAYER  (fina camada sobre pedidoService)
// =============================================================================

const HistoricoPedidoService = {
  /**
   * Lista pedidos com paginação e filtros.
   * Mapeia os parâmetros internos da UI para a query do Strapi.
   *
   * Endpoint: GET /api/pedidos (herdado de StrapiCrudService.list) — [6]
   */
  async getOrders(params: GetOrdersParams): Promise<PaginatedResult<Pedido>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filters: Record<string, any> = {};

    // ── Filtro de status ────────────────────────────────────────────────
    if (params.status && params.status !== "all") {
      const situacao = mapStatusToSituacao(params.status);
      if (situacao) filters.situacao = { $eq: situacao };
    }

    // ── Filtro de data ──────────────────────────────────────────────────
    if (params.dateFilter) {
      const now   = new Date();
      const start = new Date(now);

      if (params.dateFilter === "today") {
        start.setHours(0, 0, 0, 0);
      } else if (params.dateFilter === "week") {
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
      } else if (params.dateFilter === "month") {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
      }

      filters.createdAt = { $gte: start.toISOString() };
    }

    // ── Busca — [1] [2] ─────────────────────────────────────────────────
    // Se o termo for numérico → busca por ID do pedido.
    // Se for texto → busca por username do cliente.
    // Para buscar os dois juntos em uma query, adicione suporte a $or no
    // buildQueryParams do StrapiCrudService.
    if (params.search) {
      const cleaned  = params.search.replace("#", "").trim();
      const asNumber = Number(cleaned);

      if (!isNaN(asNumber) && cleaned !== "") {
        filters.id = { $eq: asNumber };                                   // [2]
      } else {
        filters.users_permissions_user = { username: { $containsi: cleaned } }; // [1]
      }
    }

    const result = await pedidoService.list({
      pagination: { page: params.page, pageSize: params.pageSize },
      filters,
      populate:   ["users_permissions_user"],
      sort:       ["createdAt:desc"],
    });

    return {
      data:       result.data.map(mapEntityToPedido),
      total:      result.pagination.total,
      page:       result.pagination.page,
      pageSize:   result.pagination.pageSize,
      totalPages: result.pagination.pageCount,
    };
  },

  /**
   * Detalhe completo de um pedido (com itens e produto populados).
   * Endpoint: GET /api/pedidos/:id?populate=usuario,itens,itens.produto
   */
  async getOrderDetail(id: string): Promise<PedidoDetail | undefined> {
    try {
      const entity = await pedidoService.getWithRelations(Number(id));
      return mapEntityToPedidoDetail(entity);
    } catch {
      return undefined;
    }
  },

  /**
   * Cancela / estorna um pedido.
   * Endpoint: PUT /api/pedidos/:id  { situacao: "cancelado" }
   */
  async cancelOrder(id: string): Promise<void> {
    await pedidoService.cancelar(Number(id));
  },

  /**
   * Reimprimir comanda.
   * [4] Endpoint customizado não existe ainda — usando window.print() temporariamente.
   * Para implementar no Strapi:
   *   1. Crie src/api/pedido/routes/custom.ts com POST /api/pedidos/:id/reimprimir
   *   2. Implemente o controller que aciona a impressora (node-thermal-printer, etc.)
   *   3. Substitua window.print() pela chamada httpClient.post abaixo:
   *      await httpClient.post(`/api/pedidos/${id}/reimprimir`)
   */
  async reprintOrder(id: string): Promise<void> {
    console.log(`[Orders] Reimprimir pedido ${id}`);
    window.print(); // [4] substituir pelo endpoint customizado
  },
};

// =============================================================================
// STATE
// =============================================================================

interface OrdersPageState {
  orders:             Pedido[];
  currentPage:        number;
  totalOrders:        number;
  pageSize:           number;
  totalPages:         number;
  searchQuery:        string;
  statusFilter:       StatusFilter;
  dateFilter:         DateFilter;
  isLoading:          boolean;
  activeDropdown:     "status" | "date" | null;
  activeOrderId:      string | null;
  activeOrderDetail:  PedidoDetail | null;
}

const state: OrdersPageState = {
  orders:            [],
  currentPage:       1,
  totalOrders:       0,
  pageSize:          10,
  totalPages:        1,
  searchQuery:       "",
  statusFilter:      "all",
  dateFilter:        "today",
  isLoading:         false,
  activeDropdown:    null,
  activeOrderId:     null,
  activeOrderDetail: null,
};

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// =============================================================================
// TABLE RENDERERS
// =============================================================================

function renderTypeBadge(type: PedidoTipo): string {
  const config: Record<PedidoTipo, { cls: string; icon: string }> = {
    Delivery: { cls: "type-badge--delivery", icon: "two_wheeler"  },
    Balcão:   { cls: "type-badge--balcao",   icon: "storefront"   },
  };
  const { cls, icon } = config[type];
  return `<span class="type-badge ${cls}">
    <span class="material-symbols-outlined type-badge__icon" aria-hidden="true">${icon}</span>${type}
  </span>`;
}

function renderStatusChip(status: PedidoStatus): string {
  const config: Record<PedidoStatus, { cls: string; label: string }> = {
    new:       { cls: "status-chip--new",       label: "Recebido"  },
    preparing: { cls: "status-chip--preparing", label: "Em Preparo"},
    ready:     { cls: "status-chip--ready",     label: "Pronto"    },
    delivered: { cls: "status-chip--completed", label: "Entregue"  },
    cancelled: { cls: "status-chip--cancelled", label: "Cancelado" },
  };
  const { cls, label } = config[status];
  return `<span class="status-chip ${cls}">
    <span class="status-chip__dot" aria-hidden="true"></span>${label}
  </span>`;
}

function renderPayment(payment: PedidoPagamento): string {
  const config: Record<PedidoPagamento, { icon: string; label: string }> = {
    pix:  { icon: "pix",         label: "Pix"    },
    card: { icon: "credit_card", label: "Cartão" },
  };
  const { icon, label } = config[payment];
  return `<span class="orders-table__payment">
    <span class="material-symbols-outlined orders-table__payment-icon" aria-hidden="true">${icon}</span>${label}
  </span>`;
}

function renderRow(order: Pedido): string {
  return `
    <tr data-order-id="${order.id}">
      <td class="orders-table__td"><span class="orders-table__number">#${order.number}</span></td>
      <td class="orders-table__td">${order.datetime}</td>
      <td class="orders-table__td"><span class="orders-table__customer">${order.customer}</span></td>
      <td class="orders-table__td">${renderTypeBadge(order.type)}</td>
      <td class="orders-table__td">${renderPayment(order.payment)}</td>
      <td class="orders-table__td"><span class="orders-table__total">${formatCurrency(order.total)}</span></td>
      <td class="orders-table__td">${renderStatusChip(order.status)}</td>
      <td class="orders-table__td orders-table__action">
        <button class="btn-view" data-action="view" data-id="${order.id}"
          aria-label="Ver detalhes do pedido #${order.number}">
          <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
        </button>
      </td>
    </tr>`;
}

// =============================================================================
// MODAL RENDERERS
// =============================================================================

function renderModalBody(detail: PedidoDetail): string {
  let locationSection = "";

  if (detail.type === "Delivery" && detail.deliveryAddress) {
    locationSection = `
      <section aria-label="Endereço de entrega">
        <p class="order-modal__section-label">Endereço de Entrega</p>
        <div class="order-modal__address">
          <span class="material-symbols-outlined order-modal__address-icon" aria-hidden="true">location_on</span>
          <p class="order-modal__address-text">${detail.deliveryAddress}</p>
        </div>
      </section>`;
  } else if (detail.type === "Delivery" && !detail.deliveryAddress) {
    // [3] endereço não cadastrado no perfil do usuário
    locationSection = `
      <section aria-label="Endereço de entrega">
        <p class="order-modal__section-label">Endereço de Entrega</p>
        <p style="font-size:var(--fs-body-md);color:var(--color-on-surface-variant);">
          Endereço não cadastrado no perfil do cliente.
        </p>
      </section>`;
  }

  const notesSection = detail.notes
    ? `<section aria-label="Observações">
         <p class="order-modal__section-label">Observações</p>
         <p class="order-modal__address-text">${detail.notes}</p>
       </section>`
    : "";

  const itemsHtml = detail.items.map((item) => `
    <div class="order-modal__item">
      <span class="order-modal__item-name">${item.quantity}x ${item.name}</span>
      <span class="order-modal__item-price">${formatCurrency(item.unitPrice * item.quantity)}</span>
    </div>`).join("");

  return `
    ${locationSection}
    ${notesSection}
    <section aria-label="Resumo dos itens">
      <p class="order-modal__section-label">Resumo dos Itens</p>
      <div class="order-modal__items">
        ${itemsHtml}
        <div class="order-modal__total">
          <span class="order-modal__total-label">Total</span>
          <span class="order-modal__total-value">${formatCurrency(detail.total)}</span>
        </div>
      </div>
    </section>`;
}

// =============================================================================
// MODAL LOGIC
// =============================================================================

function getModalEl(): HTMLDialogElement | null {
  return document.getElementById("order-detail-modal") as HTMLDialogElement | null;
}

async function openModal(orderId: string): Promise<void> {
  const modal      = getModalEl();
  const body       = document.getElementById("modal-body");
  const title      = document.getElementById("modal-title");
  const cancelBtn  = document.getElementById("btn-cancel-order") as HTMLButtonElement | null;

  if (!modal || !body || !title) return;

  state.activeOrderId    = orderId;
  state.activeOrderDetail = null;

  // Skeleton enquanto carrega
  body.innerHTML = `<div class="order-modal__skeleton" aria-busy="true">
    <div class="skeleton-line skeleton-line--short"></div>
    <div class="skeleton-line"></div>
    <div class="skeleton-line"></div>
    <div class="skeleton-line skeleton-line--short"></div>
  </div>`;
  title.textContent = "Carregando…";
  modal.showModal();

  try {
    const detail = await HistoricoPedidoService.getOrderDetail(orderId);
    if (!detail) throw new Error("Pedido não encontrado");

    state.activeOrderDetail = detail;
    title.textContent       = `Detalhes do Pedido #${detail.number}`;
    body.innerHTML          = renderModalBody(detail);

    // [5] Botão cancelar — desabilitado para status terminais
    if (cancelBtn) {
      const isTerminal = detail.status === "cancelled"
        || detail.status === "delivered"
        || detail.status === "ready";
      cancelBtn.disabled = isTerminal;
      cancelBtn.title    = isTerminal ? "Este pedido já foi finalizado" : "";
    }
  } catch (err) {
    console.error("[Orders] Falha ao carregar detalhe:", err);
    body.innerHTML    = `<p style="color:var(--color-error);font-size:var(--fs-body-md)">
      Não foi possível carregar os detalhes. Tente novamente.
    </p>`;
    title.textContent = "Erro";
  }
}

function closeModal(): void {
  getModalEl()?.close();
  state.activeOrderId    = null;
  state.activeOrderDetail = null;
}

function attachModalListeners(): void {
  const modal          = getModalEl();
  const closeBtn       = document.getElementById("btn-modal-close");
  const reprintBtn     = document.getElementById("btn-reprint")      as HTMLButtonElement | null;
  const cancelOrderBtn = document.getElementById("btn-cancel-order") as HTMLButtonElement | null;

  if (!modal) return;

  closeBtn?.addEventListener("click", closeModal);
  modal.addEventListener("click",  (e) => { if (e.target === modal) closeModal(); });
  modal.addEventListener("cancel", () => { state.activeOrderId = null; state.activeOrderDetail = null; });

  reprintBtn?.addEventListener("click", async () => {
    if (!state.activeOrderId) return;
    reprintBtn.disabled = true;
    try {
      await HistoricoPedidoService.reprintOrder(state.activeOrderId);
    } catch (err) {
      console.error("[Orders] Reprint falhou:", err);
    } finally {
      reprintBtn.disabled = false;
    }
  });

  cancelOrderBtn?.addEventListener("click", async () => {
    if (!state.activeOrderId || !state.activeOrderDetail) return;
    if (!confirm(`Confirmar cancelamento do pedido #${state.activeOrderDetail.number}?`)) return;

    cancelOrderBtn.disabled = true;
    try {
      await HistoricoPedidoService.cancelOrder(state.activeOrderId);

      // Atualiza status localmente sem aguardar reload
      const inList = state.orders.find((o) => o.id === state.activeOrderId);
      if (inList) inList.status = "cancelled";

      closeModal();
      renderTable();
    } catch (err) {
      console.error("[Orders] Cancelamento falhou:", err);
      cancelOrderBtn.disabled = false;
    }
  });
}

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

function renderPagination(): void {
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
        loadAndRender();
      }
    });
  });
}

// =============================================================================
// TABLE RENDER  (atualiza só tbody sem recarregar da API)
// =============================================================================

function renderTable(): void {
  const tbody = document.getElementById("orders-tbody") as HTMLTableSectionElement | null;
  const empty = document.getElementById("orders-empty") as HTMLElement | null;
  if (!tbody || !empty) return;

  if (state.orders.length === 0) {
    empty.hidden = false;
  } else {
    tbody.innerHTML = state.orders.map(renderRow).join("");
    empty.hidden    = true;
    attachRowListeners();
  }

  renderPagination();
}

// =============================================================================
// LOAD & RENDER  (busca da API + re-renderiza)
// =============================================================================

async function loadAndRender(): Promise<void> {
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
    renderTable();
  } catch (err) {
    console.error("[Orders] Falha ao carregar pedidos:", err);
    // TODO: exibir estado de erro
  } finally {
    state.isLoading = false;
    loading.hidden  = true;
  }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

function attachRowListeners(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-action='view']").forEach((btn) => {
    btn.addEventListener("click", () => { const id = btn.dataset.id; if (id) openModal(id); });
  });
}

let searchTimeout: ReturnType<typeof setTimeout>;

function attachSearchListener(): void {
  const input = document.getElementById("search-input") as HTMLInputElement | null;
  if (!input) return;
  input.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = input.value.trim();
      state.currentPage = 1;
      loadAndRender();
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

function attachFilterListeners(): void {
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
      loadAndRender();
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
      loadAndRender();
    });
  });

  document.addEventListener("click", () => closeAllDropdowns());
}

const PERFIL_LABEL: Record<string, string> = {
  admin: "Administrador",
  cozinha: "Cozinha",
  cliente: "Cliente",
};

function renderSidebarUser(): void {
  const user = getUsuarioLogado();
  if (!user) return;
  const nameEl = document.querySelector<HTMLElement>(".sidebar__user-name");
  const roleEl = document.querySelector<HTMLElement>(".sidebar__user-role");
  if (nameEl) nameEl.textContent = user.username;
  if (roleEl) roleEl.textContent = PERFIL_LABEL[user.perfil] ?? user.perfil;
}

function attachNavListeners(): void {
  document.querySelectorAll<HTMLAnchorElement>(".sidebar__nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".sidebar__nav-item").forEach((el) => { el.classList.remove("sidebar__nav-item--active"); el.removeAttribute("aria-current"); });
      item.classList.add("sidebar__nav-item--active");
      item.setAttribute("aria-current", "page");
    });
  });
  document.getElementById("btn-logout")?.addEventListener("click", () => {
    limparSessao();
    window.location.href = "/src/pages/user/login.html";
  });
  document.getElementById("btn-notifications")?.addEventListener("click", () => console.log("[Orders] Notificações"));
  document.getElementById("sidebar-user")?.addEventListener("click",      () => console.log("[Orders] Perfil"));
}

// =============================================================================
// BOOTSTRAP
// =============================================================================

async function init(): Promise<void> {
  attachNavListeners();
  renderSidebarUser();
  attachSearchListener();
  attachFilterListeners();
  attachModalListeners();
  await loadAndRender();
}

document.addEventListener("DOMContentLoaded", init);