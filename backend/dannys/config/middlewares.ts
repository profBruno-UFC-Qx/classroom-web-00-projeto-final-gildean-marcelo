import type { Core } from '@strapi/strapi';

export default ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      // Lista de origins liberadas, separadas por vírgula em CORS_ORIGIN.
      // Em produção, defina CORS_ORIGIN no .env com o(s) domínio(s) real(is)
      // do frontend (ex.: https://dannys.seudomain.com). Os valores abaixo
      // são apenas o fallback de desenvolvimento (Vite dev/preview).
      origin: env.array('CORS_ORIGIN', ['http://localhost:5173', 'http://localhost:4173']),
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
