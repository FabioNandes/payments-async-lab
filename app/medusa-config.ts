import { defineConfig, loadEnv } from '@medusajs/framework/utils';

/*
 * Sistema sob teste. Derivado do backend do `create-medusa-app` 2.21.2, sem rotas, subscribers,
 * workflows ou módulos customizados — a suíte testa o Medusa como ele é distribuído.
 *
 * A topologia é a de produção: o mesmo build roda em dois processos (MEDUSA_WORKER_MODE=server e
 * =worker) que só funcionam juntos porque compartilham o Redis — event bus (BullMQ), workflow
 * engine, cache e locks. É essa fronteira que o payments-async-lab testa.
 */

loadEnv(process.env.NODE_ENV || 'development', process.cwd());

const REDIS_URL = process.env.REDIS_URL;

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: REDIS_URL,
    workerMode: process.env.MEDUSA_WORKER_MODE as 'shared' | 'worker' | 'server',
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === 'true',
    backendUrl: process.env.MEDUSA_BACKEND_URL,
  },
  modules: [
    {
      resolve: '@medusajs/medusa/event-bus-redis',
      options: { redisUrl: REDIS_URL },
    },
    {
      resolve: '@medusajs/medusa/workflow-engine-redis',
      options: { redis: { redisUrl: REDIS_URL } },
    },
    {
      resolve: '@medusajs/medusa/caching',
      options: {
        providers: [
          {
            resolve: '@medusajs/medusa/caching-redis',
            id: 'caching-redis',
            is_default: true,
            options: { redisUrl: REDIS_URL },
          },
        ],
      },
    },
    {
      resolve: '@medusajs/medusa/locking',
      options: {
        providers: [
          {
            resolve: '@medusajs/medusa/locking-redis',
            id: 'locking-redis',
            is_default: true,
            options: { redisUrl: REDIS_URL },
          },
        ],
      },
    },
  ],
});
