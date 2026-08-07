#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "Starting ApiForge PostgreSQL (Docker)..."
docker compose up -d

echo ""
echo "Waiting for PostgreSQL to become healthy..."
deadline=$((SECONDS + 120))
status=""
while (( SECONDS < deadline )); do
  status="$(docker inspect --format='{{.State.Health.Status}}' apiforge-postgres 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    break
  fi
  sleep 2
done

if [[ "$status" != "healthy" ]]; then
  echo "PostgreSQL is still starting (status: ${status:-unknown}). Check: docker logs apiforge-postgres"
else
  echo "PostgreSQL is healthy."
fi

echo ""
echo "Connection (ApiForge wizard):"
echo "  Engine:   PostgreSQL"
echo "  Host:     localhost"
echo "  Port:     5432"
echo "  Database: demo"
echo "  Username: demo"
echo "  Password: demo"
echo ""
echo "Stop with:  ./stop.sh"
echo "Logs with:  docker logs -f apiforge-postgres"
