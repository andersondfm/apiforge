import type { ConnectionConfig } from '@apiforge/shared';

export function buildConnectionString(config: ConnectionConfig): string {
  if (config.connectionString?.trim()) {
    return config.connectionString.trim();
  }

  switch (config.engine) {
    case 'postgresql': {
      const host = config.host || 'localhost';
      const port = config.port || 5432;
      const user = encodeURIComponent(config.username || 'postgres');
      const pass = encodeURIComponent(config.password || '');
      const db = config.database || 'postgres';
      const ssl = config.ssl ? '?sslmode=require' : '';
      return `postgresql://${user}:${pass}@${host}:${port}/${db}${ssl}`;
    }
    case 'mysql': {
      const host = config.host || 'localhost';
      const port = config.port || 3306;
      const user = encodeURIComponent(config.username || 'root');
      const pass = encodeURIComponent(config.password || '');
      const db = config.database || 'mysql';
      return `mysql://${user}:${pass}@${host}:${port}/${db}`;
    }
    case 'sqlserver': {
      const host = config.host || 'localhost';
      const port = config.port || 1433;
      const user = config.username || 'sa';
      const pass = config.password || '';
      const db = config.database || 'master';
      return `Server=${host},${port};Database=${db};User Id=${user};Password=${pass};Encrypt=${config.ssl ? 'true' : 'false'};TrustServerCertificate=true`;
    }
    case 'sqlite':
      if (!config.filePath) throw new Error('SQLite requires filePath');
      return config.filePath;
    default:
      throw new Error(`Unsupported engine`);
  }
}

export function defaultPort(engine: ConnectionConfig['engine']): number {
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
