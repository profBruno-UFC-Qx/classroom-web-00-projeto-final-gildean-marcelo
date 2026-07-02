/**
 * is-admin
 *
 * Libera a requisição apenas para usuários autenticados cujo campo
 * customizado `perfil` (plugin::users-permissions.user) seja "admin".
 *
 * A role "Authenticated" do Strapi é compartilhada por cliente/cozinha/admin
 * (não existe distinção nativa de perfil por role) — esta policy é quem
 * efetivamente bloqueia rotas de escrita sensíveis para não-admins.
 *
 * Uso: config.policies: ['global::is-admin']
 */
export default (ctx: any, _config: unknown, { strapi }: { strapi: any }) => {
  const user = ctx.state.user;

  if (!user || user.perfil !== 'admin') {
    strapi.log.warn(
      `[is-admin] Acesso negado a ${ctx.request?.method ?? ctx.method} ${ctx.request?.path ?? ctx.path} para usuário ${user?.id ?? 'anônimo'} (perfil=${user?.perfil ?? 'n/a'}).`
    );
    return false;
  }

  return true;
};
