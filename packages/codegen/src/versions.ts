/**
 * Central pin list for generated projects.
 * Bump here when refreshing forge output targets.
 */

export const NODE_DOCKER_IMAGE = 'node:22-alpine';
export const DOTNET_DOCKER_SDK = 'mcr.microsoft.com/dotnet/sdk:10.0';
export const DOTNET_DOCKER_RUNTIME = 'mcr.microsoft.com/dotnet/aspnet:10.0';

export const NET_TARGET_FRAMEWORK = 'net10.0';

export const NET_PACKAGES = {
  dapper: '2.1.79',
  swashbuckle: '10.2.3',
  jwtBearer: '10.0.10',
  bcrypt: '4.2.1',
  jwtTokens: '8.22.0',
  npgsql: '10.0.3',
  mysqlConnector: '2.6.1',
  sqlClient: '7.0.2',
  sqlite: '10.0.10',
} as const;

export const NODE_COMMON = {
  typescript: '^5.9.3',
  typesNode: '^22.20.1',
  tsx: '^4.23.8',
  dotenv: '^17.4.2',
  bcryptjs: '^3.0.3',
  jsonwebtoken: '^9.0.3',
  typesJsonwebtoken: '^9.0.10',
  engines: '>=22',
} as const;

export const NODE_DRIVERS = {
  postgresql: { dep: 'pg', version: '^8.22.0', types: '@types/pg', typesVersion: '^8.20.4' },
  mysql: { dep: 'mysql2', version: '^3.23.2' },
  sqlserver: { dep: 'mssql', version: '^12.7.0' },
  sqlite: { dep: 'better-sqlite3', version: '^13.0.3' },
} as const;

export const NODE_EXPRESS = {
  express: '^5.2.1',
  cors: '^2.8.6',
  helmet: '^8.3.0',
  rateLimit: '^8.6.2',
  swaggerUi: '^5.0.1',
  swaggerJsdoc: '^6.3.0',
  typesExpress: '^5.0.6',
  typesCors: '^2.8.19',
  typesSwaggerUi: '^4.1.8',
  typesSwaggerJsdoc: '^6.0.4',
} as const;

export const NODE_FASTIFY = {
  fastify: '^5.11.2',
  cors: '^11.3.0',
  helmet: '^13.1.0',
  rateLimit: '^11.2.0',
  swagger: '^9.8.1',
  swaggerUi: '^6.1.1',
} as const;
