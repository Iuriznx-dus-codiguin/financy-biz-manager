#!/usr/bin/env bash
# Roda os testes SQL num banco já migrado (scripts/db/apply-migrations.sh).
# Arquivos *.privilegiado.sql rodam como postgres (simulam pg_cron/SQL editor); os demais
# como `authenticator`, o usuário com que o PostgREST conecta antes de trocar para
# anon/authenticated/service_role. Cada arquivo roda numa transação desfeita no fim.
set -uo pipefail
DB="${1:-financy_local}"
DIR="$(cd "$(dirname "$0")" && pwd)"
psql -q -X -U postgres -d "$DB" -v ON_ERROR_STOP=1 -f "$DIR/00_dados.sql" >/dev/null || { echo "carga de dados falhou"; exit 1; }
falhas=0
for f in "$DIR"/[1-9]*.sql; do
  nome="$(basename "$f")"
  usuario=authenticator
  [[ "$nome" == *.privilegiado.sql ]] && usuario=postgres
  if saida="$( { echo 'BEGIN;'; cat "$f"; echo 'ROLLBACK;'; } | psql -q -X -U "$usuario" -d "$DB" -v ON_ERROR_STOP=1 2>&1)"; then
    echo "ok     $nome"
  else
    falhas=$((falhas+1)); echo "FALHOU $nome"; echo "$saida" | grep -E 'ERROR|FALHA|CONTEXT' | head -5 | sed 's/^/       /'
  fi
done
[ "$falhas" -eq 0 ] && echo "todos os testes SQL passaram" || { echo "$falhas arquivo(s) com falha"; exit 1; }
