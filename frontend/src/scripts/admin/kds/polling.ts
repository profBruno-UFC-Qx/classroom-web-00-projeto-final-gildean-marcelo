import { getElapsedSeconds } from "./mappers";
import { OrderService } from "./service";
import { state } from "./state";
import { formatElapsed, isUrgent, renderBoard } from "./board";

// =============================================================================
// CLOCK & LIVE TIMERS
// =============================================================================

export function updateClock(): void {
  const el = document.getElementById("clock");
  if (el) el.textContent = new Date().toLocaleTimeString("pt-BR", { hour12: false });
}

/**
 * Recalcula o elapsed de cada ordem ativa a partir do createdAt real.
 * Não incrementa um contador — usa sempre Date.now() como referência.
 */
export function tickTimers(): void {
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

export const POLL_INTERVAL_MS = 30_000;

export async function pollOrders(): Promise<void> {
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
