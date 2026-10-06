#!/usr/bin/env bash
set -euo pipefail

mkdir -p backups
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="backups/universal_crm_${timestamp}.dump"

docker compose exec -T db pg_dump \
  --format=custom \
  --username="${POSTGRES_USER:-universal_crm}" \
  --dbname="${POSTGRES_DB:-universal_crm}" > "${output}"

echo "Database backup created: ${output}"
echo "Back up the Docker file_storage volume separately before release changes."
