/**
 * Extensão do plugin Users & Permissions: adiciona policies às rotas
 * nativas de User e uma rota customizada de criação de funcionário,
 * sem precisar "ejetar" o plugin inteiro.
 *
 *  - POST /api/users           (user.create) → global::is-admin
 *      Mantida restrita a admin por padrão, mas o admin painel deixou de
 *      usá-la para cadastrar funcionário (ver /users/employees abaixo) —
 *      essa rota nativa exige "role" no corpo e o cliente não tem como
 *      saber esse id sem expor a lista de roles do Strapi.
 *      Cadastro público de cliente continua liberado, pois usa outra rota:
 *      /api/auth/local/register (não afetada por esta extensão).
 *
 *  - PUT  /api/users/:id       (user.update) → global::is-self-or-admin
 *      Permite que o próprio usuário edite seu perfil (perfil.html) e que
 *      o admin edite qualquer funcionário, mas bloqueia um cliente/cozinha
 *      de alterar campos privilegiados (perfil, ativo, etc.) na própria conta.
 *
 *  - POST /api/users/employees (user.createEmployee) → global::is-admin
 *      Rota custom para o admin cadastrar funcionário (admin/cozinha).
 *      Resolve o Role nativo do Strapi (Settings → Advanced Settings →
 *      "Default role for authenticated users") no servidor, do mesmo jeito
 *      que /api/auth/local/register já faz — o frontend não precisa
 *      descobrir/enviar esse id.
 */
export default (plugin: any) => {
  const routes = plugin.routes['content-api'].routes;

  const createUserRoute = routes.find((r: any) => r.method === 'POST' && r.path === '/users');
  if (createUserRoute) {
    createUserRoute.config = {
      ...(createUserRoute.config ?? {}),
      policies: [...(createUserRoute.config?.policies ?? []), 'global::is-admin'],
    };
  }

  const updateUserRoute = routes.find((r: any) => r.method === 'PUT' && r.path === '/users/:id');
  if (updateUserRoute) {
    updateUserRoute.config = {
      ...(updateUserRoute.config ?? {}),
      policies: [...(updateUserRoute.config?.policies ?? []), 'global::is-self-or-admin'],
    };
  }

  plugin.controllers.user.createEmployee = async (ctx: any) => {
    const { username, email, password, whatsapp, cpf, endereco, perfil, ativo, emServico } =
      (ctx.request.body ?? {}) as Record<string, unknown>;

    if (!username || !email || !password) {
      return ctx.badRequest('username, email e password são obrigatórios.');
    }

    const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });
    const settings = (await pluginStore.get({ key: 'advanced' })) as { default_role: string };

    const role = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: settings.default_role } });

    if (!role) {
      return ctx.internalServerError('Role padrão do Strapi não encontrada (Advanced Settings).');
    }

    const emailLower = String(email).toLowerCase();

    const jaExiste = await strapi.db.query('plugin::users-permissions.user').count({
      where: { $or: [{ email: emailLower }, { username }] },
    });
    if (jaExiste > 0) {
      return ctx.badRequest('Email ou username já cadastrado.');
    }

    const user = await strapi.plugin('users-permissions').service('user').add({
      username,
      email: emailLower,
      password,
      provider: 'local',
      confirmed: true,
      role: role.id,
      whatsapp,
      cpf,
      endereco,
      perfil,
      ativo,
      emServico,
    });

    const schema = strapi.getModel('plugin::users-permissions.user');
    ctx.body = await strapi.contentAPI.sanitize.output(user, schema, { auth: ctx.state.auth });
  };

  routes.push({
    method: 'POST',
    path: '/users/employees',
    handler: 'user.createEmployee',
    config: { prefix: '', policies: ['global::is-admin'] },
  });

  return plugin;
};
