#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "Starting ApiForge SQL Server (Docker)..."
docker compose up -d

echo ""
echo "Waiting for SQL Server to become healthy..."
deadline=$((SECONDS + 180))
status=""
while (( SECONDS < deadline )); do
  status="$(docker inspect --format='{{.State.Health.Status}}' apiforge-mssql 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    break
  fi
  sleep 3
done

if [[ "$status" != "healthy" ]]; then
  echo "SQL Server is still starting (status: ${status:-unknown}). Check: docker logs apiforge-mssql"
  exit 1
fi

echo "Applying seed (demo DB / products / users)..."
docker exec apiforge-mssql /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P 'Your_strong_Password123' -i /init/01-seed.sql

echo "SQL Server is healthy and seeded."
echo ""
echo "Connection (ApiForge wizard):"
echo "  Engine:   SQL Server"
echo "  Host:     localhost"
echo "  Port:     1433"
echo "  Database: demo"
echo "  Username: sa"
echo "  Password: Your_strong_Password123"
echo ""
echo "Stop with:  ./stop.sh"
echo "Logs with:  docker logs -f apiforge-mssql"
