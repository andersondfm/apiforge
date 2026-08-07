#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "Stopping ApiForge PostgreSQL..."
docker compose down

echo "Stopped. Data volume kept (apiforge_postgres_data)."
echo "To wipe data too: docker compose down -v"
