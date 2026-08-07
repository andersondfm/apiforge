import type { GenerateConfig, GeneratedFile, TableMeta } from '@apiforge/shared';
import { authSqlFile } from '../common/auth-sql.js';
import { designedTableSqlFiles } from '../common/designed-sql.js';
import { dockerFiles } from '../common/docker.js';
import { envExample } from '../common/env.js';
import { readmeFile } from '../common/readme.js';
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
  selectedTables,
  tsSqlLiteral,
  updatableColumns,
} from '../helpers.js';
import { mapSqlToTs } from '../types-map.js';
import { generateDbTs, nodePackageJson, nodeTsConfig } from './node-shared.js';

function generateAuthPlugin(): GeneratedFile {
  return {
    path: 'src/plugins/auth.ts',
    content: `import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  sub: string | number;
  username: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    signToken: (user: AuthUser) => string;
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorate('signToken', (user: AuthUser) => {
    const secret = process.env.JWT_SECRET || 'change-me';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    return jwt.sign(user, secret, { expiresIn } as jwt.SignOptions);
  });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid Authorization header' });
    }
    try {
      const secret = process.env.JWT_SECRET || 'change-me';
      request.user = jwt.verify(header.slice(7), secret) as AuthUser;
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }
  });
};

export default fp(authPlugin);
`,
    language: 'typescript',
  };
}

function generateSecurityPlugin(config: GenerateConfig): GeneratedFile {
  const sec = config.security;
  return {
    path: 'src/plugins/security.ts',
    content: `import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

const securityPlugin: FastifyPluginAsync = async (app) => {
  if (process.env.HELMET_ENABLED !== 'false' && ${sec.helmetEnabled}) {
    await app.register(helmet);
  }

  const corsMode = process.env.CORS_MODE || '${sec.corsMode}';
  if (corsMode === 'all') {
    await app.register(cors, { origin: true });
  } else if (corsMode === 'origins') {
    const origins = (process.env.CORS_ORIGINS || '${sec.corsOrigins.join(',')}')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await app.register(cors, {
      origin: origins,
      credentials: true,
    });
  }

  const allowedIps = (process.env.ALLOWED_IPS || '${sec.allowedIps.join(',')}')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowedIps.length > 0) {
    app.addHook('onRequest', async (request, reply) => {
      const ip = (request.ip || '').replace('::ffff:', '');
      if (!allowedIps.includes(ip)) {
        return reply.status(403).send({ error: 'IP not allowed' });
      }
    });
  }

  if (process.env.RATE_LIMIT_ENABLED !== 'false' && ${sec.rateLimitEnabled}) {
    await app.register(rateLimit, {
      max: Number(process.env.RATE_LIMIT_PER_MINUTE || ${sec.rateLimitPerMinute}),
      timeWindow: '1 minute',
    });
  }

  if (process.env.API_KEY_ENABLED !== 'false' && ${sec.apiKeyEnabled}) {
    const headerName = (process.env.API_KEY_HEADER || '${sec.apiKeyHeader}').toLowerCase();
    app.addHook('onRequest', async (request, reply) => {
      const path = request.url.split('?')[0];
      if (path === '/health' || path.startsWith('/api-docs') || path.startsWith('/auth') || path.startsWith('/documentation')) {
        return;
      }
      const key = request.headers[headerName];
      if (!key || key !== process.env.API_KEY) {
        return reply.status(401).send({ error: 'Invalid API key' });
      }
    });
  }
};

export default fp(securityPlugin);
`,
    language: 'typescript',
  };
}

function generateAuthRoutesFastify(config: GenerateConfig): GeneratedFile {
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
  app.post('/register', async (request, reply) => {
    const body = request.body as { username?: string; password?: string };
    if (!body.username || !body.password) {
      return reply.status(400).send({ error: 'username and password are required' });
    }
    const { username, password } = body;
    const existing = await query(${tsSqlLiteral(findSql)}, ${findParams});
    if (existing.rows.length) {
      return reply.status(409).send({ error: 'Username already taken' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await query(${tsSqlLiteral(insertSql)}, ${insertParams});
    const id = (result.rows[0] as { id?: string | number } | undefined)?.id ?? 'new';
    const token = app.signToken({ sub: id, username });
    return reply.status(201).send({ token, user: { id, username } });
  });
`
    : '';

  return {
    path: 'src/routes/auth.ts',
    content: `import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/login', async (request, reply) => {
    const body = request.body as { username?: string; password?: string };
    if (!body.username || !body.password) {
      return reply.status(400).send({ error: 'username and password are required' });
    }
    const { username, password } = body;
    const result = await query<{ id: string | number; username: string; password: string }>(
      ${tsSqlLiteral(findSql)},
      ${findParams},
    );
    const user = result.rows[0];
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
    const token = app.signToken({ sub: user.id, username: user.username });
    return { token, user: { id: user.id, username: user.username } };
  });
${registerBlock}};

export default authRoutes;
`,
    language: 'typescript',
  };
}

function generateTableRouteFastify(config: GenerateConfig, table: TableMeta): GeneratedFile {
  const engine = config.connection.engine;
  const entity = pascalCase(table.name);
  const pk = pkColumn(table)!;
  const pkName = pk.name;
  const pubs = publicColumns(table);
  const inserts = insertableColumns(table).filter((c) => !c.isIdentity);
  const updates = updatableColumns(table);
  const qt = qualifiedTable(table, engine);
  const selectList = pubs.map((c) => quoteIdent(c.name, engine)).join(', ');
  const insertNames = inserts.map((c) => quoteIdent(c.name, engine)).join(', ');
  const preHandler = config.auth.enabled ? '{ preHandler: [app.authenticate] }' : '{}';
  const ops = defaultOperations(table);

  let insertPlaceholders: string;
  let insertParamsExpr: string;
  let getByIdSql: string;
  let getByIdParams: string;
  let updateSet: string;
  let updateParamsExpr: string;
  let updateWhere: string;
  let deleteSql: string;
  let deleteParams: string;
  let listSql: string;
  let listParams: string;
  let countParams: string;

  if (engine === 'sqlserver') {
    insertPlaceholders = inserts.map((c) => `@${camelCase(c.name)}`).join(', ');
    insertParamsExpr = `{ ${inserts.map((c) => `${camelCase(c.name)}: body.${camelCase(c.name)}`).join(', ')} }`;
    getByIdSql = `SELECT ${selectList} FROM ${qt} WHERE ${quoteIdent(pkName, engine)} = @id`;
    getByIdParams = '{ id }';
    updateSet = updates.map((c) => `${quoteIdent(c.name, engine)} = @${camelCase(c.name)}`).join(', ');
    updateParamsExpr = `{ ${updates.map((c) => `${camelCase(c.name)}: body.${camelCase(c.name)}`).join(', ')}, id }`;
    updateWhere = `${quoteIdent(pkName, engine)} = @id`;
    deleteSql = `DELETE FROM ${qt} WHERE ${quoteIdent(pkName, engine)} = @id`;
    deleteParams = '{ id }';
    listSql = config.includePagination
      ? `SELECT ${selectList} FROM ${qt} ORDER BY ${quoteIdent(pkName, engine)} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
      : `SELECT ${selectList} FROM ${qt}`;
    listParams = config.includePagination ? '{ limit, offset }' : '{}';
    countParams = '{}';
  } else if (engine === 'postgresql') {
    insertPlaceholders = inserts.map((_, i) => `$${i + 1}`).join(', ');
    insertParamsExpr = `[${inserts.map((c) => `body.${camelCase(c.name)}`).join(', ')}]`;
    getByIdSql = `SELECT ${selectList} FROM ${qt} WHERE ${quoteIdent(pkName, engine)} = $1`;
    getByIdParams = '[id]';
    updateSet = updates.map((c, i) => `${quoteIdent(c.name, engine)} = $${i + 1}`).join(', ');
    updateParamsExpr = `[${updates.map((c) => `body.${camelCase(c.name)}`).join(', ')}, id]`;
    updateWhere = `${quoteIdent(pkName, engine)} = $${updates.length + 1}`;
    deleteSql = `DELETE FROM ${qt} WHERE ${quoteIdent(pkName, engine)} = $1`;
    deleteParams = '[id]';
    listSql = config.includePagination
      ? `SELECT ${selectList} FROM ${qt} ORDER BY 1 LIMIT $1 OFFSET $2`
      : `SELECT ${selectList} FROM ${qt}`;
    listParams = config.includePagination ? '[limit, offset]' : '[]';
    countParams = '[]';
  } else {
    insertPlaceholders = inserts.map(() => '?').join(', ');
    insertParamsExpr = `[${inserts.map((c) => `body.${camelCase(c.name)}`).join(', ')}]`;
    getByIdSql = `SELECT ${selectList} FROM ${qt} WHERE ${quoteIdent(pkName, engine)} = ?`;
    getByIdParams = '[id]';
    updateSet = updates.map((c) => `${quoteIdent(c.name, engine)} = ?`).join(', ');
    updateParamsExpr = `[${updates.map((c) => `body.${camelCase(c.name)}`).join(', ')}, id]`;
    updateWhere = `${quoteIdent(pkName, engine)} = ?`;
    deleteSql = `DELETE FROM ${qt} WHERE ${quoteIdent(pkName, engine)} = ?`;
    deleteParams = '[id]';
    listSql = config.includePagination
      ? `SELECT ${selectList} FROM ${qt} ORDER BY 1 LIMIT ? OFFSET ?`
      : `SELECT ${selectList} FROM ${qt}`;
    listParams = config.includePagination ? '[limit, offset]' : '[]';
    countParams = '[]';
  }

  const returning =
    engine === 'postgresql' ? ` RETURNING ${selectList}` : '';

  const interfaceFields = pubs
    .map((c) => `  ${camelCase(c.name)}${c.isNullable ? '?' : ''}: ${mapSqlToTs(c.dataType)};`)
    .join('\n');

  const listHandler = config.includePagination
    ? `    const page = Math.max(1, Number((request.query as { page?: string }).page) || 1);
    const limit = Math.min(100, Math.max(1, Number((request.query as { limit?: string }).limit) || 20));
    const offset = (page - 1) * limit;
    const countResult = await query<{ total: number | string }>(${tsSqlLiteral(`SELECT COUNT(*) AS total FROM ${qt}`)}, ${countParams});
    const total = Number(countResult.rows[0]?.total ?? 0);
    const result = await query(${tsSqlLiteral(listSql)}, ${listParams});
    return {
      data: result.rows.map((r) => mapRow(r as Record<string, unknown>)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };`
    : `    const result = await query(${tsSqlLiteral(listSql)}, ${listParams});
    return { data: result.rows.map((r) => mapRow(r as Record<string, unknown>)) };`;

  const insertSqlPg = `INSERT INTO ${qt} (${insertNames}) VALUES (${insertPlaceholders})${returning}`;
  const insertSqlOther = `INSERT INTO ${qt} (${insertNames}) VALUES (${insertPlaceholders})`;
  const updateSqlFull = `UPDATE ${qt} SET ${updateSet} WHERE ${updateWhere}`;

  const createHandler =
    engine === 'postgresql'
      ? `    const result = await query(
      ${tsSqlLiteral(insertSqlPg)},
      ${insertParamsExpr},
    );
    return reply.status(201).send(mapRow(result.rows[0] as Record<string, unknown>));`
      : `    const result = await query(
      ${tsSqlLiteral(insertSqlOther)},
      ${insertParamsExpr},
    );
    return reply.status(201).send({ ok: true, affected: result.rowCount });`;

  return {
    path: `src/routes/${kebabCase(table.name)}.ts`,
    content: `import type { FastifyPluginAsync } from 'fastify';
import { query } from '../db.js';

export interface ${entity} {
${interfaceFields}
}

function mapRow(row: Record<string, unknown>): ${entity} {
  return {
${pubs.map((c) => `    ${camelCase(c.name)}: row['${c.name}'] as ${mapSqlToTs(c.dataType)},`).join('\n')}
  };
}

const routes: FastifyPluginAsync = async (app) => {
${
  ops.list
    ? `  app.get('/', ${preHandler}, async (request) => {
${listHandler}
  });
`
    : ''
}${
  ops.get
    ? `  app.get<{ Params: { id: string } }>('/:id', ${preHandler}, async (request, reply) => {
    const id = request.params.id;
    const result = await query(${tsSqlLiteral(getByIdSql)}, ${getByIdParams});
    if (!result.rows.length) {
      return reply.status(404).send({ error: '${entity} not found' });
    }
    return mapRow(result.rows[0] as Record<string, unknown>);
  });
`
    : ''
}${
  ops.create
    ? `  app.post('/', ${preHandler}, async (request, reply) => {
    const body = request.body as Partial<${entity}>;
${createHandler}
  });
`
    : ''
}${
  ops.update
    ? `  app.put<{ Params: { id: string } }>('/:id', ${preHandler}, async (request, reply) => {
    const id = request.params.id;
    const body = request.body as Partial<${entity}>;
    const result = await query(
      ${tsSqlLiteral(updateSqlFull)},
      ${updateParamsExpr},
    );
    if (!result.rowCount) {
      return reply.status(404).send({ error: '${entity} not found' });
    }
    const fresh = await query(${tsSqlLiteral(getByIdSql)}, ${getByIdParams});
    return fresh.rows[0] ? mapRow(fresh.rows[0] as Record<string, unknown>) : { ok: true };
  });
`
    : ''
}${
  ops.delete
    ? `  app.delete<{ Params: { id: string } }>('/:id', ${preHandler}, async (request, reply) => {
    const id = request.params.id;
    const result = await query(${tsSqlLiteral(deleteSql)}, ${deleteParams});
    if (!result.rowCount) {
      return reply.status(404).send({ error: '${entity} not found' });
    }
    return reply.status(204).send();
  });
`
    : ''
}};

export default routes;
`,
    language: 'typescript',
  };
}

function indexTs(config: GenerateConfig, tables: TableMeta[]): GeneratedFile {
  const routeImports = tables
    .map((t) => {
      const file = kebabCase(t.name);
      const varName = `${routeName(t).replace(/-/g, '_')}Routes`;
      return `import ${varName} from './routes/${file}.js';`;
    })
    .join('\n');

  const routeRegisters = tables
    .map((t) => {
      const varName = `${routeName(t).replace(/-/g, '_')}Routes`;
      return `  await app.register(${varName}, { prefix: '/${routeName(t)}' });`;
    })
    .join('\n');

  const authBits = config.auth.enabled
    ? `import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
`
    : '';

  const swaggerBits = config.includeSwagger
    ? `import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
`
    : '';

  return {
    path: 'src/index.ts',
    content: `import 'dotenv/config';
import Fastify from 'fastify';
import securityPlugin from './plugins/security.js';
${authBits}${swaggerBits}${routeImports}

const port = Number(process.env.PORT || ${config.port});

async function main() {
  const app = Fastify({ logger: true });

  await app.register(securityPlugin);
${config.auth.enabled ? '  await app.register(authPlugin);\n' : ''}${
      config.includeSwagger
        ? `  await app.register(swagger, {
    openapi: {
      info: { title: '${config.projectName}', version: '1.0.0' },
      ${
        config.auth.enabled
          ? `components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },`
          : ''
      }
    },
  });
  await app.register(swaggerUi, { routePrefix: '/api-docs' });
`
        : ''
    }
  app.get('/health', async () => ({ status: 'ok', service: '${config.projectName}' }));

${config.auth.enabled ? "  await app.register(authRoutes, { prefix: '/auth' });\n" : ''}${routeRegisters}

  await app.listen({ port, host: '0.0.0.0' });
  console.log(\`[${config.projectName}] listening on http://localhost:\${port}\`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`,
    language: 'typescript',
  };
}

export function generateNodeFastify(config: GenerateConfig): GeneratedFile[] {
  const tables = selectedTables(config);
  const pkg = nodePackageJson(config, 'fastify');
  // Ensure fastify-plugin is present for auth/security plugins
  const pkgJson = JSON.parse(pkg.content) as {
    dependencies: Record<string, string>;
  };
  pkgJson.dependencies['fastify-plugin'] = '^5.0.1';
  pkg.content = `${JSON.stringify(pkgJson, null, 2)}\n`;

  const files: GeneratedFile[] = [
    pkg,
    nodeTsConfig(),
    envExample(config),
    readmeFile(config),
    generateDbTs(config),
    generateSecurityPlugin(config),
    indexTs(config, tables),
  ];

  if (config.auth.enabled) {
    files.push(generateAuthPlugin(), generateAuthRoutesFastify(config));
  }

  for (const table of tables) {
    files.push(generateTableRouteFastify(config, table));
  }

  const sql = authSqlFile(config);
  if (sql) files.push(sql);
  files.push(...designedTableSqlFiles(config));

  files.push(...dockerFiles(config));
  return files;
}
