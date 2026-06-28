// =============================================================================
// kds.ts — KDS Monitor  |  Danny's Fresh Market Admin
// =============================================================================
// Architecture:
//   Types → MockData → OrderService (swap for real API here) → State → Render
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

type OrderStatus = "new" | "preparing" | "ready";
type OrderType   = "Balcão" | "Delivery" | "Salão";
type NoteType    = "remove" | "add" | "info";

interface OrderNote {
  type: NoteType;
  text: string;
}

interface OrderItem {
  id:       string;
  quantity: number;
  name:     string;
  notes:    OrderNote[];
}

interface Order {
  id:                     string;
  number:                 number;
  type:                   OrderType;
  tableInfo?:             string;   // e.g. "Mesa 4" for Salão orders
  status:                 OrderStatus;
  elapsedSeconds:         number;
  urgentThresholdSeconds: number;   // when to flag as urgent (red)
  items:                  OrderItem[];
}

interface KDSColumn {
  status:   OrderStatus;
  label:    string;
  dotClass: string;
}

// =============================================================================
// MOCK DATA
// Tip: keep this structure — your real API should return the same shape.
// =============================================================================

const MOCK_ORDERS: Order[] = [
  {
    id:                     "ord-1042",
    number:                 1042,
    type:                   "Balcão",
    status:                 "new",
    elapsedSeconds:         135,   // 02:15
    urgentThresholdSeconds: 600,   // 10 min
    items: [
      {
        id:       "i-1",
        quantity: 1,
        name:     "Danny's Classic Burger",
        notes: [
          { type: "remove", text: "Sem Cebola" },
          { type: "remove", text: "Ponto da Carne: Bem Passada" },
        ],
      },
      {
        id:       "i-2",
        quantity: 2,
        name:     "Batata Frita Média",
        notes:    [],
      },
    ],
  },
  {
    id:                     "ord-1043",
    number:                 1043,
    type:                   "Delivery",
    status:                 "new",
    elapsedSeconds:         45,
    urgentThresholdSeconds: 600,
    items: [
      {
        id:       "i-3",
        quantity: 1,
        name:     "Veggie Delight Sandwich",
        notes:    [{ type: "add", text: "Extra Molho Verde" }],
      },
    ],
  },
  {
    id:                     "ord-1039",
    number:                 1039,
    type:                   "Salão",
    tableInfo:              "Mesa 4",
    status:                 "preparing",
    elapsedSeconds:         750,   // 12:30 — already urgent
    urgentThresholdSeconds: 600,
    items: [
      {
        id:       "i-4",
        quantity: 2,
        name:     "Smash Burger Duplo",
        notes:    [],
      },
      {
        id:       "i-5",
        quantity: 1,
        name:     "Salada Caesar",
        notes:    [{ type: "remove", text: "Sem Croutons" }],
      },
    ],
  },
  {
    id:                     "ord-1038",
    number:                 1038,
    type:                   "Delivery",
    status:                 "ready",
    elapsedSeconds:         0,
    urgentThresholdSeconds: 600,
    items: [
      {
        id:       "i-6",
        quantity: 1,
        name:     "Combo Família",
        notes:    [],
      },
    ],
  },
];

// =============================================================================
// SERVICE LAYER
// Replace each method body with a real fetch() call when connecting to an API.
// The call signatures intentionally match common REST patterns.
// =============================================================================

const OrderService = {
  /**
   * Fetch all active KDS orders.
   *
   * TODO — replace with:
   *   const res = await fetch("/api/kds/orders", { headers: authHeaders() });
   *   if (!res.ok) throw new Error(await res.text());
   *   return res.json() as Promise<Order[]>;
   */
  async getOrders(): Promise<Order[]> {
    return structuredClone(MOCK_ORDERS);
  },

  /**
   * Advance an order to the next status.
   *
   * TODO — replace with:
   *   const res = await fetch(`/api/orders/${id}/status`, {
   *     method:  "PATCH",
   *     headers: { "Content-Type": "application/json", ...authHeaders() },
   *     body:    JSON.stringify({ status }),
   *   });
   *   if (!res.ok) throw new Error(await res.text());
   */
  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    const order = state.orders.find((o) => o.id === id);
    if (!order) throw new Error(`Order ${id} not found`);
    order.status = status;
    // Reset timer when entering 'preparing' so prep-time is accurate
    if (status === "preparing") order.elapsedSeconds = 0;
  },

  /**
   * Archive / dismiss a completed order from the KDS view.
   *
   * TODO — replace with:
   *   const res = await fetch(`/api/orders/${id}/dismiss`, {
   *     method:  "POST",
   *     headers: authHeaders(),
   *   });
   *   if (!res.ok) throw new Error(await res.text());
   */
  async dismissOrder(id: string): Promise<void> {
    state.orders = state.orders.filter((o) => o.id !== id);
  },
};

// =============================================================================
// APPLICATION STATE
// =============================================================================

interface AppState {
  orders:      Order[];
  activePage:  string;
  isLoading:   boolean;
}

const state: AppState = {
  orders:     [],
  activePage: "kds",
  isLoading:  false,
};

// =============================================================================
// HELPERS
// =============================================================================

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s} min`;
}

function isUrgent(order: Order): boolean {
  return (
    order.status === "preparing" &&
    order.elapsedSeconds >= order.urgentThresholdSeconds
  );
}

function badgeClassFor(type: OrderType): string {
  const map: Record<OrderType, string> = {
    Balcão:   "order-card__badge--balcao",
    Delivery: "order-card__badge--delivery",
    Salão:    "order-card__badge--salao",
  };
  return map[type];
}

function badgeLabelFor(order: Order): string {
  return order.type === "Salão" && order.tableInfo
    ? `Salão — ${order.tableInfo}`
    : order.type;
}

// =============================================================================
// RENDERERS
// =============================================================================

function renderNote(note: OrderNote): string {
  const prefix = note.type === "add" ? "+" : note.type === "remove" ? "−" : "•";
  return `<li class="order-item__note order-item__note--${note.type}">${prefix} ${note.text}</li>`;
}

function renderItem(item: OrderItem, isDone: boolean): string {
  const nameClass = isDone
    ? "order-item__name order-item__name--done"
    : "order-item__name";

  const notesHtml = item.notes.length
    ? `<ul class="order-item__notes" aria-label="Observações">
         ${item.notes.map(renderNote).join("")}
       </ul>`
    : "";

  return `
    <div class="order-item">
      <span class="${nameClass}">${item.quantity}x ${item.name}</span>
      ${notesHtml}
    </div>`;
}

function renderTimer(order: Order): string {
  if (isUrgent(order)) {
    return `
      <span class="order-card__timer order-card__timer--urgent" role="timer" aria-label="Tempo decorrido ${formatElapsed(order.elapsedSeconds)} — atrasado">
        <span class="material-symbols-outlined order-card__timer-icon" aria-hidden="true">warning</span>
        ${formatElapsed(order.elapsedSeconds)}
      </span>`;
  }
  return `
    <span class="order-card__timer" data-timer="${order.id}" role="timer" aria-label="Tempo decorrido ${formatElapsed(order.elapsedSeconds)}">
      ${formatElapsed(order.elapsedSeconds)}
    </span>`;
}

function renderFooter(order: Order): string {
  if (order.status === "new") {
    return `
      <div class="order-card__footer">
        <button
          class="btn btn--cta"
          data-action="start"
          data-id="${order.id}"
          aria-label="Iniciar preparo do pedido #${order.number}"
        >
          <span class="material-symbols-outlined btn__icon" aria-hidden="true" style="font-variation-settings:'FILL' 1;">play_arrow</span>
          Iniciar Preparo
        </button>
      </div>`;
  }

  if (order.status === "preparing") {
    return `
      <div class="order-card__footer">
        <button
          class="btn btn--confirm"
          data-action="ready"
          data-id="${order.id}"
          aria-label="Marcar pedido #${order.number} como pronto"
        >
          <span class="material-symbols-outlined btn__icon" aria-hidden="true" style="font-variation-settings:'FILL' 1;">check_circle</span>
          Marcar Pronto
        </button>
      </div>`;
  }

  if (order.status === "ready") {
    return `
      <div class="order-card__footer">
        <button
          class="btn btn--ghost"
          data-action="dismiss"
          data-id="${order.id}"
          aria-label="Ocultar pedido #${order.number}"
        >
          <span class="material-symbols-outlined btn__icon" aria-hidden="true">delete</span>
          Ocultar
        </button>
      </div>`;
  }

  return "";
}

function renderCard(order: Order): string {
  const urgent = isUrgent(order);
  const isDone  = order.status === "ready";

  const cardClass = [
    "order-card",
    urgent ? "order-card--urgent" : "",
    isDone  ? "order-card--ready"  : "",
  ].filter(Boolean).join(" ");

  const numberClass = isDone
    ? "order-card__number order-card__number--done"
    : "order-card__number";

  const bodyClass = isDone
    ? "order-card__body order-card__body--done"
    : "order-card__body";

  const divider = `<div class="order-item__divider" aria-hidden="true"></div>`;
  const itemsHtml = order.items.map((it) => renderItem(it, isDone)).join(divider);

  return `
    <article class="${cardClass}" data-order-id="${order.id}" aria-label="Pedido #${order.number}">
      <header class="order-card__header">
        <div class="order-card__header-left">
          <span class="${numberClass}">#${order.number}</span>
          <span class="order-card__badge ${badgeClassFor(order.type)}">${badgeLabelFor(order)}</span>
        </div>
        ${renderTimer(order)}
      </header>

      <div class="${bodyClass}">
        ${itemsHtml}
      </div>

      ${renderFooter(order)}
    </article>`;
}

// KDS column definitions
const COLUMNS: KDSColumn[] = [
  { status: "new",       label: "Novos",     dotClass: "kds-col__dot--new" },
  { status: "preparing", label: "Em Preparo", dotClass: "kds-col__dot--preparing" },
  { status: "ready",     label: "Prontos",    dotClass: "kds-col__dot--ready" },
];

function renderBoard(): void {
  const board = document.getElementById("kds-board");
  if (!board) return;

  board.innerHTML = COLUMNS.map((col) => {
    const orders = state.orders.filter((o) => o.status === col.status);
    const count  = orders.length;

    const bodyContent = count
      ? orders.map(renderCard).join("")
      : `<div class="kds-col__empty" aria-label="Nenhum pedido em ${col.label}">
           <span class="material-symbols-outlined kds-col__empty-icon" aria-hidden="true">inbox</span>
           Nenhum pedido
         </div>`;

    const colClass = col.status === "ready"
      ? "kds-col kds-col--ready"
      : "kds-col";

    return `
      <section class="${colClass}" aria-label="${col.label}">
        <div class="kds-col__header">
          <div class="kds-col__header-left">
            <span class="kds-col__dot ${col.dotClass}" aria-hidden="true"></span>
            <h3 class="kds-col__title">${col.label}</h3>
          </div>
          <span class="kds-col__count" aria-label="${count} pedidos">${count}</span>
        </div>
        <div class="kds-col__body">
          ${bodyContent}
        </div>
      </section>`;
  }).join("");

  attachCardListeners();
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

function attachCardListeners(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((btn) => {
    btn.addEventListener("click", handleCardAction);
  });
}

async function handleCardAction(e: Event): Promise<void> {
  const btn    = e.currentTarget as HTMLButtonElement;
  const action = btn.dataset.action;
  const id     = btn.dataset.id;
  if (!action || !id) return;

  // Optimistic UI — disable button immediately to prevent double-tap
  btn.disabled = true;

  try {
    switch (action) {
      case "start":
        await OrderService.updateStatus(id, "preparing");
        break;
      case "ready":
        await OrderService.updateStatus(id, "ready");
        break;
      case "dismiss":
        await OrderService.dismissOrder(id);
        break;
    }
  } catch (err) {
    console.error("[KDS] Action failed:", err);
    btn.disabled = false;
    // TODO: show a toast notification with error feedback
    return;
  }

  renderBoard();
}

function attachNavListeners(): void {
  document.querySelectorAll<HTMLAnchorElement>(".sidebar__nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      const href = item.getAttribute("href");
      if (href && href !== "#") {
        return;
      }
      e.preventDefault();

      // Update active state visually
      document.querySelectorAll(".sidebar__nav-item").forEach((el) => {
        el.classList.remove("sidebar__nav-item--active");
        el.removeAttribute("aria-current");
      });
      item.classList.add("sidebar__nav-item--active");
      item.setAttribute("aria-current", "page");

      state.activePage = item.dataset.page ?? "kds";
      // TODO: trigger page/view change when routing is implemented
    });
  });

  document.getElementById("btn-logout")?.addEventListener("click", () => {
    // TODO: call AuthService.logout() and redirect to /login
    console.log("[KDS] Logout requested");
  });

  document.getElementById("btn-notifications")?.addEventListener("click", () => {
    // TODO: open notifications drawer
    console.log("[KDS] Notifications requested");
  });

  document.getElementById("sidebar-user")?.addEventListener("click", () => {
    // TODO: open user profile / account settings
    console.log("[KDS] User profile requested");
  });
}

// =============================================================================
// CLOCK & LIVE TIMERS
// =============================================================================

function updateClock(): void {
  const el = document.getElementById("clock");
  if (el) {
    el.textContent = new Date().toLocaleTimeString("pt-BR", { hour12: false });
  }
}

/**
 * Advances elapsed seconds for active orders and updates timer elements
 * in-place (without a full board re-render) for performance.
 * When an order crosses the urgency threshold, a full re-render is triggered
 * so the card can pick up the urgent styling.
 */
function tickTimers(): void {
  let needsFullRender = false;

  state.orders.forEach((order) => {
    if (order.status !== "new" && order.status !== "preparing") return;

    const wasUrgentBefore = isUrgent(order);
    order.elapsedSeconds++;
    const isUrgentNow = isUrgent(order);

    // Urgency just flipped → need a full render for style change
    if (!wasUrgentBefore && isUrgentNow) {
      needsFullRender = true;
      return;
    }

    // Fast path: update timer text in-place
    if (!isUrgentNow) {
      const el = document.querySelector<HTMLElement>(`[data-timer="${order.id}"]`);
      if (el) el.textContent = formatElapsed(order.elapsedSeconds);
    }
  });

  if (needsFullRender) renderBoard();
}

// =============================================================================
// BOOTSTRAP
// =============================================================================

async function init(): Promise<void> {
  try {
    state.orders = await OrderService.getOrders();
  } catch (err) {
    console.error("[KDS] Failed to load orders:", err);
    // TODO: show error state in the board
  }

  renderBoard();
  updateClock();
  attachNavListeners();

  // Shared 1-second tick for clock + order timers
  setInterval(() => {
    updateClock();
    tickTimers();
  }, 1000);
}

document.addEventListener("DOMContentLoaded", init);
