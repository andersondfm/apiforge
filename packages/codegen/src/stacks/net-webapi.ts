import type { GenerateConfig, GeneratedFile, TableMeta } from '@apiforge/shared';
import { authSqlFile } from '../common/auth-sql.js';
import { dockerFiles } from '../common/docker.js';
import { envExample } from '../common/env.js';
import { readmeFile } from '../common/readme.js';
import { csharpNamespace, pascalCase, selectedTables } from '../helpers.js';
import {
  appsettingsFiles,
  applyCorsSnippet,
  csprojFile,
  generateAuthService,
  generateDbFactory,
  generateEntitySqlHelpers,
  generateModel,
  generateSecurityMiddlewareCs,
  jwtSetupSnippet,
  netPort,
} from './net-shared.js';

function generateController(config: GenerateConfig, table: TableMeta): GeneratedFile {
  const ns = csharpNamespace(config.projectName);
  const h = generateEntitySqlHelpers(config.connection.engine, table);
  const authAttr = config.auth.enabled ? '\n[Authorize]' : '';
  const pagination = config.includePagination;

  const listAction = pagination
    ? `    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);
        var offset = (page - 1) * limit;
        await using var conn = await _db.OpenConnectionAsync();
        var total = await conn.ExecuteScalarAsync<long>(@"${h.countSql}");
        var rows = (await conn.QueryAsync<${h.entity}>(
            @"${h.pagedSql}",
            new { Limit = limit, Offset = offset })).ToList();
        return Ok(new { data = rows, page, limit, total, totalPages = (int)Math.Ceiling(total / (double)limit) });
    }`
    : `    [HttpGet]
    public async Task<IActionResult> List()
    {
        await using var conn = await _db.OpenConnectionAsync();
        var rows = (await conn.QueryAsync<${h.entity}>(@"${h.listSql}")).ToList();
        return Ok(new { data = rows });
    }`;

  return {
    path: `Controllers/${h.entity}Controller.cs`,
    content: `using Dapper;
using ${ns}.Data;
using ${ns}.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ${ns}.Controllers;

[ApiController]
[Route("${h.route}")]${authAttr}
public class ${h.entity}Controller : ControllerBase
{
    private readonly IDbFactory _db;

    public ${h.entity}Controller(IDbFactory db)
    {
        _db = db;
    }

${listAction}

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id)
    {
        await using var conn = await _db.OpenConnectionAsync();
        var row = await conn.QuerySingleOrDefaultAsync<${h.entity}>(@"${h.getSql}", new { Id = id });
        if (row is null) return NotFound(new { error = "${h.entity} not found" });
        return Ok(row);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ${h.entity} body)
    {
        await using var conn = await _db.OpenConnectionAsync();
        await conn.ExecuteAsync(@"${h.insertSql}", body);
        return CreatedAtAction(nameof(Get), new { id = "created" }, body);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] ${h.entity} body)
    {
        await using var conn = await _db.OpenConnectionAsync();
        var affected = await conn.ExecuteAsync(@"${h.updateSql}", new { ${h.updates.map((c) => `${pascalCase(c.name)} = body.${pascalCase(c.name)}`).join(', ')}, Id = id });
        if (affected == 0) return NotFound(new { error = "${h.entity} not found" });
        var row = await conn.QuerySingleOrDefaultAsync<${h.entity}>(@"${h.getSql}", new { Id = id });
        return Ok(row);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        await using var conn = await _db.OpenConnectionAsync();
        var affected = await conn.ExecuteAsync(@"${h.deleteSql}", new { Id = id });
        if (affected == 0) return NotFound(new { error = "${h.entity} not found" });
        return NoContent();
    }
}
`,
    language: 'csharp',
  };
}

function generateAuthController(config: GenerateConfig): GeneratedFile | null {
  if (!config.auth.enabled) return null;
  const ns = csharpNamespace(config.projectName);
  const register = config.auth.includeRegister
    ? `
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] LoginRequest req)
    {
        var result = await _auth.RegisterAsync(req);
        if (result is null) return Conflict(new { error = "Username already taken" });
        return Created("/auth/register", result);
    }
`
    : '';

  return {
    path: 'Controllers/AuthController.cs',
    content: `using ${ns}.Auth;
using Microsoft.AspNetCore.Mvc;

namespace ${ns}.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;

    public AuthController(AuthService auth)
    {
        _auth = auth;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var result = await _auth.LoginAsync(req);
        if (result is null) return Unauthorized(new { error = "Invalid credentials" });
        return Ok(result);
    }
${register}}
`,
    language: 'csharp',
  };
}

function generateProgram(config: GenerateConfig): GeneratedFile {
  const ns = csharpNamespace(config.projectName);
  const port = netPort(config);

  return {
    path: 'Program.cs',
    content: `using ${ns}.Data;
using ${ns}.Middleware;
${config.auth.enabled ? `using ${ns}.Auth;\n` : ''}using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls(builder.Configuration["Urls"] ?? "http://localhost:${port}");

builder.Services.AddControllers();
builder.Services.AddSingleton<IDbFactory, DbFactory>();
${applyCorsSnippet(config)}
${jwtSetupSnippet(config)}
${
  config.includeSwagger
    ? `builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "${config.projectName}", Version = "v1" });
${
  config.auth.enabled
    ? `    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });`
    : ''
}
});
`
    : ''
}
var app = builder.Build();

app.UseMiddleware<IpAllowlistMiddleware>();
app.UseMiddleware<SimpleRateLimitMiddleware>();
app.UseMiddleware<ApiKeyMiddleware>();

if (builder.Configuration.GetValue("Security:CorsMode", "origins") != "disabled")
{
    app.UseCors();
}

${config.auth.enabled ? 'app.UseAuthentication();\napp.UseAuthorization();\n' : ''}
${
  config.includeSwagger
    ? `app.UseSwagger();
app.UseSwaggerUI();
`
    : ''
}
app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "${config.projectName}" }));
app.MapControllers();

app.Run();
`,
    language: 'csharp',
  };
}

export function generateNetWebApi(config: GenerateConfig): GeneratedFile[] {
  const tables = selectedTables(config);
  const files: GeneratedFile[] = [
    csprojFile(config),
    ...appsettingsFiles(config),
    envExample(config),
    readmeFile(config),
    generateDbFactory(config),
    generateSecurityMiddlewareCs(config),
    generateProgram(config),
  ];

  for (const table of tables) {
    files.push(generateModel(config, table));
    files.push(generateController(config, table));
  }

  files.push(...generateAuthService(config));
  const authCtrl = generateAuthController(config);
  if (authCtrl) files.push(authCtrl);

  const sql = authSqlFile(config);
  if (sql) files.push(sql);

  files.push(...dockerFiles(config));
  return files;
}
