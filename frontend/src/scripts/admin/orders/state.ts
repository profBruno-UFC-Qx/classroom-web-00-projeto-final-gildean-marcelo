import type { DateFilter, Pedido, PedidoDetail, StatusFilter } from "./types";

export interface OrdersPageState {
  orders:             Pedido[];
  currentPage:        number;
  totalOrders:        number;
  pageSize:           number;
  totalPages:         number;
  searchQuery:        string;
  statusFilter:       StatusFilter;
  dateFilter:         DateFilter;
  isLoading:          boolean;
  activeDropdown:     "status" | "date" | null;
  activeOrderId:      string | null;
  activeOrderDetail:  PedidoDetail | null;
}

export const state: OrdersPageState = {
  orders:            [],
  currentPage:       1,
  totalOrders:       0,
  pageSize:          10,
  totalPages:        1,
  searchQuery:       "",
  statusFilter:      "all",
  dateFilter:        "today",
  isLoading:         false,
  activeDropdown:    null,
  activeOrderId:     null,
  activeOrderDetail: null,
};
