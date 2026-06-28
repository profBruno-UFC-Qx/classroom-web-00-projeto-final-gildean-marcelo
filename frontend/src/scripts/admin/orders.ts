

// =============================================================================
// TYPES
// =============================================================================

type PedidoStatus    = "new" | "preparing" | "completed" | "cancelled";
type PedidoTipo      = "Delivery" | "Balcão" | "Salão";
type PedidoPagamento = "pix" | "card" | "cash";
type StatusFilter    = PedidoStatus | "all";
type DateFilter      = "today" | "week" | "month";

/** List-level data (returned by GET /api/pedidos) */
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

/** Single item inside an order */
interface PedidoItem {
  id:        string;
  name:      string;
  quantity:  number;
  unitPrice: number;
}

/**
 * Detail-level data (returned by GET /api/pedidos/:id).
 * Extends Pedido — the real API might return this as a separate, richer shape.
 */
interface PedidoDetail extends Pedido {
  deliveryAddress?: string;  // only for Delivery orders
  tableInfo?:       string;  // only for Salão orders (e.g. "Mesa 4")
  items:            PedidoItem[];
  notes?:           string;  // optional order-level observation
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
// MOCK DATA
// =============================================================================

const MOCK_ORDERS: Pedido[] = [
  { id: "ord-1042", number: 1042, datetime: "21/06 - 19:30", customer: "João Silva",     type: "Delivery", payment: "pix",  total: 44.00, status: "completed" },
  { id: "ord-1043", number: 1043, datetime: "21/06 - 19:45", customer: "Maria Oliveira", type: "Balcão",   payment: "card", total: 28.00, status: "preparing" },
  { id: "ord-1044", number: 1044, datetime: "21/06 - 20:10", customer: "Carlos Mendes",  type: "Delivery", payment: "cash", total: 52.00, status: "cancelled" },
  { id: "ord-1045", number: 1045, datetime: "21/06 - 20:25", customer: "Ana Costa",      type: "Salão",    payment: "card", total: 87.50, status: "completed" },
  { id: "ord-1046", number: 1046, datetime: "21/06 - 20:40", customer: "Pedro Santos",   type: "Delivery", payment: "pix",  total: 35.00, status: "new"       },
  { id: "ord-1047", number: 1047, datetime: "21/06 - 21:00", customer: "Lucia Ferreira", type: "Balcão",   payment: "cash", total: 19.90, status: "completed" },
  { id: "ord-1048", number: 1048, datetime: "21/06 - 21:15", customer: "Marcos Lima",    type: "Delivery", payment: "card", total: 63.00, status: "preparing" },
  { id: "ord-1049", number: 1049, datetime: "21/06 - 21:30", customer: "Paula Rocha",    type: "Salão",    payment: "pix",  total: 42.00, status: "completed" },
  { id: "ord-1050", number: 1050, datetime: "21/06 - 21:45", customer: "Roberto Alves",  type: "Balcão",   payment: "card", total: 31.00, status: "cancelled" },
  { id: "ord-1051", number: 1051, datetime: "21/06 - 22:00", customer: "Fernanda Dias",  type: "Delivery", payment: "pix",  total: 78.50, status: "new"       },
  { id: "ord-1052", number: 1052, datetime: "21/06 - 22:20", customer: "Bruno Cardoso",  type: "Salão",    payment: "cash", total: 94.00, status: "completed" },
  { id: "ord-1053", number: 1053, datetime: "21/06 - 22:35", customer: "Camila Torres",  type: "Delivery", payment: "card", total: 38.50, status: "preparing" },
];

/**
 * Extended detail data keyed by order ID.
 * In production this comes from GET /api/pedidos/:id.
 */
const MOCK_ORDER_DETAILS: Record<string, PedidoDetail> = {
  "ord-1042": {
    ...MOCK_ORDERS[0],
    deliveryAddress: "Rua das Flores, 123, Bairro Jardim, São Paulo - SP, CEP 01234-567",
    items: [
      { id: "i-1", name: "Locura de Cupim",      quantity: 1, unitPrice: 32.00 },
      { id: "i-2", name: "Suco de Laranja 500ml", quantity: 1, unitPrice: 12.00 },
    ],
  },
  "ord-1043": {
    ...MOCK_ORDERS[1],
    items: [
      { id: "i-3", name: "Danny's Classic Burger", quantity: 1, unitPrice: 28.00 },
    ],
  },
  "ord-1044": {
    ...MOCK_ORDERS[2],
    deliveryAddress: "Av. Paulista, 900, Bela Vista, São Paulo - SP, CEP 01310-100",
    items: [
      { id: "i-4", name: "Veggie Delight Sandwich", quantity: 1, unitPrice: 26.00 },
      { id: "i-5", name: "Água com Gás 500ml",      quantity: 2, unitPrice: 13.00 },
    ],
    notes: "Sem cebola no sanduíche",
  },
  "ord-1045": {
    ...MOCK_ORDERS[3],
    tableInfo: "Mesa 7",
    items: [
      { id: "i-6",  name: "Smash Burger Duplo",     quantity: 2, unitPrice: 36.00 },
      { id: "i-7",  name: "Batata Frita Grande",    quantity: 2, unitPrice: 14.00 },
      { id: "i-8",  name: "Refrigerante Lata",      quantity: 1, unitPrice:  7.50 },
    ],
  },
  "ord-1046": {
    ...MOCK_ORDERS[4],
    deliveryAddress: "Rua Augusta, 500, Consolação, São Paulo - SP, CEP 01305-000",
    items: [
      { id: "i-9",  name: "Combo Família (4 Burgers)", quantity: 1, unitPrice: 35.00 },
    ],
  },
  "ord-1047": {
    ...MOCK_ORDERS[5],
    items: [
      { id: "i-10", name: "X-Salada",               quantity: 1, unitPrice: 19.90 },
    ],
  },
  "ord-1048": {
    ...MOCK_ORDERS[6],
    deliveryAddress: "Rua Oscar Freire, 200, Jardins, São Paulo - SP, CEP 01426-000",
    items: [
      { id: "i-11", name: "Duplo B Burger",          quantity: 2, unitPrice: 25.00 },
      { id: "i-12", name: "Batata Frita Média",      quantity: 1, unitPrice: 13.00 },
    ],
  },
  "ord-1049": {
    ...MOCK_ORDERS[7],
    tableInfo: "Mesa 3",
    items: [
      { id: "i-13", name: "Salada Caesar",           quantity: 1, unitPrice: 28.00 },
      { id: "i-14", name: "Suco de Laranja 500ml",   quantity: 2, unitPrice:  7.00 },
    ],
  },
  "ord-1050": {
    ...MOCK_ORDERS[8],
    items: [
      { id: "i-15", name: "Locura de Cupim",         quantity: 1, unitPrice: 31.00 },
    ],
  },
  "ord-1051": {
    ...MOCK_ORDERS[9],
    deliveryAddress: "Al. Santos, 1420, Cerqueira César, São Paulo - SP, CEP 01418-002",
    items: [
      { id: "i-16", name: "Smash Burger Duplo",      quantity: 2, unitPrice: 36.00 },
      { id: "i-17", name: "Onion Rings",             quantity: 1, unitPrice:  6.50 },
    ],
  },
  "ord-1052": {
    ...MOCK_ORDERS[10],
    tableInfo: "Mesa 12",
    items: [
      { id: "i-18", name: "Combo Família (4 Burgers)", quantity: 1, unitPrice: 35.00 },
      { id: "i-19", name: "Batata Frita Grande",       quantity: 3, unitPrice: 14.00 },
      { id: "i-20", name: "Refrigerante Lata",         quantity: 3, unitPrice:  7.50 },
    ],
  },
  "ord-1053": {
    ...MOCK_ORDERS[11],
    deliveryAddress: "Rua Haddock Lobo, 300, Cerqueira César, São Paulo - SP, CEP 01414-001",
    items: [
      { id: "i-21", name: "Veggie Delight Sandwich",  quantity: 1, unitPrice: 26.00 },
      { id: "i-22", name: "Suco de Laranja 500ml",    quantity: 1, unitPrice: 12.00 },
    ],
  },
};

const MOCK_TOTAL = 156;

// =============================================================================
// SERVICE LAYER
// Replace each method body with a real fetch() call when connecting to an API.
// =============================================================================

const PedidoService = {
  /**
   * Paginated, filtered order list.
   *
   * TODO — replace with:
   *   const url = new URL("/api/pedidos", window.location.origin);
   *   url.searchParams.set("page",     String(params.page));
   *   url.searchParams.set("pageSize", String(params.pageSize));
   *   if (params.search)                       url.searchParams.set("search",     params.search);
   *   if (params.status && params.status !== "all") url.searchParams.set("status", params.status);
   *   if (params.dateFilter)                   url.searchParams.set("dateFilter", params.dateFilter);
   *   const res = await fetch(url, { headers: authHeaders() });
   *   if (!res.ok) throw new Error(await res.text());
   *   return res.json() as Promise<PaginatedResult<Pedido>>;
   */
  async getOrders(params: GetOrdersParams): Promise<PaginatedResult<Pedido>> {
    const filtered = MOCK_ORDERS.filter((o) => {
      const q = params.search?.toLowerCase() ?? "";
      const matchesSearch =
        !q ||
        o.customer.toLowerCase().includes(q) ||
        String(o.number).includes(q.replace("#", ""));
      const matchesStatus =
        !params.status || params.status === "all" || o.status === params.status;
      return matchesSearch && matchesStatus;
    });

    const realTotal = filtered.length < MOCK_ORDERS.length ? filtered.length : MOCK_TOTAL;
    const start     = (params.page - 1) * params.pageSize;
    const data      = filtered.slice(start, start + params.pageSize);

    return { data, total: realTotal, page: params.page, pageSize: params.pageSize, totalPages: Math.ceil(realTotal / params.pageSize) };
  },

  /**
   * Single order detail.
   *
   * TODO — replace with:
   *   const res = await fetch(`/api/pedidos/${id}`, { headers: authHeaders() });
   *   if (!res.ok) throw new Error(await res.text());
   *   return res.json() as Promise<PedidoDetail>;
   */
  async getOrderDetail(id: string): Promise<PedidoDetail | undefined> {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_ORDER_DETAILS[id];
  },

  /**
   * Cancel / reverse an order.
   *
   * TODO — replace with:
   *   const res = await fetch(`/api/pedidos/${id}/cancel`, {
   *     method:  "POST",
   *     headers: authHeaders(),
   *   });
   *   if (!res.ok) throw new Error(await res.text());
   */
  async cancelOrder(id: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 400));
    const order = MOCK_ORDERS.find((o) => o.id === id);
    if (order) order.status = "cancelled";
    if (MOCK_ORDER_DETAILS[id]) MOCK_ORDER_DETAILS[id].status = "cancelled";
  },

  /**
   * Reprint order receipt (triggers print job on backend).
   *
   * TODO — replace with:
   *   const res = await fetch(`/api/pedidos/${id}/reprint`, {
   *     method:  "POST",
   *     headers: authHeaders(),
   *   });
   *   if (!res.ok) throw new Error(await res.text());
   */
  async reprintOrder(id: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 300));
    console.log(`[Orders] Reprint requested for order ${id}`);
  },
};

// =============================================================================
// STATE
// =============================================================================

interface OrdersPageState {
  orders:          Pedido[];
  currentPage:     number;
  totalOrders:     number;
  pageSize:        number;
  totalPages:      number;
  searchQuery:     string;
  statusFilter:    StatusFilter;
  dateFilter:      DateFilter;
  isLoading:       boolean;
  activeDropdown:  "status" | "date" | null;
  activeOrderId:   string | null;   // which order is open in the modal
  activeOrderDetail: PedidoDetail | null;
}

const state: OrdersPageState = {
  orders:            [],
  currentPage:       1,
  totalOrders:       0,
  pageSize:          5,
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
  const config: Record<PedidoTipo, { cls: string; icon: string; label: string }> = {
    Delivery: { cls: "type-badge--delivery", icon: "two_wheeler",        label: "Delivery" },
    Balcão:   { cls: "type-badge--balcao",   icon: "storefront",         label: "Balcão"   },
    Salão:    { cls: "type-badge--salao",    icon: "table_restaurant",   label: "Salão"    },
  };
  const { cls, icon, label } = config[type];
  return `<span class="type-badge ${cls}">
    <span class="material-symbols-outlined type-badge__icon" aria-hidden="true">${icon}</span>${label}
  </span>`;
}

function renderStatusChip(status: PedidoStatus): string {
  const config: Record<PedidoStatus, { cls: string; label: string }> = {
    new:       { cls: "status-chip--new",       label: "Novo"       },
    preparing: { cls: "status-chip--preparing", label: "Em Preparo" },
    completed: { cls: "status-chip--completed", label: "Concluído"  },
    cancelled: { cls: "status-chip--cancelled", label: "Cancelado"  },
  };
  const { cls, label } = config[status];
  return `<span class="status-chip ${cls}">
    <span class="status-chip__dot" aria-hidden="true"></span>${label}
  </span>`;
}

function renderPayment(payment: PedidoPagamento): string {
  const config: Record<PedidoPagamento, { icon: string; label: string }> = {
    pix:  { icon: "pix",         label: "Pix"      },
    card: { icon: "credit_card", label: "Cartão"   },
    cash: { icon: "payments",    label: "Dinheiro" },
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
        <button
          class="btn-view"
          data-action="view"
          data-id="${order.id}"
          aria-label="Ver detalhes do pedido #${order.number}"
        >
          <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
        </button>
      </td>
    </tr>`;
}

// =============================================================================
// MODAL RENDERERS
// =============================================================================

function renderModalBody(detail: PedidoDetail): string {
  // Location section — Delivery has address, Salão has table info
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
  } else if (detail.type === "Salão" && detail.tableInfo) {
    locationSection = `
      <section aria-label="Mesa">
        <p class="order-modal__section-label">Mesa</p>
        <div class="order-modal__table-info">
          <span class="material-symbols-outlined order-modal__table-icon" aria-hidden="true">table_restaurant</span>
          <p class="order-modal__table-text">${detail.tableInfo}</p>
        </div>
      </section>`;
  }

  // Notes section (optional)
  const notesSection = detail.notes
    ? `<section aria-label="Observações">
         <p class="order-modal__section-label">Observações</p>
         <p class="order-modal__address-text">${detail.notes}</p>
       </section>`
    : "";

  // Items section
  const itemsHtml = detail.items.map((item) => `
    <div class="order-modal__item">
      <span class="order-modal__item-name">${item.quantity}x ${item.name}</span>
      <span class="order-modal__item-price">${formatCurrency(item.unitPrice * item.quantity)}</span>
    </div>`).join("");

  const itemsSection = `
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

  return `${locationSection}${notesSection}${itemsSection}`;
}

// =============================================================================
// MODAL LOGIC
// =============================================================================

function getModalEl(): HTMLDialogElement | null {
  return document.getElementById("order-detail-modal") as HTMLDialogElement | null;
}

async function openModal(orderId: string): Promise<void> {
  const modal   = getModalEl();
  const body    = document.getElementById("modal-body");
  const title   = document.getElementById("modal-title");
  const skeleton = document.getElementById("modal-skeleton");
  const cancelBtn = document.getElementById("btn-cancel-order") as HTMLButtonElement | null;

  if (!modal || !body || !title) return;

  // Store active order
  state.activeOrderId   = orderId;
  state.activeOrderDetail = null;

  // Show skeleton while loading
  body.innerHTML = `<div class="order-modal__skeleton" aria-busy="true">
    <div class="skeleton-line skeleton-line--short"></div>
    <div class="skeleton-line"></div>
    <div class="skeleton-line"></div>
    <div class="skeleton-line skeleton-line--short"></div>
  </div>`;

  title.textContent = "Carregando…";
  modal.showModal();

  try {
    const detail = await PedidoService.getOrderDetail(orderId);
    if (!detail) throw new Error("Pedido não encontrado");

    state.activeOrderDetail = detail;

    // Update title
    title.textContent = `Detalhes do Pedido #${detail.number}`;

    // Render content
    body.innerHTML = renderModalBody(detail);

    // Disable cancel button for already-terminal statuses
    if (cancelBtn) {
      const isTerminal = detail.status === "cancelled" || detail.status === "completed";
      cancelBtn.disabled = isTerminal;
      cancelBtn.title    = isTerminal ? "Este pedido já foi finalizado" : "";
    }
  } catch (err) {
    console.error("[Orders] Failed to load order detail:", err);
    body.innerHTML = `<p style="color:var(--color-error); font-size:var(--fs-body-md)">
      Não foi possível carregar os detalhes. Tente novamente.
    </p>`;
    title.textContent = "Erro";
  }
}

function closeModal(): void {
  const modal = getModalEl();
  modal?.close();
  state.activeOrderId    = null;
  state.activeOrderDetail = null;
}

function attachModalListeners(): void {
  const modal     = getModalEl();
  const closeBtn  = document.getElementById("btn-modal-close");
  const reprintBtn  = document.getElementById("btn-reprint")       as HTMLButtonElement | null;
  const cancelOrderBtn = document.getElementById("btn-cancel-order") as HTMLButtonElement | null;

  if (!modal) return;

  // Close button
  closeBtn?.addEventListener("click", closeModal);

  // Close on backdrop click (click outside the container)
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // ESC key is handled natively by <dialog> — fires the "cancel" event
  modal.addEventListener("cancel", () => {
    state.activeOrderId    = null;
    state.activeOrderDetail = null;
  });

  // Reimprimir Comanda
  reprintBtn?.addEventListener("click", async () => {
    if (!state.activeOrderId) return;
    reprintBtn.disabled = true;

    try {
      await PedidoService.reprintOrder(state.activeOrderId);
      // TODO: show success toast
      console.log("[Orders] Reprint success");
    } catch (err) {
      console.error("[Orders] Reprint failed:", err);
      // TODO: show error toast
    } finally {
      reprintBtn.disabled = false;
    }
  });

  // Estornar / Cancelar Pedido
  cancelOrderBtn?.addEventListener("click", async () => {
    if (!state.activeOrderId || !state.activeOrderDetail) return;
    if (!confirm(`Confirmar cancelamento do pedido #${state.activeOrderDetail.number}?`)) return;

    cancelOrderBtn.disabled = true;

    try {
      await PedidoService.cancelOrder(state.activeOrderId);
      closeModal();
      // Re-render table to reflect the new status
      await loadAndRender();
    } catch (err) {
      console.error("[Orders] Cancel failed:", err);
      cancelOrderBtn.disabled = false;
      // TODO: show error toast
    }
  });
}

// =============================================================================
// PAGINATION
// =============================================================================

function buildPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  const add      = (p: number)   => { if (!pages.includes(p)) pages.push(p); };
  const ellipsis = ()            => { if (pages[pages.length - 1] !== "...") pages.push("..."); };
  add(1);
  if (current > 3)          ellipsis();
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) add(p);
  if (current < total - 2)  ellipsis();
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
    <button class="page-btn page-btn--nav" data-page="${currentPage - 1}" aria-label="Página anterior" ${currentPage <= 1 ? "disabled" : ""}>
      <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
    </button>
    ${buildPageRange(currentPage, totalPages).map((p) =>
      p === "..."
        ? `<span class="pagination__ellipsis" aria-hidden="true">…</span>`
        : `<button class="page-btn ${p === currentPage ? "page-btn--active" : ""}" data-page="${p}" aria-label="Página ${p}" ${p === currentPage ? 'aria-current="page"' : ""}>${p}</button>`
    ).join("")}
    <button class="page-btn page-btn--nav" data-page="${currentPage + 1}" aria-label="Próxima página" ${currentPage >= totalPages ? "disabled" : ""}>
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
// LOAD & RENDER (table)
// =============================================================================

async function loadAndRender(): Promise<void> {
  const tbody   = document.getElementById("orders-tbody")   as HTMLTableSectionElement | null;
  const empty   = document.getElementById("orders-empty")   as HTMLElement | null;
  const loading = document.getElementById("orders-loading") as HTMLElement | null;
  const wrapper = document.getElementById("table-wrapper")  as HTMLElement | null;
  if (!tbody || !empty || !loading || !wrapper) return;

  state.isLoading = true;
  loading.hidden  = false;
  wrapper.hidden  = true;
  empty.hidden    = true;

  try {
    const result = await PedidoService.getOrders({
      page:       state.currentPage,
      pageSize:   state.pageSize,
      search:     state.searchQuery || undefined,
      status:     state.statusFilter,
      dateFilter: state.dateFilter,
    });

    state.orders      = result.data;
    state.totalOrders = result.total;
    state.totalPages  = result.totalPages;

    if (result.data.length === 0) {
      empty.hidden  = false;
      wrapper.hidden = true;
    } else {
      tbody.innerHTML = result.data.map(renderRow).join("");
      wrapper.hidden  = false;
      empty.hidden    = true;
      attachRowListeners();
    }

    renderPagination();
  } catch (err) {
    console.error("[Orders] Failed to load orders:", err);
    // TODO: render error state / toast
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
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (id) openModal(id);
    });
  });
}

// ── Search (debounced 300 ms) ─────────────────────────────────────────────

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

// ── Dropdowns ─────────────────────────────────────────────────────────────

function toggleDropdown(which: "status" | "date"): void {
  const isOpen = state.activeDropdown === which;
  closeAllDropdowns();
  if (!isOpen) openDropdown(which);
}

function openDropdown(which: "status" | "date"): void {
  const dropdownId = which === "status" ? "status-dropdown" : "date-dropdown";
  const btnId      = which === "status" ? "btn-status-filter" : "btn-date-filter";
  document.getElementById(dropdownId)?.removeAttribute("hidden");
  document.getElementById(btnId)?.setAttribute("aria-expanded", "true");
  state.activeDropdown = which;
}

function closeAllDropdowns(): void {
  ["status-dropdown", "date-dropdown"].forEach((id) => document.getElementById(id)?.setAttribute("hidden", ""));
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

// ── Sidebar / Nav ─────────────────────────────────────────────────────────

function attachNavListeners(): void {
  document.querySelectorAll<HTMLAnchorElement>(".sidebar__nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      const href = item.getAttribute("href");
      if (href && href !== "#") {
        return;
      }
      e.preventDefault();
      document.querySelectorAll(".sidebar__nav-item").forEach((el) => { el.classList.remove("sidebar__nav-item--active"); el.removeAttribute("aria-current"); });
      item.classList.add("sidebar__nav-item--active");
      item.setAttribute("aria-current", "page");
      // TODO: trigger routing when implemented
    });
  });
  document.getElementById("btn-logout")?.addEventListener("click",        () => console.log("[Orders] Logout requested"));
  document.getElementById("btn-notifications")?.addEventListener("click", () => console.log("[Orders] Notifications requested"));
  document.getElementById("sidebar-user")?.addEventListener("click",      () => console.log("[Orders] User profile requested"));
}

// =============================================================================
// BOOTSTRAP
// =============================================================================

async function init(): Promise<void> {
  attachNavListeners();
  attachSearchListener();
  attachFilterListeners();
  attachModalListeners();
  await loadAndRender();
}

document.addEventListener("DOMContentLoaded", init);