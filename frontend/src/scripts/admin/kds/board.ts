import { getElapsedSeconds } from "./mappers";
import { OrderService } from "./service";
import { state } from "./state";
import type { Order, OrderItem, OrderNote, OrderType, KDSColumn } from "./types";

// =============================================================================
// HELPERS
// =============================================================================

export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s} min`;
}

export function isUrgent(order: Order): boolean {
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

export function renderBoard(): void {
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
      case "start": {
        await OrderService.updateStatus(id, "preparing");
        const orderToStart = state.orders.find((o) => o.id === id);
        if (orderToStart) orderToStart.status = "preparing";
        break;
      }

      case "ready": {
        await OrderService.updateStatus(id, "ready");
        const orderToReady = state.orders.find((o) => o.id === id);
        if (orderToReady) orderToReady.status = "ready";
        break;
      }

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
