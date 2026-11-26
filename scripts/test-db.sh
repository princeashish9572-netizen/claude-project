#!/usr/bin/env bash
# Applies the migration to a throw-away database on a local PostgreSQL server
# (with a stub of Supabase's auth schema) and runs the schema tests.
#   PGHOST/PGUSER/PGPASSWORD may be set; defaults to the local "postgres" user.
set -euo pipefail
cd "$(dirname "$0")/.."

DB="fee_manager_test_$$"
PSQL=(psql -v ON_ERROR_STOP=1 -X -q)
if [[ -z "${PGHOST:-}" && "$(id -u)" == "0" ]] && id postgres >/dev/null 2>&1; then
  PSQL=(sudo -u postgres "${PSQL[@]}")
fi

"${PSQL[@]}" -d postgres -c "create database $DB"
trap '"${PSQL[@]}" -d postgres -c "drop database if exists $DB" >/dev/null' EXIT

"${PSQL[@]}" -d "$DB" -f supabase/tests/supabase_stub.sql
for f in supabase/migrations/*.sql; do
  echo "applying $f"
  "${PSQL[@]}" -d "$DB" -f "$f"
done
"${PSQL[@]}" -d "$DB" -f supabase/tests/schema_test.sql
