import type { ColumnMeta, DbEngine, GenerateConfig, GeneratedFile, TableMeta } from '@apiforge/shared';
import {
  camelCase,
  defaultOperations,
  insertableColumns,
  kebabCase,
  pascalCase,
  pkColumn,
  publicColumns,
  qualifiedTable,
  quoteIdent,
  routeName,
  sanitizeProjectName,
  updatableColumns,
} from '../helpers.js';
import { mapSqlToTs } from '../types-map.js';
import { NODE_COMMON, NODE_DRIVERS, NODE_EXPRESS, NODE_FASTIFY } from '../versions.js';

export function dbDriverPackage(
  engine: DbEngine,
): { dep: string; version: string; types?: string; typesVersion?: string } {
  const driver = NODE_DRIVERS[engine];
  if (!driver) throw new Error(`Unsupported engine: ${engine}`);
  return driver;
}

export function nodePackageJson(config: GenerateConfig, framework: 'express' | 'fastify'): GeneratedFile {
  const name = sanitizeProjectName(config.projectName).toLowerCase();
  const driver = dbDriverPackage(config.connection.engine);
  const deps: Record<string, string> = {
    dotenv: NODE_COMMON.dotenv,
    [driver.dep]: driver.version,
  };
  const devDeps: Record<string, string> = {
    typescript: NODE_COMMON.typescript,
    '@types/node': NODE_COMMON.typesNode,
    tsx: NODE_COMMON.tsx,
  };
  if (driver.types) {
    devDeps[driver.types] = driver.typesVersion ?? '*';
  }

  if (framework === 'express') {
    deps.express = NODE_EXPRESS.express;
    deps.cors = NODE_EXPRESS.cors;
    deps.helmet = NODE_EXPRESS.helmet;
    deps['express-rate-limit'] = NODE_EXPRESS.rateLimit;
    deps['swagger-ui-express'] = NODE_EXPRESS.swaggerUi;
    deps['swagger-jsdoc'] = NODE_EXPRESS.swaggerJsdoc;
    devDeps['@types/express'] = NODE_EXPRESS.typesExpress;
    devDeps['@types/cors'] = NODE_EXPRESS.typesCors;
    devDeps['@types/swagger-ui-express'] = NODE_EXPRESS.typesSwaggerUi;
    devDeps['@types/swagger-jsdoc'] = NODE_EXPRESS.typesSwaggerJsdoc;
  } else {
    deps.fastify = NODE_FASTIFY.fastify;
    deps['@fastify/cors'] = NODE_FASTIFY.cors;
    deps['@fastify/helmet'] = NODE_FASTIFY.helmet;
    deps['@fastify/rate-limit'] = NODE_FASTIFY.rateLimit;
    deps['@fastify/swagger'] = NODE_FASTIFY.swagger;
    deps['@fastify/swagger-ui'] = NODE_FASTIFY.swaggerUi;
  }

  if (config.auth.enabled) {
    deps.bcryptjs = NODE_COMMON.bcryptjs;
    deps.jsonwebtoken = NODE_COMMON.jsonwebtoken;
    devDeps['@types/jsonwebtoken'] = NODE_COMMON.typesJsonwebtoken;
  }

  const pkg = {
    name,
    version: '1.0.0',
    private: true,
    type: 'module',
    engines: { node: NODE_COMMON.engines },
    scripts: {
      dev: 'tsx watch src/index.ts',
      build: 'tsc -p tsconfig.json',
      start: 'node dist/index.js',
    },
    dependencies: deps,
    devDependencies: devDeps,
  };

  return {
    path: 'package.json',
    content: `${JSON.stringify(pkg, null, 2)}\n`,
    language: 'json',
  };
}

export function nodeTsConfig(): GeneratedFile {
  return {
    path: 'tsconfig.json',
    content: `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          outDir: 'dist',
          rootDir: 'src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          resolveJsonModule: true,
        },
        include: ['src/**/*'],
      },
      null,
      2,
    )}\n`,
    language: 'json',
  };
}

export function generateDbTs(config: GenerateConfig): GeneratedFile {
  const engine = config.connection.engine;
  let content = '';

  if (engine === 'postgresql') {
    content = `import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; rowCount: number }> {
  const result = await pool.query(text, params);
  return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
}

export async function getClient() {
  return pool.connect();
}

export default pool;
`;
  } else if (engine === 'mysql') {
    content = `import mysql from 'mysql2/promise';
import 'dotenv/config';

const pool = mysql.createPool(process.env.DATABASE_URL || {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mydb',
  waitForConnections: true,
  connectionLimit: 10,
});

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; rowCount: number }> {
  const [rows, meta] = await pool.execute(text, params);
  const list = Array.isArray(rows) ? (rows as T[]) : [];
  const rowCount = typeof meta === 'object' && meta && 'affectedRows' in meta
    ? Number((meta as { affectedRows: number }).affectedRows)
    : list.length;
  return { rows: list, rowCount };
}

export default pool;
`;
  } else if (engine === 'sqlserver') {
    content = `import sql from 'mssql';
import 'dotenv/config';

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  pool = await sql.connect(connectionString);
  return pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: Record<string, unknown> | unknown[] = {},
): Promise<{ rows: T[]; rowCount: number }> {
  const p = await getPool();
  const request = p.request();
  if (params && !Array.isArray(params)) {
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value as string | number | boolean | Date | null | Buffer);
    }
  }
  const result = await request.query(text);
  return { rows: (result.recordset || []) as T[], rowCount: result.rowsAffected?.[0] ?? 0 };
}

export { sql };
`;
  } else {
    content = `import Database from 'better-sqlite3';
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';

const dbPath = process.env.DATABASE_URL || './data/app.db';
const dir = path.dirname(dbPath);
if (dir && dir !== '.' && !fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; rowCount: number }> {
  const trimmed = text.trim().toLowerCase();
  if (trimmed.startsWith('select') || trimmed.startsWith('pragma')) {
    const rows = db.prepare(text).all(...params) as T[];
    return { rows, rowCount: rows.length };
  }
  const info = db.prepare(text).run(...params);
  return { rows: [] as T[], rowCount: info.changes };
}

export default db;
`;
  }

  return { path: 'src/db.ts', content, language: 'typescript' };
}

function colSelectList(cols: ColumnMeta[], engine: DbEngine): string {
  return cols.map((c) => quoteIdent(c.name, engine)).join(', ');
}

function buildListSql(table: TableMeta, engine: DbEngine, pagination: boolean): { sql: string; countSql: string } {
  const cols = publicColumns(table);
  const qt = qualifiedTable(table, engine);
  const select = colSelectList(cols, engine);
  if (!pagination) {
    return {
      sql: `SELECT ${select} FROM ${qt}`,
      countSql: `SELECT COUNT(*) AS total FROM ${qt}`,
    };
  }
  if (engine === 'sqlserver') {
    const pk = pkColumn(table);
    const order = pk ? quoteIdent(pk.name, engine) : '1';
    return {
      sql: `SELECT ${select} FROM ${qt} ORDER BY ${order} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      countSql: `SELECT COUNT(*) AS total FROM ${qt}`,
    };
  }
  if (engine === 'postgresql') {
    return {
      sql: `SELECT ${select} FROM ${qt} ORDER BY 1 LIMIT $1 OFFSET $2`,
      countSql: `SELECT COUNT(*) AS total FROM ${qt}`,
    };
  }
  return {
    sql: `SELECT ${select} FROM ${qt} ORDER BY 1 LIMIT ? OFFSET ?`,
    countSql: `SELECT COUNT(*) AS total FROM ${qt}`,
  };
}

export function generateTableRouteExpress(config: GenerateConfig, table: TableMeta): GeneratedFile {
  const engine = config.connection.engine;
  const route = routeName(table);
  const entity = pascalCase(table.name);
  const pk = pkColumn(table)!;
  const pkName = pk.name;
  const cols = selectedColumnsSafe(table);
  const pubs = publicColumns(table);
  const inserts = insertableColumns(table).filter((c) => !c.isPrimaryKey || !c.isIdentity);
  const updates = updatableColumns(table);
  const qt = qualifiedTable(table, engine);
  const list = buildListSql(table, engine, config.includePagination);
  const authGuard = config.auth.enabled ? 'authenticate, ' : '';
  const ops = defaultOperations(table);

  const insertCols = inserts.length ? inserts : cols.filter((c) => c.name !== pkName || !c.isIdentity);
  const insertNames = insertCols.map((c) => quoteIdent(c.name, engine)).join(', ');

  let insertPlaceholders: string;
  let insertParamsExpr: string;
  let getByIdSql: string;
  let getByIdParams: string;
  let updateSet: string;
  let updateParamsExpr: string;
  let deleteSql: string;
  let deleteParams: string;
  let listParamsExpr: string;
  let countParamsExpr: string;

  if (engine === 'sqlserver') {
    insertPlaceholders = insertCols.map((c) => `@${camelCase(c.name)}`).join(', ');
    insertParamsExpr = `{ ${insertCols.map((c) => `${camelCase(c.name)}: body.${camelCase(c.name)}`).join(', ')} }`;
    getByIdSql = `SELECT ${colSelectList(pubs, engine)} FROM ${qt} WHERE ${quoteIdent(pkName, engine)} = @id`;
    getByIdParams = '{ id }';
    updateSet = updates.map((c) => `${quoteIdent(c.name, engine)} = @${camelCase(c.name)}`).join(', ');
    updateParamsExpr = `{ ${updates.map((c) => `${camelCase(c.name)}: body.${camelCase(c.name)}`).join(', ')}, id }`;
    deleteSql = `DELETE FROM ${qt} WHERE ${quoteIdent(pkName, engine)} = @id`;
    deleteParams = '{ id }';
    listParamsExpr = '{ limit, offset }';
    countParamsExpr = '{}';
  } else if (engine === 'postgresql') {
    insertPlaceholders = insertCols.map((_, i) => `$${i + 1}`).join(', ');
    insertParamsExpr = `[${insertCols.map((c) => `body.${camelCase(c.name)}`).join(', ')}]`;
    getByIdSql = `SELECT ${colSelectList(pubs, engine)} FROM ${qt} WHERE ${quoteIdent(pkName, engine)} = $1`;
    getByIdParams = '[id]';
    updateSet = updates.map((c, i) => `${quoteIdent(c.name, engine)} = $${i + 1}`).join(', ');
    updateParamsExpr = `[${updates.map((c) => `body.${camelCase(c.name)}`).join(', ')}, id]`;
    const updatePkIdx = updates.length + 1;
    deleteSql = `DELETE FROM ${qt} WHERE ${quoteIdent(pkName, engine)} = $1`;
    deleteParams = '[id]';
    listParamsExpr = '[limit, offset]';
    countParamsExpr = '[]';
    // fix update WHERE to use correct placeholder
    updateSet = updates.map((c, i) => `${quoteIdent(c.name, engine)} = $${i + 1}`).join(', ');
    void updatePkIdx;
  } else {
    insertPlaceholders = insertCols.map(() => '?').join(', ');
    insertParamsExpr = `[${insertCols.map((c) => `body.${camelCase(c.name)}`).join(', ')}]`;
    getByIdSql = `SELECT ${colSelectList(pubs, engine)} FROM ${qt} WHERE ${quoteIdent(pkName, engine)} = ?`;
    getByIdParams = '[id]';
    updateSet = updates.map((c) => `${quoteIdent(c.name, engine)} = ?`).join(', ');
    updateParamsExpr = `[${updates.map((c) => `body.${camelCase(c.name)}`).join(', ')}, id]`;
    deleteSql = `DELETE FROM ${qt} WHERE ${quoteIdent(pkName, engine)} = ?`;
    deleteParams = '[id]';
    listParamsExpr = '[limit, offset]';
    countParamsExpr = '[]';
  }

  const updateWhere =
    engine === 'postgresql'
      ? `${quoteIdent(pkName, engine)} = $${updates.length + 1}`
      : engine === 'sqlserver'
        ? `${quoteIdent(pkName, engine)} = @id`
        : `${quoteIdent(pkName, engine)} = ?`;

  const returning =
    engine === 'postgresql'
      ? ` RETURNING ${colSelectList(pubs, engine)}`
      : '';

  const interfaceFields = pubs
    .map((c) => `  ${camelCase(c.name)}${c.isNullable ? '?' : ''}: ${mapSqlToTs(c.dataType)};`)
    .join('\n');

  const mapRow = `function mapRow(row: Record<string, unknown>): ${entity} {
  return {
${pubs.map((c) => `    ${camelCase(c.name)}: row['${c.name}'] as ${mapSqlToTs(c.dataType)},`).join('\n')}
  };
}`;

  const paginationBlock = config.includePagination
    ? `  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const countResult = await query<{ total: number | string }>(\`${list.countSql}\`, ${countParamsExpr});
  const total = Number(countResult.rows[0]?.total ?? 0);
  const result = await query(\`${list.sql}\`, ${listParamsExpr});
  res.json({
    data: result.rows.map((r) => mapRow(r as Record<string, unknown>)),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  });`
    : `  const result = await query(\`${list.sql.replace(/ LIMIT.*$/, '').replace(/ ORDER BY 1 OFFSET.*$/, '')}\`, ${engine === 'sqlserver' ? '{}' : '[]'});
  res.json({ data: result.rows.map((r) => mapRow(r as Record<string, unknown>)) });`;

  // Fix list SQL for non-pagination case in the string above - better to handle cleanly
  const listHandler = config.includePagination
    ? paginationBlock
    : (() => {
        const simpleSql = `SELECT ${colSelectList(pubs, engine)} FROM ${qt}`;
        const params = engine === 'sqlserver' ? '{}' : '[]';
        return `  const result = await query(\`${simpleSql}\`, ${params});
  res.json({ data: result.rows.map((r) => mapRow(r as Record<string, unknown>)) });`;
      })();

  const createFetch =
    engine === 'postgresql'
      ? `  const result = await query(
    \`INSERT INTO ${qt} (${insertNames}) VALUES (${insertPlaceholders})${returning}\`,
    ${insertParamsExpr},
  );
  res.status(201).json(mapRow(result.rows[0] as Record<string, unknown>));`
      : `  const result = await query(
    \`INSERT INTO ${qt} (${insertNames}) VALUES (${insertPlaceholders})\`,
    ${insertParamsExpr},
  );
  res.status(201).json({ ok: true, affected: result.rowCount });`;

  const content = `import { Router } from 'express';
import { query } from '../db.js';
${config.auth.enabled ? "import { authenticate } from '../middleware/auth.js';\n" : ''}
export interface ${entity} {
${interfaceFields}
}

${mapRow}

const router = Router();
${
  ops.list
    ? `
/** List ${table.name} */
router.get('/', ${authGuard}async (req, res, next) => {
  try {
${listHandler}
  } catch (err) {
    next(err);
  }
});
`
    : ''
}${
  ops.get
    ? `
/** Get ${table.name} by id */
router.get('/:id', ${authGuard}async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await query(\`${getByIdSql}\`, ${getByIdParams});
    if (!result.rows.length) {
      res.status(404).json({ error: '${entity} not found' });
      return;
    }
    res.json(mapRow(result.rows[0] as Record<string, unknown>));
  } catch (err) {
    next(err);
  }
});
`
    : ''
}${
  ops.create
    ? `
/** Create ${table.name} */
router.post('/', ${authGuard}async (req, res, next) => {
  try {
    const body = req.body as Partial<${entity}>;
${createFetch}
  } catch (err) {
    next(err);
  }
});
`
    : ''
}${
  ops.update
    ? `
/** Update ${table.name} */
router.put('/:id', ${authGuard}async (req, res, next) => {
  try {
    const id = req.params.id;
    const body = req.body as Partial<${entity}>;
    const result = await query(
      \`UPDATE ${qt} SET ${updateSet} WHERE ${updateWhere}\`,
      ${updateParamsExpr},
    );
    if (!result.rowCount) {
      res.status(404).json({ error: '${entity} not found' });
      return;
    }
    const fresh = await query(\`${getByIdSql}\`, ${getByIdParams});
    res.json(fresh.rows[0] ? mapRow(fresh.rows[0] as Record<string, unknown>) : { ok: true });
  } catch (err) {
    next(err);
  }
});
`
    : ''
}${
  ops.delete
    ? `
/** Delete ${table.name} */
router.delete('/:id', ${authGuard}async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await query(\`${deleteSql}\`, ${deleteParams});
    if (!result.rowCount) {
      res.status(404).json({ error: '${entity} not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
`
    : ''
}
export default router;
`;

  return {
    path: `src/routes/${kebabCase(table.name)}.ts`,
    content,
    language: 'typescript',
  };
}

function selectedColumnsSafe(table: TableMeta): ColumnMeta[] {
  return table.columns.filter((c) => c.selected !== false);
}

export function generateAuthMiddleware(): GeneratedFile {
  return {
    path: 'src/middleware/auth.ts',
    content: `import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  sub: string | number;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  const token = header.slice(7);
  try {
    const secret = process.env.JWT_SECRET || 'change-me';
    const payload = jwt.verify(token, secret) as AuthUser;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function signToken(user: AuthUser): string {
  const secret = process.env.JWT_SECRET || 'change-me';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  return jwt.sign(user, secret, { expiresIn } as jwt.SignOptions);
}
`,
    language: 'typescript',
  };
}

export function generateSecurityMiddleware(config: GenerateConfig): GeneratedFile {
  const sec = config.security;
  return {
    path: 'src/middleware/security.ts',
    content: `import type { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export function applySecurity(app: Express): void {
  if (process.env.HELMET_ENABLED !== 'false' && ${sec.helmetEnabled}) {
    app.use(helmet());
  }

  const corsMode = process.env.CORS_MODE || '${sec.corsMode}';
  if (corsMode === 'all') {
    app.use(cors());
  } else if (corsMode === 'origins') {
    const origins = (process.env.CORS_ORIGINS || '${sec.corsOrigins.join(',')}')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    app.use(
      cors({
        origin: (origin, cb) => {
          if (!origin || origins.includes(origin)) cb(null, true);
          else cb(new Error('Not allowed by CORS'));
        },
        credentials: true,
      }),
    );
  }

  const allowedIps = (process.env.ALLOWED_IPS || '${sec.allowedIps.join(',')}')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowedIps.length > 0) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const ip = (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');
      if (!allowedIps.includes(ip) && !allowedIps.includes(req.ip || '')) {
        res.status(403).json({ error: 'IP not allowed' });
        return;
      }
      next();
    });
  }

  const rateEnabled = (process.env.RATE_LIMIT_ENABLED || '${sec.rateLimitEnabled}') === 'true' || ${sec.rateLimitEnabled};
  if (rateEnabled && process.env.RATE_LIMIT_ENABLED !== 'false') {
    const windowMs = 60_000;
    const max = Number(process.env.RATE_LIMIT_PER_MINUTE || ${sec.rateLimitPerMinute});
    app.use(
      rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many requests' },
      }),
    );
  }

  const apiKeyEnabled = (process.env.API_KEY_ENABLED || '${sec.apiKeyEnabled}') === 'true' || ${sec.apiKeyEnabled};
  if (apiKeyEnabled && process.env.API_KEY_ENABLED !== 'false') {
    const headerName = (process.env.API_KEY_HEADER || '${sec.apiKeyHeader}').toLowerCase();
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/health') || req.path.startsWith('/api-docs') || req.path.startsWith('/auth')) {
        next();
        return;
      }
      const key = req.headers[headerName];
      if (!key || key !== process.env.API_KEY) {
        res.status(401).json({ error: 'Invalid API key' });
        return;
      }
      next();
    });
  }
}
`,
    language: 'typescript',
  };
}

export function generateAuthRoutesExpress(config: GenerateConfig): GeneratedFile {
  const table = config.auth.tableName || 'users';
  const userCol = config.auth.usernameColumn || 'username';
  const passCol = config.auth.passwordColumn || 'password';
  const idCol = config.auth.idColumn || 'id';
  const engine = config.connection.engine;
  const schema = config.auth.tableSchema;
  const qt =
    engine === 'sqlserver'
      ? `[${schema || 'dbo'}].[${table}]`
      : engine === 'postgresql' && schema && schema !== 'public'
        ? `"${schema}"."${table}"`
        : engine === 'mysql'
          ? `\`${table}\``
          : engine === 'postgresql'
            ? `"${table}"`
            : `"${table}"`;

  const findSql =
    engine === 'sqlserver'
      ? `SELECT ${quoteIdent(idCol, engine)} AS id, ${quoteIdent(userCol, engine)} AS username, ${quoteIdent(passCol, engine)} AS password FROM ${qt} WHERE ${quoteIdent(userCol, engine)} = @username`
      : engine === 'postgresql'
        ? `SELECT ${quoteIdent(idCol, engine)} AS id, ${quoteIdent(userCol, engine)} AS username, ${quoteIdent(passCol, engine)} AS password FROM ${qt} WHERE ${quoteIdent(userCol, engine)} = $1`
        : `SELECT ${quoteIdent(idCol, engine)} AS id, ${quoteIdent(userCol, engine)} AS username, ${quoteIdent(passCol, engine)} AS password FROM ${qt} WHERE ${quoteIdent(userCol, engine)} = ?`;

  const findParams = engine === 'sqlserver' ? '{ username }' : '[username]';

  const insertSql =
    engine === 'sqlserver'
      ? `INSERT INTO ${qt} (${quoteIdent(userCol, engine)}, ${quoteIdent(passCol, engine)}) VALUES (@username, @password)`
      : engine === 'postgresql'
        ? `INSERT INTO ${qt} (${quoteIdent(userCol, engine)}, ${quoteIdent(passCol, engine)}) VALUES ($1, $2) RETURNING ${quoteIdent(idCol, engine)} AS id`
        : `INSERT INTO ${qt} (${quoteIdent(userCol, engine)}, ${quoteIdent(passCol, engine)}) VALUES (?, ?)`;

  const insertParams = engine === 'sqlserver' ? '{ username, password: hash }' : '[username, hash]';

  const registerBlock = config.auth.includeRegister
    ? `
router.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ error: 'username and password are required' });
      return;
    }
    const existing = await query(\`${findSql}\`, ${findParams});
    if (existing.rows.length) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await query(\`${insertSql}\`, ${insertParams});
    const id = (result.rows[0] as { id?: string | number } | undefined)?.id ?? 'new';
    const token = signToken({ sub: id, username });
    res.status(201).json({ token, user: { id, username } });
  } catch (err) {
    next(err);
  }
});
`
    : '';

  return {
    path: 'src/routes/auth.ts',
    content: `import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ error: 'username and password are required' });
      return;
    }
    const result = await query<{ id: string | number; username: string; password: string }>(
      \`${findSql}\`,
      ${findParams},
    );
    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = signToken({ sub: user.id, username: user.username });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    next(err);
  }
});
${registerBlock}
export default router;
`,
    language: 'typescript',
  };
}
