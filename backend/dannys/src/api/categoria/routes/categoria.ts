/**
 * categoria router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::categoria.categoria', {
  config: {
    create: { policies: ['global::is-admin'] },
    update: { policies: ['global::is-admin'] },
    delete: { policies: ['global::is-admin'] },
  },
});
