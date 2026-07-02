/**
 * produto router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::produto.produto', {
  config: {
    create: { policies: ['global::is-admin'] },
    update: { policies: ['global::is-admin'] },
    delete: { policies: ['global::is-admin'] },
  },
});
