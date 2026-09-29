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
if command -v deno >/dev/null; then DENO=(deno); else DENO=(npx --yes deno); fi
# --node-modules-dir=none: com package.json na raiz o Deno 2 buscaria os pacotes npm: no node_modules do front
# (que pode não existir, como no CI); o runtime das edge functions usa o cache próprio do Deno.
"${DENO[@]}" check --node-modules-dir=none --import-map=scripts/deno/check-import-map.json "${arquivos[@]}"
