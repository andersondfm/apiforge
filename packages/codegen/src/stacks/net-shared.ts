import type { ColumnMeta, DbEngine, GenerateConfig, GeneratedFile, TableMeta } from '@apiforge/shared';
import {
  csharpNamespace,
  insertableColumns,
  pascalCase,
  pkColumn,
  publicColumns,
  qualifiedTable,
  quoteIdent,
  routeName,
  sanitizeProjectName,
  updatableColumns,
} from '../helpers.js';
import { mapSqlToCSharp } from '../types-map.js';

export function netPort(config: GenerateConfig): number {
  return config.port || 5080;
}

export function dbPackageRef(engine: DbEngine): { include: string; package: string; version: string } {
  switch (engine) {
    case 'postgresql':
      return { include: 'Npgsql', package: 'Npgsql', version: '8.0.6' };
    case 'mysql':
      return { include: 'MySqlConnector', package: 'MySqlConnector', version: '2.4.0' };
    case 'sqlserver':
      return { include: 'Microsoft.Data.SqlClient', package: 'Microsoft.Data.SqlClient', version: '5.2.2' };
    case 'sqlite':
      return { include: 'Microsoft.Data.Sqlite', package: 'Microsoft.Data.Sqlite', version: '8.0.11' };
  }
}

export function csprojFile(config: GenerateConfig): GeneratedFile {
  const name = csharpNamespace(config.projectName);
  const db = dbPackageRef(config.connection.engine);
  const packages = [
    `    <PackageReference Include="${db.package}" Version="${db.version}" />`,
    `    <PackageReference Include="Dapper" Version="2.1.35" />`,
    `    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.9.0" />`,
  ];
  if (config.auth.enabled) {
    packages.push(
      `    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.11" />`,
      `    <PackageReference Include="BCrypt.Net-Next" Version="4.0.3" />`,
      `    <PackageReference Include="System.IdentityModel.Tokens.Jwt" Version="8.3.0" />`,
    );
  }

  return {
    path: `${name}.csproj`,
    content: `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <RootNamespace>${name}</RootNamespace>
    <AssemblyName>${name}</AssemblyName>
  </PropertyGroup>
  <ItemGroup>
${packages.join('\n')}
  </ItemGroup>
</Project>
`,
    language: 'xml',
  };
}

export function connectionString(config: GenerateConfig): string {
  const c = config.connection;
  if (c.connectionString) return c.connectionString;
  switch (c.engine) {
    case 'postgresql':
      return `Host=${c.host || 'localhost'};Port=${c.port || 5432};Database=${c.database || 'mydb'};Username=${c.username || 'postgres'};Password=${c.password || 'password'}`;
    case 'mysql':
      return `Server=${c.host || 'localhost'};Port=${c.port || 3306};Database=${c.database || 'mydb'};User ID=${c.username || 'root'};Password=${c.password || 'password'}`;
    case 'sqlserver':
      return `Server=${c.host || 'localhost'},${c.port || 1433};Database=${c.database || 'mydb'};User Id=${c.username || 'sa'};Password=${c.password || 'Your_password123'};TrustServerCertificate=True`;
    case 'sqlite':
      return `Data Source=${c.filePath || './data/app.db'}`;
  }
}

export function appsettingsFiles(config: GenerateConfig): GeneratedFile[] {
  const port = netPort(config);
  const settings = {
    Logging: {
      LogLevel: {
        Default: 'Information',
        'Microsoft.AspNetCore': 'Warning',
      },
    },
    AllowedHosts: '*',
    ConnectionStrings: {
      Default: connectionString(config),
    },
    Jwt: {
      Secret: config.auth.jwtSecret || 'change-me-to-a-long-random-secret-at-least-32-chars',
      Issuer: sanitizeProjectName(config.projectName),
      Audience: sanitizeProjectName(config.projectName),
      ExpiresMinutes: 1440,
    },
    Security: {
      CorsMode: config.security.corsMode,
      CorsOrigins: config.security.corsOrigins,
      AllowedIps: config.security.allowedIps,
      RateLimitEnabled: config.security.rateLimitEnabled,
      RateLimitPerMinute: config.security.rateLimitPerMinute,
      ApiKeyEnabled: config.security.apiKeyEnabled,
      ApiKeyHeader: config.security.apiKeyHeader,
      ApiKey: 'change-me-api-key',
    },
    Urls: `http://localhost:${port}`,
  };

  return [
    {
      path: 'appsettings.json',
      content: `${JSON.stringify(settings, null, 2)}\n`,
      language: 'json',
    },
    {
      path: 'appsettings.Development.json',
      content: `${JSON.stringify(
        {
          Logging: {
            LogLevel: {
              Default: 'Debug',
              'Microsoft.AspNetCore': 'Information',
            },
          },
        },
        null,
        2,
      )}\n`,
      language: 'json',
    },
  ];
}

export function generateDbFactory(config: GenerateConfig): GeneratedFile {
  const ns = csharpNamespace(config.projectName);
  const engine = config.connection.engine;
  let openBody = '';

  switch (engine) {
    case 'postgresql':
      openBody = `        var cs = _config.GetConnectionString("Default")
            ?? throw new InvalidOperationException("ConnectionStrings:Default is missing");
        var conn = new Npgsql.NpgsqlConnection(cs);
        await conn.OpenAsync();
        return conn;`;
      break;
    case 'mysql':
      openBody = `        var cs = _config.GetConnectionString("Default")
            ?? throw new InvalidOperationException("ConnectionStrings:Default is missing");
        var conn = new MySqlConnector.MySqlConnection(cs);
        await conn.OpenAsync();
        return conn;`;
      break;
    case 'sqlserver':
      openBody = `        var cs = _config.GetConnectionString("Default")
            ?? throw new InvalidOperationException("ConnectionStrings:Default is missing");
        var conn = new Microsoft.Data.SqlClient.SqlConnection(cs);
        await conn.OpenAsync();
        return conn;`;
      break;
    case 'sqlite':
      openBody = `        var cs = _config.GetConnectionString("Default")
            ?? throw new InvalidOperationException("ConnectionStrings:Default is missing");
        var conn = new Microsoft.Data.Sqlite.SqliteConnection(cs);
        await conn.OpenAsync();
        return conn;`;
      break;
  }

  return {
    path: 'Data/DbFactory.cs',
    content: `using System.Data;
using System.Data.Common;

namespace ${ns}.Data;

public interface IDbFactory
{
    Task<DbConnection> OpenConnectionAsync();
}

public sealed class DbFactory : IDbFactory
{
    private readonly IConfiguration _config;

    public DbFactory(IConfiguration config)
    {
        _config = config;
    }

    public async Task<DbConnection> OpenConnectionAsync()
    {
${openBody}
    }
}
`,
    language: 'csharp',
  };
}

export function generateModel(config: GenerateConfig, table: TableMeta): GeneratedFile {
  const ns = csharpNamespace(config.projectName);
  const entity = pascalCase(table.name);
  const cols = publicColumns(table);
  const props = cols
    .map((c) => {
      const csType = mapSqlToCSharp(c.dataType, c.isNullable);
      return `    public ${csType} ${pascalCase(c.name)} { get; set; }`;
    })
    .join('\n');

  return {
    path: `Models/${entity}.cs`,
    content: `namespace ${ns}.Models;

public class ${entity}
{
${props}
}
`,
    language: 'csharp',
  };
}

export function generateEntitySqlHelpers(engine: DbEngine, table: TableMeta) {
  const qt = qualifiedTable(table, engine);
  const pk = pkColumn(table)!;
  const pubs = publicColumns(table);
  const inserts = insertableColumns(table).filter((c) => !c.isIdentity);
  const updates = updatableColumns(table);
  const selectList = pubs.map((c) => quoteIdent(c.name, engine)).join(', ');
  const entity = pascalCase(table.name);

  // Dapper uses @PropertyName matching C# property names
  const dapperParam = (col: ColumnMeta) => `@${pascalCase(col.name)}`;

  const listSql = `SELECT ${selectList} FROM ${qt}`;
  const countSql = `SELECT COUNT(*) FROM ${qt}`;
  const getSql = `SELECT ${selectList} FROM ${qt} WHERE ${quoteIdent(pk.name, engine)} = @Id`;
  const insertCols = inserts.map((c) => quoteIdent(c.name, engine)).join(', ');
  const insertVals = inserts.map((c) => dapperParam(c)).join(', ');
  const insertSql = `INSERT INTO ${qt} (${insertCols}) VALUES (${insertVals})`;
  const updateSet = updates.map((c) => `${quoteIdent(c.name, engine)} = ${dapperParam(c)}`).join(', ');
  const updateSql = `UPDATE ${qt} SET ${updateSet} WHERE ${quoteIdent(pk.name, engine)} = @Id`;
  const deleteSql = `DELETE FROM ${qt} WHERE ${quoteIdent(pk.name, engine)} = @Id`;

  const pagedSql =
    engine === 'sqlserver'
      ? `${listSql} ORDER BY ${quoteIdent(pk.name, engine)} OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY`
      : engine === 'postgresql' || engine === 'sqlite' || engine === 'mysql'
        ? `${listSql} ORDER BY 1 LIMIT @Limit OFFSET @Offset`
        : listSql;

  return {
    entity,
    pk,
    pubs,
    inserts,
    updates,
    listSql,
    countSql,
    getSql,
    insertSql,
    updateSql,
    deleteSql,
    pagedSql,
    route: routeName(table),
    qt,
  };
}

export function generateSecurityMiddlewareCs(config: GenerateConfig): GeneratedFile {
  const ns = csharpNamespace(config.projectName);
  return {
    path: 'Middleware/SecurityMiddleware.cs',
    content: `namespace ${ns}.Middleware;

public class IpAllowlistMiddleware
{
    private readonly RequestDelegate _next;
    private readonly HashSet<string> _allowed;

    public IpAllowlistMiddleware(RequestDelegate next, IConfiguration config)
    {
        _next = next;
        _allowed = (config.GetSection("Security:AllowedIps").Get<string[]>() ?? Array.Empty<string>())
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (_allowed.Count > 0)
        {
            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "";
            if (ip.StartsWith("::ffff:")) ip = ip[7..];
            if (!_allowed.Contains(ip))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new { error = "IP not allowed" });
                return;
            }
        }
        await _next(context);
    }
}

public class ApiKeyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly bool _enabled;
    private readonly string _header;
    private readonly string _key;

    public ApiKeyMiddleware(RequestDelegate next, IConfiguration config)
    {
        _next = next;
        _enabled = config.GetValue("Security:ApiKeyEnabled", false);
        _header = config.GetValue("Security:ApiKeyHeader", "x-api-key") ?? "x-api-key";
        _key = config.GetValue("Security:ApiKey", "") ?? "";
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (_enabled)
        {
            var path = context.Request.Path.Value ?? "";
            if (!path.StartsWith("/health", StringComparison.OrdinalIgnoreCase)
                && !path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase)
                && !path.StartsWith("/auth", StringComparison.OrdinalIgnoreCase))
            {
                if (!context.Request.Headers.TryGetValue(_header, out var provided) || provided != _key)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsJsonAsync(new { error = "Invalid API key" });
                    return;
                }
            }
        }
        await _next(context);
    }
}

public class SimpleRateLimitMiddleware
{
    private readonly RequestDelegate _next;
    private readonly bool _enabled;
    private readonly int _max;
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, (int Count, DateTime Window)> _buckets = new();

    public SimpleRateLimitMiddleware(RequestDelegate next, IConfiguration config)
    {
        _next = next;
        _enabled = config.GetValue("Security:RateLimitEnabled", true);
        _max = config.GetValue("Security:RateLimitPerMinute", 100);
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (_enabled)
        {
            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var now = DateTime.UtcNow;
            var entry = _buckets.AddOrUpdate(
                ip,
                _ => (1, now),
                (_, prev) =>
                {
                    if ((now - prev.Window).TotalMinutes >= 1) return (1, now);
                    return (prev.Count + 1, prev.Window);
                });

            if (entry.Count > _max)
            {
                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                await context.Response.WriteAsJsonAsync(new { error = "Too many requests" });
                return;
            }
        }
        await _next(context);
    }
}
`,
    language: 'csharp',
  };
}

export function generateAuthService(config: GenerateConfig): GeneratedFile[] {
  if (!config.auth.enabled) return [];
  const ns = csharpNamespace(config.projectName);
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

  const findSql = `SELECT ${quoteIdent(idCol, engine)} AS Id, ${quoteIdent(userCol, engine)} AS Username, ${quoteIdent(passCol, engine)} AS Password FROM ${qt} WHERE ${quoteIdent(userCol, engine)} = @Username`;
  const insertSql = `INSERT INTO ${qt} (${quoteIdent(userCol, engine)}, ${quoteIdent(passCol, engine)}) VALUES (@Username, @Password)`;

  return [
    {
      path: 'Auth/AuthDtos.cs',
      content: `namespace ${ns}.Auth;

public record LoginRequest(string Username, string Password);
public record AuthResponse(string Token, object User);
`,
      language: 'csharp',
    },
    {
      path: 'Auth/JwtTokenService.cs',
      content: `using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace ${ns}.Auth;

public class JwtTokenService
{
    private readonly IConfiguration _config;

    public JwtTokenService(IConfiguration config)
    {
        _config = config;
    }

    public string CreateToken(string userId, string username)
    {
        var secret = _config["Jwt:Secret"] ?? "change-me-to-a-long-random-secret-at-least-32-chars";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresMinutes = _config.GetValue("Jwt:ExpiresMinutes", 1440);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId),
            new Claim(JwtRegisteredClaimNames.UniqueName, username),
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiresMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
`,
      language: 'csharp',
    },
    {
      path: 'Auth/AuthService.cs',
      content: `using Dapper;
using ${ns}.Data;

namespace ${ns}.Auth;

public class AuthUserRow
{
    public object Id { get; set; } = default!;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
}

public class AuthService
{
    private readonly IDbFactory _db;
    private readonly JwtTokenService _jwt;

    public AuthService(IDbFactory db, JwtTokenService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest req)
    {
        await using var conn = await _db.OpenConnectionAsync();
        var user = await conn.QuerySingleOrDefaultAsync<AuthUserRow>(
            @"${findSql}",
            new { Username = req.Username });
        if (user is null) return null;
        if (!BCrypt.Net.BCrypt.Verify(req.Password, user.Password)) return null;
        var token = _jwt.CreateToken(user.Id?.ToString() ?? "", user.Username);
        return new AuthResponse(token, new { id = user.Id, username = user.Username });
    }

    public async Task<AuthResponse?> RegisterAsync(LoginRequest req)
    {
        await using var conn = await _db.OpenConnectionAsync();
        var existing = await conn.QuerySingleOrDefaultAsync<AuthUserRow>(
            @"${findSql}",
            new { Username = req.Username });
        if (existing is not null) return null;
        var hash = BCrypt.Net.BCrypt.HashPassword(req.Password);
        await conn.ExecuteAsync(
            @"${insertSql}",
            new { Username = req.Username, Password = hash });
        var user = await conn.QuerySingleAsync<AuthUserRow>(
            @"${findSql}",
            new { Username = req.Username });
        var token = _jwt.CreateToken(user.Id?.ToString() ?? "", user.Username);
        return new AuthResponse(token, new { id = user.Id, username = user.Username });
    }
}
`,
      language: 'csharp',
    },
  ];
}

export function applyCorsSnippet(config: GenerateConfig): string {
  if (config.security.corsMode === 'disabled') {
    return '// CORS disabled';
  }
  if (config.security.corsMode === 'all') {
    return `builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));`;
  }
  const origins = config.security.corsOrigins.map((o) => `"${o}"`).join(', ');
  return `builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(${origins})
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));`;
}

export function jwtSetupSnippet(config: GenerateConfig): string {
  if (!config.auth.enabled) return '';
  const ns = csharpNamespace(config.projectName);
  return `
builder.Services.AddAuthentication(Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var secret = builder.Configuration["Jwt:Secret"] ?? "change-me-to-a-long-random-secret-at-least-32-chars";
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(secret))
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddSingleton<${ns}.Auth.JwtTokenService>();
builder.Services.AddScoped<${ns}.Auth.AuthService>();
`;
}
