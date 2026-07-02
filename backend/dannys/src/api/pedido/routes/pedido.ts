/**
 * pedido router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::pedido.pedido', {
  config: {
    // create fica aberto a qualquer usuário autenticado (cliente fazendo um pedido).
    // update é restrito à equipe (admin/cozinha) ou ao dono do pedido (ex.: cancelar).
    update: { policies: ['global::is-staff-or-pedido-owner'] },
  },
});
