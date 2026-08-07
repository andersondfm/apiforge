#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "Stopping ApiForge MySQL..."
docker compose down

echo "Stopped. Data volume kept (apiforge_mysql_data)."
echo "To wipe data too: docker compose down -v"
