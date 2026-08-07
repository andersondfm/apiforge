# Local test databases (Docker)

Scripts to spin up engines for ApiForge wizard / introspection / E2E tests.

Shared credentials (MySQL & PostgreSQL): database / user / password = **demo** / **demo** / **demo**.  
SQL Server: user **sa**, password **Your_strong_Password123**, database **demo**.

Seed tables on every engine: `products` (Widget, Gadget), `users` (demo / password).

## Ensure all (reuse healthy containers)

```bash
node scripts/ensure-dbs.mjs
# or selectively:
node scripts/ensure-dbs.mjs --mysql --postgres
```

If `apiforge-mysql` (etc.) is already healthy, it is **reused** — not recreated.

## MySQL

```powershell
cd scripts/mysql
.\start.ps1
```

| | |
|---|---|
| Host | `localhost` |
| Port | `3306` |
| Database | `demo` |
| Username | `demo` |
| Password | `demo` |

Stop: `.\stop.ps1`

## PostgreSQL

```powershell
cd scripts/postgres
.\start.ps1
```

| | |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `demo` |
| Username | `demo` |
| Password | `demo` |

Stop: `.\stop.ps1`

## SQL Server

```powershell
cd scripts/sqlserver
.\start.ps1
```

| | |
|---|---|
| Host | `localhost` |
| Port | `1433` |
| Database | `demo` |
| Username | `sa` |
| Password | `Your_strong_Password123` |

Stop: `.\stop.ps1`

## SQLite

No Docker. Seed file: [`sqlite/seed.sql`](sqlite/seed.sql). The E2E harness applies it to a temp `.db` via `node:sqlite`.

## E2E (generate + CRUD)

Requires: Docker Desktop (for remote engines), Node 22+, .NET 10 SDK (for .NET stacks).

```bash
npm run build
npm run test:e2e
```

Matrix: 4 stacks × 4 engines (generate → install → start → List/Create/Get/Update/Delete `/products`).

Filters:

```bash
# Node only + MySQL
set E2E_SKIP_DOTNET=1
set E2E_ENGINES=mysql
npm run test:e2e

# Keep temp projects
set E2E_KEEP=1
```

Requires Docker Desktop running for MySQL / Postgres / SQL Server.
