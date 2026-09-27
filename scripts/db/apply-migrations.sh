#!/usr/bin/env bash
# Recria um banco local e aplica o shim + todas as migrações, cada uma na própria transação
# (como o Supabase faz). Uso: PGHOST=/tmp PGPORT=54399 scripts/db/apply-migrations.sh [dbname]
# Migrações que falham são reportadas e o processo continua, reproduzindo o histórico real
# (algumas migrações antigas nunca aplicaram por inteiro em produção).
set -uo pipefail
DB="${1:-financy_local}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export PGUSER="${PGUSER:-postgres}"
psql -q -d postgres -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB" >/dev/null
psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/scripts/db/supabase-shim.sql" >/dev/null 2>&1 || { echo "shim falhou"; exit 1; }
psql -q -d "$DB" -c "ALTER DATABASE $DB SET search_path = public, extensions" >/dev/null
ok=0; fail=0
for f in "$ROOT"/supabase/migrations/*.sql; do
  name="$(basename "$f")"
  # pg_cron/pg_net são simulados pelo shim; o resto do arquivo é aplicado sem alteração.
  body="$(sed -E 's/^\s*(CREATE|DROP) EXTENSION IF NOT EXISTS pg_(cron|net).*$/-- (shim) &/I; s/^\s*DROP EXTENSION IF EXISTS pg_(cron|net).*$/-- (shim) &/I; s/^\s*COMMENT ON EXTENSION pg_cron.*$/-- (shim) &/I' "$f")"
  if out="$(printf 'SET search_path = public, extensions;\n%s\n' "$body" | psql -q -X -1 -v ON_ERROR_STOP=1 -d "$DB" 2>&1)"; then
    ok=$((ok+1))
  else
    fail=$((fail+1)); echo "FALHOU $name: $(echo "$out" | grep -m1 ERROR)"
  fi
  drift="$ROOT/scripts/db/drift/${name%%[_-]*}.sql"
  if [ -f "$drift" ]; then psql -q -X -1 -v ON_ERROR_STOP=1 -d "$DB" -f "$drift" >/dev/null || echo "drift $drift falhou"; fi
done
echo "migrações aplicadas: $ok, falharam: $fail"
