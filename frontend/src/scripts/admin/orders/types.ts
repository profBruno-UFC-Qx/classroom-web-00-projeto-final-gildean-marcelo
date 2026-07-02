// Todos os status do Strapi representados na UI
export type PedidoStatus    = "new" | "preparing" | "ready" | "delivered" | "cancelled";
export type PedidoTipo      = "Delivery" | "Balcão";
export type PedidoPagamento = "pix" | "card";
export type StatusFilter    = PedidoStatus | "all";
export type DateFilter      = "today" | "week" | "month";

export interface Pedido {
  id:       string;
  number:   number;
  datetime: string;
  customer: string;
  type:     PedidoTipo;
  payment:  PedidoPagamento;
  total:    number;
  status:   PedidoStatus;
}

export interface PedidoItem {
  id:        string;
  name:      string;
  quantity:  number;
  unitPrice: number;
}

export interface PedidoDetail extends Pedido {
  deliveryAddress?: string;  // usuario.endereco — [3]
  tableInfo?:       string;  // reservado para quando TipoEntrega.Salao existir
  items:            PedidoItem[];
  notes?:           string;  // observacao_geral
}

export interface PaginatedResult<T> {
  data:       T[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}

export interface GetOrdersParams {
  page:        number;
  pageSize:    number;
  search?:     string;
  status?:     StatusFilter;
  dateFilter?: DateFilter;
}
