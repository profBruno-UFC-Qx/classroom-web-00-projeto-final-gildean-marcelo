
import {
  pedidoService,
  SituacaoPedido,
  TipoEntrega,
  type PedidoEntity,
} from "@/services/PedidoService";


type OrderStatus = "new" | "preparing" | "ready";
type OrderType   = "Delivery" | "Balcão" | "Salão";
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
  status:                 OrderStatus;
  createdAt:              string;          
  urgentThresholdSeconds: number;
  items:                  OrderItem[];
  generalNote?:           string;          
}

interface KDSColumn {
  status:   OrderStatus;
  label:    string;
  dotClass: string;
}


function mapSituacaoToStatus(situacao: SituacaoPedido): OrderStatus {
  switch (situacao) {
    case SituacaoPedido.Recebido:   return "new";
    case SituacaoPedido.Preparando: return "preparing";
    case SituacaoPedido.Pronto:     return "ready";
    default:                        return "new";
  }
}

function mapTipoEntrega(tipo: TipoEntrega): OrderType {
  return tipo === TipoEntrega.Delivery ? "Delivery" : "Balcão";  
}

function mapEntityToOrder(entity: PedidoEntity): Order {
  const a = entity.attributes;

  const items: OrderItem[] = (a.itens?.data ?? []).map((item) => ({
    id:       String(item.id),
    quantity: item.attributes.quantidade,
    name:     item.attributes.produto?.data?.attributes.nome ?? "(produto)",    
    notes: item.attributes.observacao
      ? [{ type: "info", text: item.attributes.observacao }]
      : [],
  }));

  return {
    id:                     String(entity.id),
    number:                 entity.id,
    type:                   mapTipoEntrega(a.tipo_entrega),
    status:                 mapSituacaoToStatus(a.situacao),
    createdAt:              a.createdAt,
    urgentThresholdSeconds: 600,           
    items,
    generalNote:            a.observacao_geral ?? undefined,
  };
}

// Calcula elapsed em segundos a partir do createdAt real
function getElapsedSeconds(order: Order): number {
  return Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 1000);
}

// =============================================================================
// SERVICE LAYER  (fina camada sobre o pedidoService)
// =============================================================================

const OrderService = {
  /**
   * Busca pedidos ativos no KDS (recebido + preparando).
   * Fonte: pedidoService.listParaKDS() com populate de itens.produto.
   */
  async getOrders(): Promise<Order[]> {
    const { data } = await pedidoService.listParaKDS();
    return data.map(mapEntityToOrder);
  },

  /**
   * Avança o status de um pedido.
   * "preparing" → pedidoService.iniciarPreparo()
   * "ready"     → pedidoService.marcarPronto()
   */
  async updateStatus(id: string, status: "preparing" | "ready"): Promise<void> {
    const numId = Number(id);
    if (status === "preparing") await pedidoService.iniciarPreparo(numId);
    if (status === "ready")     await pedidoService.marcarPronto(numId);
  },

  /**
   * Remove um pedido "pronto" do KDS marcando-o como entregue.
   * Chama pedidoService.marcarEntregue() e remove do estado local.
   */
  async dismissOrder(id: string): Promise<void> {
    await pedidoService.marcarEntregue(Number(id));
    state.orders = state.orders.filter((o) => o.id !== id);
  },
};

// =============================================================================
// STATE
// =============================================================================

interface AppState {
  orders:     Order[];
  activePage: string;
}

const state: AppState = {
  orders:     [],
  activePage: "kds",
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
    getElapsedSeconds(order) >= order.urgentThresholdSeconds
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

// =============================================================================
// RENDERERS
// =============================================================================

function renderNote(note: OrderNote): string {
  const prefix = note.type === "add" ? "+" : note.type === "remove" ? "−" : "•";
  return `<li class="order-item__note order-item__note--${note.type}">${prefix} ${note.text}</li>`;
}

function renderItem(item: OrderItem, isDone: boolean): string {
  const nameClass = isDone ? "order-item__name order-item__name--done" : "order-item__name";
  const notesHtml = item.notes.length
    ? `<ul class="order-item__notes">${item.notes.map(renderNote).join("")}</ul>`
    : "";
  return `
    <div class="order-item">
      <span class="${nameClass}">${item.quantity}x ${item.name}</span>
      ${notesHtml}
    </div>`;
}

function renderTimer(order: Order): string {
  const elapsed = getElapsedSeconds(order);
  const urgent  = isUrgent(order);

  if (urgent) {
    return `
      <span class="order-card__timer order-card__timer--urgent" role="timer">
        <span class="material-symbols-outlined order-card__timer-icon" aria-hidden="true">warning</span>
        ${formatElapsed(elapsed)}
      </span>`;
  }
  return `
    <span class="order-card__timer" data-timer="${order.id}" role="timer">
      ${formatElapsed(elapsed)}
    </span>`;
}

function renderFooter(order: Order): string {
  if (order.status === "new") {
    return `
      <div class="order-card__footer">
        <button class="btn btn--cta" data-action="start" data-id="${order.id}"
          aria-label="Iniciar preparo do pedido #${order.number}">
          <span class="material-symbols-outlined btn__icon" aria-hidden="true"
            style="font-variation-settings:'FILL' 1;">play_arrow</span>
          Iniciar Preparo
        </button>
      </div>`;
  }
  if (order.status === "preparing") {
    return `
      <div class="order-card__footer">
        <button class="btn btn--confirm" data-action="ready" data-id="${order.id}"
          aria-label="Marcar pedido #${order.number} como pronto">
          <span class="material-symbols-outlined btn__icon" aria-hidden="true"
            style="font-variation-settings:'FILL' 1;">check_circle</span>
          Marcar Pronto
        </button>
      </div>`;
  }
  if (order.status === "ready") {
    return `
      <div class="order-card__footer">
        <button class="btn btn--ghost" data-action="dismiss" data-id="${order.id}"
          aria-label="Marcar pedido #${order.number} como entregue">
          <span class="material-symbols-outlined btn__icon" aria-hidden="true">done_all</span>
          Marcar Entregue
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

  const divider   = `<div class="order-item__divider" aria-hidden="true"></div>`;
  const itemsHtml = order.items.map((it) => renderItem(it, isDone)).join(divider);

  // observacao_geral exibida como nota geral ao final dos itens
  const generalNoteHtml = order.generalNote
    ? `${divider}
       <div class="order-item">
         <ul class="order-item__notes">
           <li class="order-item__note order-item__note--info">• ${order.generalNote}</li>
         </ul>
       </div>`
    : "";

  return `
    <article class="${cardClass}" data-order-id="${order.id}" aria-label="Pedido #${order.number}">
      <header class="order-card__header">
        <div class="order-card__header-left">
          <span class="${numberClass}">#${order.number}</span>
          <span class="order-card__badge ${badgeClassFor(order.type)}">${order.type}</span>
        </div>
        ${renderTimer(order)}
      </header>
      <div class="${bodyClass}">
        ${itemsHtml}
        ${generalNoteHtml}
      </div>
      ${renderFooter(order)}
    </article>`;
}

const COLUMNS: KDSColumn[] = [
  { status: "new",       label: "Novos",      dotClass: "kds-col__dot--new"       },
  { status: "preparing", label: "Em Preparo", dotClass: "kds-col__dot--preparing" },
  { status: "ready",     label: "Prontos",    dotClass: "kds-col__dot--ready"      },
];

function renderBoard(): void {
  const board = document.getElementById("kds-board");
  if (!board) return;

  board.innerHTML = COLUMNS.map((col) => {
    const orders = state.orders.filter((o) => o.status === col.status);
    const count  = orders.length;

    const bodyContent = count
      ? orders.map(renderCard).join("")
      : `<div class="kds-col__empty">
           <span class="material-symbols-outlined kds-col__empty-icon" aria-hidden="true">inbox</span>
           Nenhum pedido
         </div>`;

    const colClass = col.status === "ready" ? "kds-col kds-col--ready" : "kds-col";

    return `
      <section class="${colClass}" aria-label="${col.label}">
        <div class="kds-col__header">
          <div class="kds-col__header-left">
            <span class="kds-col__dot ${col.dotClass}" aria-hidden="true"></span>
            <h3 class="kds-col__title">${col.label}</h3>
          </div>
          <span class="kds-col__count" aria-label="${count} pedidos">${count}</span>
        </div>
        <div class="kds-col__body">${bodyContent}</div>
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

  btn.disabled = true;

  try {
    switch (action) {
      case "start":
        await OrderService.updateStatus(id, "preparing");
        
        const orderToStart = state.orders.find((o) => o.id === id);
        if (orderToStart) orderToStart.status = "preparing";
        break;

      case "ready":
        await OrderService.updateStatus(id, "ready");
        const orderToReady = state.orders.find((o) => o.id === id);
        if (orderToReady) orderToReady.status = "ready";
        break;

      case "dismiss":
        await OrderService.dismissOrder(id);
        
        break;
    }
  } catch (err) {
    console.error("[KDS] Ação falhou:", err);
    btn.disabled = false;
    // TODO: exibir toast de erro
    return;
  }

  renderBoard();
}

function attachNavListeners(): void {
  document.querySelectorAll<HTMLAnchorElement>(".sidebar__nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".sidebar__nav-item").forEach((el) => {
        el.classList.remove("sidebar__nav-item--active");
        el.removeAttribute("aria-current");
      });
      item.classList.add("sidebar__nav-item--active");
      item.setAttribute("aria-current", "page");
      state.activePage = item.dataset.page ?? "kds";
    });
  });

  document.getElementById("btn-logout")?.addEventListener("click", () => {
    // TODO: AuthService.logout() + redirect /login
    console.log("[KDS] Logout");
  });

  document.getElementById("btn-notifications")?.addEventListener("click", () => {
    console.log("[KDS] Notificações");
  });

  document.getElementById("sidebar-user")?.addEventListener("click", () => {
    console.log("[KDS] Perfil do usuário");
  });
}

// =============================================================================
// CLOCK & LIVE TIMERS
// =============================================================================

function updateClock(): void {
  const el = document.getElementById("clock");
  if (el) el.textContent = new Date().toLocaleTimeString("pt-BR", { hour12: false });
}

/**
 * Recalcula o elapsed de cada ordem ativa a partir do createdAt real.
 * Não incrementa um contador — usa sempre Date.now() como referência.
 */
function tickTimers(): void {
  let needsFullRender = false;

  state.orders.forEach((order) => {
    if (order.status !== "new" && order.status !== "preparing") return;

    const elapsed      = getElapsedSeconds(order);
    const prevElapsed  = elapsed - 1;
    const wasUrgent    = order.status === "preparing" && prevElapsed >= order.urgentThresholdSeconds;
    const isUrgentNow  = isUrgent(order);

    // Cruzou o limiar de urgência → re-render para aplicar estilos
    if (!wasUrgent && isUrgentNow) {
      needsFullRender = true;
      return;
    }

    // Fast path: atualiza só o texto do timer sem re-render
    if (!isUrgentNow) {
      const el = document.querySelector<HTMLElement>(`[data-timer="${order.id}"]`);
      if (el) el.textContent = formatElapsed(elapsed);
    }
  });

  if (needsFullRender) renderBoard();
}

// =============================================================================
// POLLING  (novos pedidos chegando em tempo real)
// =============================================================================

const POLL_INTERVAL_MS = 30_000; 

async function pollOrders(): Promise<void> {
  try {
    const freshOrders = await OrderService.getOrders();

    // Merge: preserva ordens que estão em transição local (botão disabled)
    // e adiciona/atualiza as que vieram da API
    const localIds  = new Set(state.orders.map((o) => o.id));
    const remoteIds = new Set(freshOrders.map((o) => o.id));

    // Remove orders que não existem mais na API (ex: foram entregues por outro terminal)
    state.orders = state.orders.filter((o) => remoteIds.has(o.id));

    // Adiciona novas ordens que chegaram
    freshOrders.forEach((fresh) => {
      if (!localIds.has(fresh.id)) {
        state.orders.push(fresh);
      } else {
        // Atualiza dados do item sem sobrescrever status local em transição
        const local = state.orders.find((o) => o.id === fresh.id);
        if (local) {
          local.items       = fresh.items;
          local.generalNote = fresh.generalNote;
          // Só atualiza status se a API avançou além do que está localmente
          // (ex: outro terminal marcou como pronto)
          if (fresh.status !== local.status) local.status = fresh.status;
        }
      }
    });

    renderBoard();
  } catch (err) {
    console.error("[KDS] Poll falhou:", err);
    // Não re-renderiza — mantém estado anterior
  }
}

// =============================================================================
// BOOTSTRAP
// =============================================================================

async function init(): Promise<void> {
  try {
    state.orders = await OrderService.getOrders();
  } catch (err) {
    console.error("[KDS] Falha ao carregar pedidos:", err);
    // TODO: exibir estado de erro no board
  }

  renderBoard();
  updateClock();
  attachNavListeners();

  // Tick de 1s para clock + timers
  setInterval(() => {
    updateClock();
    tickTimers();
  }, 1_000);

  // Poll de 30s para novos pedidos
  setInterval(pollOrders, POLL_INTERVAL_MS);
}

document.addEventListener("DOMContentLoaded", init);