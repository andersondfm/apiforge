export type DbEngine = 'postgresql' | 'mysql' | 'sqlserver' | 'sqlite';

export type GeneratedStack =
  | 'net-minimal'
  | 'net-webapi'
  | 'node-express'
  | 'node-fastify';

export type CorsMode = 'all' | 'origins' | 'disabled';

export interface ConnectionConfig {
  engine: DbEngine;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  /** Absolute path for SQLite */
  filePath?: string;
  ssl?: boolean;
  connectionString?: string;
}

export interface ColumnMeta {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
  isIdentity: boolean;
  maxLength?: number | null;
  defaultValue?: string | null;
  foreignKeyTable?: string | null;
  foreignKeyColumn?: string | null;
  /** Whether to include this column in generated API */
  selected?: boolean;
  /** Hide from public responses */
  sensitive?: boolean;
}

/** Which CRUD HTTP operations to generate for a table. Omitted keys default to true (views: list+get only). */
export interface TableOperations {
  list?: boolean;
  get?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
}

export interface TableMeta {
  schema: string;
  name: string;
  type: 'table' | 'view';
  columns: ColumnMeta[];
  selected?: boolean;
  /** introspected from DB vs designed in the canvas */
  source?: 'introspected' | 'designed';
  operations?: TableOperations;
  /** Stable canvas node id (designed tables / UI) */
  id?: string;
}

export interface ForeignKeyMeta {
  schema: string;
  table: string;
  column: string;
  referencedSchema: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface IntrospectionResult {
  engine: DbEngine;
  database: string;
  tables: TableMeta[];
  foreignKeys: ForeignKeyMeta[];
}

export interface AuthConfig {
  enabled: boolean;
  /** Use existing table or create a new users table */
  mode: 'existing' | 'create' | 'none';
  tableSchema?: string;
  tableName?: string;
  usernameColumn?: string;
  passwordColumn?: string;
  idColumn?: string;
  jwtSecret?: string;
  jwtExpiresIn?: string;
  includeRefreshToken?: boolean;
  includeRegister?: boolean;
}

export interface SecurityConfig {
  corsMode: CorsMode;
  corsOrigins: string[];
  allowedIps: string[];
  rateLimitEnabled: boolean;
  rateLimitPerMinute: number;
  apiKeyEnabled: boolean;
  apiKeyHeader: string;
  helmetEnabled: boolean;
}

export interface GenerateConfig {
  projectName: string;
  stack: GeneratedStack;
  connection: ConnectionConfig;
  tables: TableMeta[];
  auth: AuthConfig;
  security: SecurityConfig;
  includeSwagger: boolean;
  includeDocker: boolean;
  includePagination: boolean;
  port: number;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language?: string;
}

export interface GeneratePreview {
  files: GeneratedFile[];
  endpoints: EndpointPreview[];
  tree: string[];
}

export interface EndpointPreview {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  authRequired: boolean;
}

export interface ProjectRecord {
  id: string;
  name: string;
  stack: GeneratedStack;
  createdAt: string;
  config: GenerateConfig;
}

export interface DetectedAuthTable {
  schema: string;
  table: string;
  usernameColumn: string;
  passwordColumn: string;
  idColumn: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface SavedConnection {
  id: string;
  name: string;
  engine: string;
  config: ConnectionConfig;
  createdAt: string;
}

export const STACK_LABELS: Record<GeneratedStack, string> = {
  'net-minimal': '.NET 10 Minimal API',
  'net-webapi': '.NET 10 Web API (Controllers)',
  'node-express': 'Node.js Express',
  'node-fastify': 'Node.js Fastify',
};

export const ENGINE_LABELS: Record<DbEngine, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  sqlserver: 'SQL Server',
  sqlite: 'SQLite',
};

export const DEFAULT_SECURITY: SecurityConfig = {
  corsMode: 'origins',
  corsOrigins: ['http://localhost:5173', 'http://localhost:3000'],
  allowedIps: [],
  rateLimitEnabled: true,
  rateLimitPerMinute: 100,
  apiKeyEnabled: false,
  apiKeyHeader: 'x-api-key',
  helmetEnabled: true,
};

export const DEFAULT_AUTH: AuthConfig = {
  enabled: true,
  mode: 'create',
  tableName: 'users',
  usernameColumn: 'username',
  passwordColumn: 'password',
  idColumn: 'id',
  jwtExpiresIn: '24h',
  includeRefreshToken: false,
  includeRegister: true,
};

export const FULL_OPERATIONS: Required<TableOperations> = {
  list: true,
  get: true,
  create: true,
  update: true,
  delete: true,
};

export const READ_OPERATIONS: Required<TableOperations> = {
  list: true,
  get: true,
  create: false,
  update: false,
  delete: false,
};

export function defaultOperations(table: Pick<TableMeta, 'type' | 'operations'>): Required<TableOperations> {
  const base = table.type === 'view' ? READ_OPERATIONS : FULL_OPERATIONS;
  return {
    list: table.operations?.list ?? base.list,
    get: table.operations?.get ?? base.get,
    create: table.operations?.create ?? base.create,
    update: table.operations?.update ?? base.update,
    delete: table.operations?.delete ?? base.delete,
  };
}

export function hasAnyOperation(table: Pick<TableMeta, 'type' | 'operations'>): boolean {
  const ops = defaultOperations(table);
  return ops.list || ops.get || ops.create || ops.update || ops.delete;
}

export const COLUMN_TYPE_OPTIONS: Record<DbEngine, string[]> = {
  postgresql: ['SERIAL', 'BIGSERIAL', 'INTEGER', 'BIGINT', 'VARCHAR(255)', 'TEXT', 'BOOLEAN', 'TIMESTAMPTZ', 'UUID', 'NUMERIC', 'JSONB'],
  mysql: ['INT AUTO_INCREMENT', 'BIGINT', 'VARCHAR(255)', 'TEXT', 'TINYINT(1)', 'DATETIME', 'DECIMAL(18,2)', 'JSON'],
  sqlserver: ['INT IDENTITY(1,1)', 'BIGINT', 'NVARCHAR(255)', 'NVARCHAR(MAX)', 'BIT', 'DATETIME2', 'UNIQUEIDENTIFIER', 'DECIMAL(18,2)'],
  sqlite: ['INTEGER', 'TEXT', 'REAL', 'BLOB'],
};

export function defaultPort(engine: DbEngine): number {
  switch (engine) {
    case 'postgresql':
      return 5432;
    case 'mysql':
      return 3306;
    case 'sqlserver':
      return 1433;
    case 'sqlite':
      return 0;
    default:
      throw new Error(`Unsupported engine: ${engine}`);
  }
}

export function createInitialConfig(): GenerateConfig {
  return {
    projectName: 'my-api',
    stack: 'node-express',
    connection: {
      engine: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: '',
      username: '',
      password: '',
      ssl: false,
    },
    tables: [],
    auth: { ...DEFAULT_AUTH },
    security: {
      ...DEFAULT_SECURITY,
      corsOrigins: [...DEFAULT_SECURITY.corsOrigins],
      allowedIps: [],
    },
    includeSwagger: true,
    includeDocker: true,
    includePagination: true,
    port: 3000,
  };
}
