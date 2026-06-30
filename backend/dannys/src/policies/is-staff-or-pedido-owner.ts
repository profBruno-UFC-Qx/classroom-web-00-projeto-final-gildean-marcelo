/**
 * is-staff-or-pedido-owner
 *
 * Aplicada em PUT /api/pedidos/:id. Libera a requisição se:
 *  - o usuário tem perfil "admin" ou "cozinha" (gestão de pedidos / KDS); ou
 *  - o usuário é o dono do pedido referenciado pela rota (ex.: cliente
 *    cancelando o próprio pedido em status.html).
 *
 * Sem essa policy, qualquer usuário autenticado conseguiria alterar a
 * situação/total/forma de pagamento de um pedido de outra pessoa.
 *
 * O :id da rota pode ser o documentId (Strapi v5, fluxo normal do
 * pedidoService) ou, em alguns pontos legados do front, o id numérico —
 * por isso tentamos os dois formatos antes de negar acesso.
 *
 * Uso: config.policies: ['global::is-staff-or-pedido-owner']
 */

const PERFIS_EQUIPE = ['admin', 'cozinha'];

export default async (ctx: any, _config: unknown, { strapi }: { strapi: any }) => {
  const user = ctx.state.user;
  if (!user) return false;

  if (PERFIS_EQUIPE.includes(user.perfil)) return true;

  const routeId = ctx.params.id;
  if (!routeId) return false;

  let pedido = await strapi
    .documents('api::pedido.pedido')
    .findOne({ documentId: String(routeId), populate: ['users_permissions_user'] })
    .catch(() => null);

  if (!pedido && /^\d+$/.test(String(routeId))) {
    pedido = await strapi.db.query('api::pedido.pedido').findOne({
      where: { id: Number(routeId) },
      populate: ['users_permissions_user'],
    });
  }

  const donoId = pedido?.users_permissions_user?.id;
  const ehDono = Boolean(donoId) && String(donoId) === String(user.id);

  if (!ehDono) {
    strapi.log.warn(
      `[is-staff-or-pedido-owner] Usuário ${user.id} (perfil=${user.perfil}) tentou alterar o pedido ${routeId} sem ser o dono.`
    );
  }

  return ehDono;
};
