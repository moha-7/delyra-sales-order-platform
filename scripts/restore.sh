#!/usr/bin/env bash
set -euo pipefail

backup_file="${1:-}"
if [[ -z "${backup_file}" || ! -f "${backup_file}" ]]; then
  echo "Usage: npm run restore -- backups/file.dump"
  exit 1
fi

docker compose exec -T db dropdb \
  --if-exists \
  --username="${POSTGRES_USER:-universal_crm}" \
  "${POSTGRES_DB:-universal_crm}"

docker compose exec -T db createdb \
  --username="${POSTGRES_USER:-universal_crm}" \
  "${POSTGRES_DB:-universal_crm}"

docker compose exec -T db pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --username="${POSTGRES_USER:-universal_crm}" \
  --dbname="${POSTGRES_DB:-universal_crm}" < "${backup_file}"

echo "Database restored from: ${backup_file}"
