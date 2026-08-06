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
