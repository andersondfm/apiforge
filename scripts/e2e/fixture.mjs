import { DEFAULT_SECURITY } from '@apiforge/shared';
import path from 'node:path';

/** Shared products / users table metadata matching seed SQL across engines. */
export const PRODUCTS_TABLE = {
  schema: 'public',
  name: 'products',
  type: 'table',
  selected: true,
  source: 'introspected',
  operations: { list: true, get: true, create: true, update: true, delete: true },
  columns: [
    {
      name: 'id',
      dataType: 'int',
      isNullable: false,
      isPrimaryKey: true,
      isForeignKey: false,
      isUnique: true,
      isIdentity: true,
      selected: true,
    },
    {
      name: 'name',
      dataType: 'varchar',
      isNullable: false,
      isPrimaryKey: false,
      isForeignKey: false,
      isUnique: false,
      isIdentity: false,
      selected: true,
    },
    {
      name: 'price',
      dataType: 'decimal',
      isNullable: false,
      isPrimaryKey: false,
      isForeignKey: false,
      isUnique: false,
      isIdentity: false,
      selected: true,
    },
    {
      name: 'sku',
      dataType: 'varchar',
      isNullable: true,
      isPrimaryKey: false,
      isForeignKey: false,
      isUnique: true,
      isIdentity: false,
      selected: true,
    },
    {
      name: 'active',
      dataType: 'tinyint',
      isNullable: false,
      isPrimaryKey: false,
      isForeignKey: false,
      isUnique: false,
      isIdentity: false,
      selected: true,
    },
    {
      name: 'created_at',
      dataType: 'datetime',
      isNullable: false,
      isPrimaryKey: false,
      isForeignKey: false,
      isUnique: false,
      // DB default — omit from INSERT/UPDATE (same path as identity cols).
      isIdentity: true,
      selected: true,
    },
  ],
};

export const USERS_TABLE = {
  schema: 'public',
  name: 'users',
  type: 'table',
  selected: false,
  source: 'introspected',
  columns: [
    {
      name: 'id',
      dataType: 'int',
      isNullable: false,
      isPrimaryKey: true,
      isForeignKey: false,
      isUnique: true,
      isIdentity: true,
      selected: true,
    },
    {
      name: 'username',
      dataType: 'varchar',
      isNullable: false,
      isPrimaryKey: false,
      isForeignKey: false,
      isUnique: true,
      isIdentity: false,
      selected: true,
    },
    {
      name: 'password',
      dataType: 'varchar',
      isNullable: false,
      isPrimaryKey: false,
      isForeignKey: false,
      isUnique: false,
      isIdentity: false,
      selected: true,
      sensitive: true,
    },
    {
      name: 'created_at',
      dataType: 'datetime',
      isNullable: false,
      isPrimaryKey: false,
      isForeignKey: false,
      isUnique: false,
      isIdentity: false,
      selected: true,
    },
  ],
};

export const STACKS = ['node-express', 'node-fastify', 'net-minimal', 'net-webapi'];
export const ENGINES = ['mysql', 'postgresql', 'sqlserver', 'sqlite'];

export function connectionFor(engine, sqlitePath) {
  switch (engine) {
    case 'mysql':
      return {
        engine: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'demo',
        username: 'demo',
        password: 'demo',
        ssl: false,
      };
    case 'postgresql':
      return {
        engine: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'demo',
        username: 'demo',
        password: 'demo',
        ssl: false,
      };
    case 'sqlserver':
      return {
        engine: 'sqlserver',
        host: 'localhost',
        port: 1433,
        database: 'demo',
        username: 'sa',
        password: 'Your_strong_Password123',
        ssl: false,
      };
    case 'sqlite':
      return {
        engine: 'sqlite',
        filePath: sqlitePath,
        ssl: false,
      };
    default:
      throw new Error(`Unknown engine: ${engine}`);
  }
}

export function productsTableFor(engine) {
  const schema =
    engine === 'sqlserver' ? 'dbo' : engine === 'mysql' ? 'demo' : 'public';
  return { ...PRODUCTS_TABLE, schema };
}

/** Security relaxed for E2E (no rate-limit flakes across 16 cells). */
export function e2eSecurity() {
  return {
    ...DEFAULT_SECURITY,
    corsMode: 'all',
    corsOrigins: [],
    allowedIps: [],
    rateLimitEnabled: false,
    apiKeyEnabled: false,
    helmetEnabled: false,
  };
}

export function buildConfig({ stack, engine, projectName, port, sqlitePath }) {
  return {
    projectName,
    stack,
    connection: connectionFor(engine, sqlitePath),
    tables: [productsTableFor(engine)],
    auth: {
      enabled: false,
      mode: 'none',
      includeRegister: false,
      jwtExpiresIn: '24h',
    },
    security: e2eSecurity(),
    includeSwagger: false,
    includeDocker: false,
    includePagination: true,
    port,
  };
}

export function isNodeStack(stack) {
  return stack.startsWith('node-');
}

export function projectDirName(stack, engine) {
  return `e2e-${stack}-${engine}`;
}

export function defaultPort(stack, index) {
  return (isNodeStack(stack) ? 3100 : 5100) + index;
}

export function resolveSqlitePath(workRoot, stack) {
  return path.join(workRoot, `e2e-${stack}-sqlite.db`);
}
