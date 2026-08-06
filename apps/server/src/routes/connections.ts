import type { FastifyPluginAsync } from 'fastify';
import { testConnection, introspect } from '@apiforge/db-introspect';
import type { ConnectionConfig } from '@apiforge/shared';
import { z } from 'zod';
import { deleteConnection, listConnections, saveConnection } from '../db.js';

const connectionConfigSchema = z.object({
  engine: z.enum(['postgresql', 'mysql', 'sqlserver', 'sqlite']),
  host: z.string().optional(),
  port: z.number().optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  filePath: z.string().optional(),
  ssl: z.boolean().optional(),
  connectionString: z.string().optional(),
});

const saveConnectionSchema = z.object({
  name: z.string().min(1),
  config: connectionConfigSchema,
});

export const connectionsRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: ConnectionConfig }>('/connections/test', async (request) => {
    const config = connectionConfigSchema.parse(request.body) as ConnectionConfig;
    return testConnection(config);
  });

  app.post<{ Body: ConnectionConfig }>('/connections/introspect', async (request) => {
    const config = connectionConfigSchema.parse(request.body) as ConnectionConfig;
    return introspect(config);
  });

  app.post('/connections', async (request) => {
    const body = saveConnectionSchema.parse(request.body);
    const saved = saveConnection(body.name, body.config as ConnectionConfig);
    return saved;
  });

  app.get('/connections', async () => {
    return listConnections();
  });

  app.delete<{ Params: { id: string } }>('/connections/:id', async (request, reply) => {
    const deleted = deleteConnection(request.params.id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Connection not found' });
    }
    return { ok: true };
  });
};
