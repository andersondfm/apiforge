import type {
  ConnectionConfig,
  DetectedAuthTable,
  IntrospectionResult,
} from '@apiforge/shared';
import { buildConnectionString } from './connection.js';
import { introspectMysql } from './mysql.js';
import { introspectPostgres } from './postgres.js';
import { introspectSqlite } from './sqlite.js';
import { introspectSqlServer } from './sqlserver.js';
import { detectAuthTables } from './auth-detect.js';

export { buildConnectionString } from './connection.js';
export { detectAuthTables } from './auth-detect.js';

export async function testConnection(config: ConnectionConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await introspect(config);
    return {
      ok: true,
      message: `Connected to ${config.engine} database "${result.database}" — ${result.tables.length} table(s) found.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message };
  }
}

export async function introspect(config: ConnectionConfig): Promise<IntrospectionResult> {
  switch (config.engine) {
    case 'postgresql':
      return introspectPostgres(config);
    case 'mysql':
      return introspectMysql(config);
    case 'sqlserver':
      return introspectSqlServer(config);
    case 'sqlite':
      return introspectSqlite(config);
    default:
      throw new Error(`Unsupported engine: ${(config as ConnectionConfig).engine}`);
  }
}

export async function detectAuth(config: ConnectionConfig): Promise<DetectedAuthTable[]> {
  const result = await introspect(config);
  return detectAuthTables(result.tables);
}
