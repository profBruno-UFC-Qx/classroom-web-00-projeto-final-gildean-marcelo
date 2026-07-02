import { SituacaoPedido, TipoEntrega, type PedidoEntity } from "@/services/PedidoService";
import type { Order, OrderItem, OrderStatus, OrderType } from "./types";

export function mapSituacaoToStatus(situacao: SituacaoPedido): OrderStatus {
  switch (situacao) {
    case SituacaoPedido.Recebido:   return "new";
    case SituacaoPedido.Preparando: return "preparing";
    case SituacaoPedido.Pronto:     return "ready";
    default:                        return "new";
  }
}

export function mapTipoEntrega(tipo: TipoEntrega): OrderType {
  return tipo === TipoEntrega.Delivery ? "Delivery" : "Balcão";
}

export function mapEntityToOrder(entity: PedidoEntity): Order {
  const items: OrderItem[] = (entity.item_pedidos ?? []).map((item) => ({
    id:       String(item.id),
    quantity: item.quantidade,
    name:     item.produto?.nome ?? "(produto)",
    notes: item.observacao
      ? [{ type: "info", text: item.observacao }]
      : [],
  }));

  return {
    id:                     String(entity.id),
    number:                 entity.id,
    type:                   mapTipoEntrega(entity.tipo_entrega),
    status:                 mapSituacaoToStatus(entity.situacao),
    createdAt:              entity.createdAt,
    urgentThresholdSeconds: 600,
    items,
    generalNote:            entity.observacao_geral ?? undefined,
  };
}

// Calcula elapsed em segundos a partir do createdAt real
export function getElapsedSeconds(order: Order): number {
  return Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 1000);
}
