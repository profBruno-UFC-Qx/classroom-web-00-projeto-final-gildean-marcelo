import type { Order } from "./types";

export interface AppState {
  orders:     Order[];
  activePage: string;
}

export const state: AppState = {
  orders:     [],
  activePage: "kds",
};
