# Local test databases (Docker)

Scripts to spin up engines for ApiForge wizard / introspection tests.

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

Seed tables: `products`, `users` (see `mysql/init/01-seed.sql`).

Stop:

```powershell
.\stop.ps1
```

Requires Docker Desktop running.
