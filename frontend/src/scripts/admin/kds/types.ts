export type OrderStatus = "new" | "preparing" | "ready";
export type OrderType   = "Delivery" | "Balcão" | "Salão";
export type NoteType    = "remove" | "add" | "info";

export interface OrderNote {
  type: NoteType;
  text: string;
}

export interface OrderItem {
  id:       string;
  quantity: number;
  name:     string;
  notes:    OrderNote[];
}

export interface Order {
  id:                     string;
  number:                 number;
  type:                   OrderType;
  status:                 OrderStatus;
  createdAt:              string;
  urgentThresholdSeconds: number;
  items:                  OrderItem[];
  generalNote?:           string;
}

export interface KDSColumn {
  status:   OrderStatus;
  label:    string;
  dotClass: string;
}
