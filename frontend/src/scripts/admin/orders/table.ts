import { formatarMoeda } from "@/utils/ui";
import { openModal } from "./modal";
import { renderPagination } from "./pagination";
import { state } from "./state";
import type { Pedido, PedidoPagamento, PedidoStatus, PedidoTipo } from "./types";

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
      <td class="orders-table__td"><span class="orders-table__total">${formatarMoeda(order.total)}</span></td>
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
// TABLE RENDER  (atualiza só tbody sem recarregar da API)
// =============================================================================

function attachRowListeners(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-action='view']").forEach((btn) => {
    btn.addEventListener("click", () => { const id = btn.dataset.id; if (id) openModal(id); });
  });
}

export function renderTable(onReload: () => void): void {
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

  renderPagination(onReload);
}
