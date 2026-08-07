#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "Starting ApiForge MySQL (Docker)..."
docker compose up -d

echo ""
echo "Waiting for MySQL to become healthy..."
deadline=$((SECONDS + 120))
status=""
while (( SECONDS < deadline )); do
  status="$(docker inspect --format='{{.State.Health.Status}}' apiforge-mysql 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    break
  fi
  sleep 2
done

if [[ "$status" != "healthy" ]]; then
  echo "MySQL is still starting (status: ${status:-unknown}). Check: docker logs apiforge-mysql"
else
  echo "MySQL is healthy."
fi

echo ""
echo "Connection (ApiForge wizard):"
echo "  Engine:   MySQL"
echo "  Host:     localhost"
echo "  Port:     3306"
echo "  Database: demo"
echo "  Username: demo"
echo "  Password: demo"
echo ""
echo "Stop with:  ./stop.sh"
echo "Logs with:  docker logs -f apiforge-mysql"
