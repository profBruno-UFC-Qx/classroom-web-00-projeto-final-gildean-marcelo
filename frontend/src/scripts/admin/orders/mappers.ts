import { SituacaoPedido, TipoEntrega, FormaPagamento, type PedidoEntity } from "@/services/PedidoService";
import type { Pedido, PedidoDetail, PedidoStatus } from "./types";

export function mapSituacaoToStatus(s: SituacaoPedido): PedidoStatus {
  switch (s) {
    case SituacaoPedido.Recebido:   return "new";
    case SituacaoPedido.Preparando: return "preparing";
    case SituacaoPedido.Pronto:     return "ready";
    case SituacaoPedido.Entregue:   return "delivered";
    case SituacaoPedido.Cancelado:  return "cancelled";
    default:                        return "new";
  }
}

export function mapStatusToSituacao(s: PedidoStatus): SituacaoPedido | null {
  switch (s) {
    case "new":       return SituacaoPedido.Recebido;
    case "preparing": return SituacaoPedido.Preparando;
    case "ready":     return SituacaoPedido.Pronto;
    case "delivered": return SituacaoPedido.Entregue;
    case "cancelled": return SituacaoPedido.Cancelado;
    default:          return null;
  }
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const hh = d.getHours().toString().padStart(2, "0");
  const mi = d.getMinutes().toString().padStart(2, "0");
  return `${dd}/${mm} - ${hh}:${mi}`;
}

export function mapEntityToPedido(entity: PedidoEntity): Pedido {
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

export function mapEntityToPedidoDetail(entity: PedidoEntity): PedidoDetail {
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
