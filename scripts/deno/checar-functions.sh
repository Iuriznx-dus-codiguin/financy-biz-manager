#!/usr/bin/env bash
# Checa os tipos de todas as edge functions com o Deno (sem os testes do Vitest).
# Uso: scripts/deno/checar-functions.sh [function ...]
set -uo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$RAIZ"
if [ "$#" -gt 0 ]; then alvos=("$@"); else mapfile -t alvos < <(ls -d supabase/functions/*/ | xargs -n1 basename | grep -v '^_shared$'); fi
arquivos=()
for f in "${alvos[@]}"; do arquivos+=("supabase/functions/$f/index.ts"); done
for s in supabase/functions/_shared/*.ts; do [[ "$s" == *.test.ts ]] || arquivos+=("$s"); done
deno check --import-map=scripts/deno/check-import-map.json "${arquivos[@]}"
