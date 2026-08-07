import { csharpNamespace, defaultOperations, pascalCase, selectedTables } from '../helpers.js';
import { designedTableSqlFiles } from '../common/designed-sql.js';
import { authSqlFile } from '../common/auth-sql.js';
import { dockerFiles } from '../common/docker.js';
import { envExample } from '../common/env.js';
import { readmeFile } from '../common/readme.js';
import type { GenerateConfig, GeneratedFile, TableMeta } from '@apiforge/shared';
import {
  appsettingsFiles,
  applyCorsSnippet,
  csharpIdValInit,
  csharpSqlLiteral,
  csprojFile,
  generateAuthService,
  generateDbFactory,
  generateEntitySqlHelpers,
  generateModel,
  generateSecurityMiddlewareCs,
  jwtSetupSnippet,
  netPort,
  swaggerMiddlewareSnippet,
  swaggerServicesSnippet,
} from './net-shared.js';

function generateEndpointFile(config: GenerateConfig, table: TableMeta): GeneratedFile {
  const ns = csharpNamespace(config.projectName);
  const h = generateEntitySqlHelpers(config.connection.engine, table);
  const authAttr = config.auth.enabled ? '\n        .RequireAuthorization()' : '';
  const pagination = config.includePagination;
  const ops = defaultOperations(table);

  const listBody = pagination
    ? `            var page = Math.Max(1, pageQuery ?? 1);
            var limit = Math.Clamp(limitQuery ?? 20, 1, 100);
            var offset = (page - 1) * limit;
            await using var conn = await db.OpenConnectionAsync();
            var total = await conn.ExecuteScalarAsync<long>(${csharpSqlLiteral(h.countSql)});
            var rows = (await conn.QueryAsync<${h.entity}>(
                ${csharpSqlLiteral(h.pagedSql)},
                new { Limit = limit, Offset = offset })).ToList();
            return Results.Ok(new { data = rows, page, limit, total, totalPages = (int)Math.Ceiling(total / (double)limit) });`
    : `            await using var conn = await db.OpenConnectionAsync();
            var rows = (await conn.QueryAsync<${h.entity}>(${csharpSqlLiteral(h.listSql)})).ToList();
            return Results.Ok(new { data = rows });`;

  const handlers = [
    ops.list
      ? `
        group.MapGet("/", async (IDbFactory db${pagination ? ', [FromQuery] int? pageQuery, [FromQuery] int? limitQuery' : ''}) =>
        {
${listBody}
        });`
      : '',
    ops.get
      ? `
        group.MapGet("/{id}", async (string id, IDbFactory db) =>
        {
            ${csharpIdValInit('id')}
            await using var conn = await db.OpenConnectionAsync();
            var row = await conn.QuerySingleOrDefaultAsync<${h.entity}>(${csharpSqlLiteral(h.getSql)}, new { Id = idVal });
            return row is null ? Results.NotFound(new { error = "${h.entity} not found" }) : Results.Ok(row);
        });`
      : '',
    ops.create
      ? `
        group.MapPost("/", async (${h.entity} body, IDbFactory db) =>
        {
            await using var conn = await db.OpenConnectionAsync();
            await conn.ExecuteAsync(${csharpSqlLiteral(h.insertSql)}, body);
            return Results.Created($"/${h.route}", body);
        });`
      : '',
    ops.update
      ? `
        group.MapPut("/{id}", async (string id, ${h.entity} body, IDbFactory db) =>
        {
            ${csharpIdValInit('id')}
            await using var conn = await db.OpenConnectionAsync();
            var affected = await conn.ExecuteAsync(${csharpSqlLiteral(h.updateSql)}, new { ${h.updates.map((c) => `${pascalCase(c.name)} = body.${pascalCase(c.name)}`).join(', ')}, Id = idVal });
            if (affected == 0) return Results.NotFound(new { error = "${h.entity} not found" });
            var row = await conn.QuerySingleOrDefaultAsync<${h.entity}>(${csharpSqlLiteral(h.getSql)}, new { Id = idVal });
            return Results.Ok(row);
        });`
      : '',
    ops.delete
      ? `
        group.MapDelete("/{id}", async (string id, IDbFactory db) =>
        {
            ${csharpIdValInit('id')}
            await using var conn = await db.OpenConnectionAsync();
            var affected = await conn.ExecuteAsync(${csharpSqlLiteral(h.deleteSql)}, new { Id = idVal });
            return affected == 0 ? Results.NotFound(new { error = "${h.entity} not found" }) : Results.NoContent();
        });`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    path: `Endpoints/${h.entity}Endpoints.cs`,
    content: `using Dapper;
using ${ns}.Data;
using ${ns}.Models;
using Microsoft.AspNetCore.Mvc;

namespace ${ns}.Endpoints;

public static class ${h.entity}Endpoints
{
    public static RouteGroupBuilder Map${h.entity}Endpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/${h.route}")
            .WithTags("${h.entity}")${authAttr};
${handlers}

        return group;
    }
}
`,
    language: 'csharp',
  };
}

function generateProgram(config: GenerateConfig, tables: TableMeta[]): GeneratedFile {
  const ns = csharpNamespace(config.projectName);
  const port = netPort(config);
  const mapCalls = tables.map((t) => `app.Map${pascalCase(t.name)}Endpoints();`).join('\n');

  const authEndpoints = config.auth.enabled
    ? `
var auth = app.MapGroup("/auth").WithTags("Auth");
auth.MapPost("/login", async (${ns}.Auth.LoginRequest req, ${ns}.Auth.AuthService authService) =>
{
    var result = await authService.LoginAsync(req);
    return result is null ? Results.Unauthorized() : Results.Ok(result);
});
${
  config.auth.includeRegister
    ? `auth.MapPost("/register", async (${ns}.Auth.LoginRequest req, ${ns}.Auth.AuthService authService) =>
{
    var result = await authService.RegisterAsync(req);
    return result is null ? Results.Conflict(new { error = "Username already taken" }) : Results.Created("/auth/register", result);
});`
    : ''
}
`
    : '';

  return {
    path: 'Program.cs',
    content: `using ${ns}.Data;
using ${ns}.Middleware;
${tables.length ? `using ${ns}.Endpoints;\n` : ''}${config.auth.enabled ? `using ${ns}.Auth;\n` : ''}using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls(builder.Configuration["Urls"] ?? "http://localhost:${port}");

builder.Services.AddSingleton<IDbFactory, DbFactory>();
${applyCorsSnippet(config)}
${jwtSetupSnippet(config)}
${swaggerServicesSnippet(config)}
var app = builder.Build();

Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;

app.UseMiddleware<IpAllowlistMiddleware>();
app.UseMiddleware<SimpleRateLimitMiddleware>();
app.UseMiddleware<ApiKeyMiddleware>();

if (builder.Configuration.GetValue("Security:CorsMode", "origins") != "disabled")
{
    app.UseCors();
}

${config.auth.enabled ? 'app.UseAuthentication();\napp.UseAuthorization();\n' : ''}
${swaggerMiddlewareSnippet(config)}
app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "${config.projectName}" }));
${authEndpoints}
${mapCalls}

app.Run();
`,
    language: 'csharp',
  };
}

export function generateNetMinimal(config: GenerateConfig): GeneratedFile[] {
  const tables = selectedTables(config);
  const files: GeneratedFile[] = [
    csprojFile(config),
    ...appsettingsFiles(config),
    envExample(config),
    readmeFile(config),
    generateDbFactory(config),
    generateSecurityMiddlewareCs(config),
    generateProgram(config, tables),
  ];

  for (const table of tables) {
    files.push(generateModel(config, table));
    files.push(generateEndpointFile(config, table));
  }

  files.push(...generateAuthService(config));

  const sql = authSqlFile(config);
  if (sql) files.push(sql);
  files.push(...designedTableSqlFiles(config));

  files.push(...dockerFiles(config));
  return files;
}
