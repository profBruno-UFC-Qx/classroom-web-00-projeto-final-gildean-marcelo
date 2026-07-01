import { pedidoService } from "@/services/PedidoService";
import { mapEntityToPedido, mapEntityToPedidoDetail, mapStatusToSituacao } from "./mappers";
import type { GetOrdersParams, PaginatedResult, Pedido, PedidoDetail } from "./types";

export const HistoricoPedidoService = {
  /**
   * Lista pedidos com paginação e filtros.
   * Mapeia os parâmetros internos da UI para a query do Strapi.
   *
   * Endpoint: GET /api/pedidos (herdado de StrapiCrudService.list) — [6]
   */
  async getOrders(params: GetOrdersParams): Promise<PaginatedResult<Pedido>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filters: Record<string, any> = {};

    // ── Filtro de status ────────────────────────────────────────────────
    if (params.status && params.status !== "all") {
      const situacao = mapStatusToSituacao(params.status);
      if (situacao) filters.situacao = { $eq: situacao };
    }

    // ── Filtro de data ──────────────────────────────────────────────────
    if (params.dateFilter) {
      const now   = new Date();
      const start = new Date(now);

      if (params.dateFilter === "today") {
        start.setHours(0, 0, 0, 0);
      } else if (params.dateFilter === "week") {
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
      } else if (params.dateFilter === "month") {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
      }

      filters.createdAt = { $gte: start.toISOString() };
    }

    // ── Busca — [1] [2] ─────────────────────────────────────────────────
    // Se o termo for numérico → busca por ID do pedido.
    // Se for texto → busca por username do cliente.
    // Para buscar os dois juntos em uma query, adicione suporte a $or no
    // buildQueryParams do StrapiCrudService.
    if (params.search) {
      const cleaned  = params.search.replace("#", "").trim();
      const asNumber = Number(cleaned);

      if (!isNaN(asNumber) && cleaned !== "") {
        filters.id = { $eq: asNumber };                                   // [2]
      } else {
        filters.users_permissions_user = { username: { $containsi: cleaned } }; // [1]
      }
    }

    const result = await pedidoService.list({
      pagination: { page: params.page, pageSize: params.pageSize },
      filters,
      populate:   ["users_permissions_user"],
      sort:       ["createdAt:desc"],
    });

    return {
      data:       result.data.map(mapEntityToPedido),
      total:      result.pagination.total,
      page:       result.pagination.page,
      pageSize:   result.pagination.pageSize,
      totalPages: result.pagination.pageCount,
    };
  },

  /**
   * Detalhe completo de um pedido (com itens e produto populados).
   * Endpoint: GET /api/pedidos/:id?populate=usuario,itens,itens.produto
   */
  async getOrderDetail(id: string): Promise<PedidoDetail | undefined> {
    try {
      const entity = await pedidoService.getWithRelations(Number(id));
      return mapEntityToPedidoDetail(entity);
    } catch {
      return undefined;
    }
  },

  /**
   * Cancela / estorna um pedido.
   * Endpoint: PUT /api/pedidos/:id  { situacao: "cancelado" }
   */
  async cancelOrder(id: string): Promise<void> {
    await pedidoService.cancelar(Number(id));
  },

  /**
   * Reimprimir comanda.
   * [4] Endpoint customizado não existe ainda — usando window.print() temporariamente.
   * Para implementar no Strapi:
   *   1. Crie src/api/pedido/routes/custom.ts com POST /api/pedidos/:id/reimprimir
   *   2. Implemente o controller que aciona a impressora (node-thermal-printer, etc.)
   *   3. Substitua window.print() pela chamada httpClient.post abaixo:
   *      await httpClient.post(`/api/pedidos/${id}/reimprimir`)
   */
  async reprintOrder(id: string): Promise<void> {
    console.log(`[Orders] Reimprimir pedido ${id}`);
    window.print(); // [4] substituir pelo endpoint customizado
  },
};
