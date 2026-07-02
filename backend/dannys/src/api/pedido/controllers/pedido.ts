/**
 * pedido controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::pedido.pedido', ({ strapi }) => ({
  async update(ctx) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;

    if (data?.situacao === 'cancelado') {
      const existingOrder = await strapi.entityService.findOne('api::pedido.pedido', id);
      if (existingOrder && existingOrder.situacao !== 'recebido') {
        return ctx.forbidden('O pedido não pode ser cancelado pois já está em preparo ou além.');
      }
    }

    return super.update(ctx);
  }
}));
