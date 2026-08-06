import type { FastifyPluginAsync } from 'fastify';
import { detectAuth, detectAuthTables } from '@apiforge/db-introspect';
import type { ConnectionConfig, TableMeta } from '@apiforge/shared';
import { z } from 'zod';

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

const columnMetaSchema = z.object({
  name: z.string(),
  dataType: z.string(),
  isNullable: z.boolean(),
  isPrimaryKey: z.boolean(),
  isForeignKey: z.boolean(),
  isUnique: z.boolean(),
  isIdentity: z.boolean(),
  maxLength: z.number().nullable().optional(),
  defaultValue: z.string().nullable().optional(),
  foreignKeyTable: z.string().nullable().optional(),
  foreignKeyColumn: z.string().nullable().optional(),
  selected: z.boolean().optional(),
  sensitive: z.boolean().optional(),
});

const tableMetaSchema = z.object({
  schema: z.string(),
  name: z.string(),
  type: z.enum(['table', 'view']),
  columns: z.array(columnMetaSchema),
  selected: z.boolean().optional(),
});

const detectBodySchema = z.union([
  z.object({ tables: z.array(tableMetaSchema).min(1) }),
  connectionConfigSchema,
]);

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/detect', async (request) => {
    const body = detectBodySchema.parse(request.body);

    if ('tables' in body) {
      const detected = detectAuthTables(body.tables as TableMeta[]);
      return { detected };
    }

    const detected = await detectAuth(body as ConnectionConfig);
    return { detected };
  });
};
