import { formatarMoeda } from "@/utils/ui";
import { HistoricoPedidoService } from "./service";
import { state } from "./state";
import type { PedidoDetail } from "./types";

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
      <span class="order-modal__item-price">${formatarMoeda(item.unitPrice * item.quantity)}</span>
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
          <span class="order-modal__total-value">${formatarMoeda(detail.total)}</span>
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

export async function openModal(orderId: string): Promise<void> {
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

export function attachModalListeners(onOrderCancelled: () => void): void {
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
      onOrderCancelled();
    } catch (err) {
      console.error("[Orders] Cancelamento falhou:", err);
      cancelOrderBtn.disabled = false;
    }
  });
}
