/**
 * is-self-or-admin
 *
 * Aplicada em PUT /api/users/:id. Libera a requisição se:
 *  - o usuário é admin (pode editar qualquer conta, qualquer campo); ou
 *  - o usuário está editando a própria conta E não está tentando alterar
 *    um campo privilegiado (perfil, ativo, emServico, blocked, confirmed, role).
 *
 * Sem essa policy, qualquer usuário autenticado (cliente/cozinha) poderia
 * chamar PUT /api/users/:id com { "perfil": "admin" } no próprio registro
 * e se autopromover — essa é a vulnerabilidade que esta policy fecha.
 *
 * Uso: config.policies: ['global::is-self-or-admin']
 */

const CAMPOS_PRIVILEGIADOS = ['perfil', 'ativo', 'emServico', 'blocked', 'confirmed', 'role'];

export default (ctx: any, _config: unknown, { strapi }: { strapi: any }) => {
  const user = ctx.state.user;
  if (!user) return false;

  if (user.perfil === 'admin') return true;

  const isSelf = String(ctx.params.id) === String(user.id);
  if (!isSelf) {
    strapi.log.warn(
      `[is-self-or-admin] Usuário ${user.id} (perfil=${user.perfil}) tentou editar o usuário ${ctx.params.id}.`
    );
    return false;
  }

  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const camposTentados = CAMPOS_PRIVILEGIADOS.filter((campo) => campo in body);
  if (camposTentados.length > 0) {
    strapi.log.warn(
      `[is-self-or-admin] Usuário ${user.id} tentou alterar campo(s) privilegiado(s) no próprio perfil: ${camposTentados.join(', ')}.`
    );
    return false;
  }

  return true;
};
