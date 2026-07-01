import { pedidoService } from "@/services/PedidoService";
import { mapEntityToOrder } from "./mappers";
import { state } from "./state";
import type { Order } from "./types";

// =============================================================================
// SERVICE LAYER  (fina camada sobre o pedidoService)
// =============================================================================

export const OrderService = {
  /**
   * Busca pedidos ativos no KDS (recebido + preparando).
   * Fonte: pedidoService.listParaKDS() com populate de itens.produto.
   */
  async getOrders(): Promise<Order[]> {
    const { data } = await pedidoService.listParaKDS();
    return data.map(mapEntityToOrder);
  },

  /**
   * Avança o status de um pedido.
   * "preparing" → pedidoService.iniciarPreparo()
   * "ready"     → pedidoService.marcarPronto()
   */
  async updateStatus(id: string, status: "preparing" | "ready"): Promise<void> {
    const numId = Number(id);
    if (status === "preparing") await pedidoService.iniciarPreparo(numId);
    if (status === "ready")     await pedidoService.marcarPronto(numId);
  },

  /**
   * Remove um pedido "pronto" do KDS marcando-o como entregue.
   * Chama pedidoService.marcarEntregue() e remove do estado local.
   */
  async dismissOrder(id: string): Promise<void> {
    await pedidoService.marcarEntregue(Number(id));
    state.orders = state.orders.filter((o) => o.id !== id);
  },
};
