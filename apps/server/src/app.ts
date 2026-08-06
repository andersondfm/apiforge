import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { connectionsRoutes } from './routes/connections.js';
import { authRoutes } from './routes/auth.js';
import { generateRoutes } from './routes/generate.js';
import { projectsRoutes } from './routes/projects.js';
import { healthRoutes } from './routes/health.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1',
    ],
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      const message = error.errors.map((e) => e.message).join('; ') || 'Validation error';
      return reply.status(400).send({ error: message });
    }

    const err = error as { statusCode?: number; message?: string };
    const statusCode = err.statusCode ?? 500;
    const message = err.message || 'Internal Server Error';
    app.log.error(error);
    return reply.status(statusCode).send({ error: message });
  });

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(connectionsRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(generateRoutes, { prefix: '/api' });
  await app.register(projectsRoutes, { prefix: '/api' });

  return app;
}
