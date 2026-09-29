# Harness de banco local

Valida migrações e policies num PostgreSQL local que imita o Supabase, sem tocar em produção.

- `supabase-shim.sql` — roles (`anon`, `authenticated`, `service_role`, `authenticator`), schema `auth` com
  `auth.uid()/role()/email()/jwt()` lidos de GUCs (como o PostgREST faz), `pg_cron`/`pg_net` simulados e as tabelas e
  funções que existem em produção sem migração versionada (formato de `src/integrations/supabase/types.ts`).
- `drift/` — colunas criadas à mão em produção, aplicadas logo após a migração de mesmo prefixo.
- `apply-migrations.sh` — recria o banco e aplica shim + todas as migrações, cada uma em sua transação.
  As três migrações antigas que não são aplicáveis (ver AUDITORIA A-35) falham aqui como falharam em produção.
- `testes/` — testes SQL de segurança (paywall, RPCs, limites, recorrência) executados como os roles do Supabase.

## Uso

```bash
# Postgres 16 local (uma vez)
useradd -m pgrunner && su pgrunner -c "/usr/lib/postgresql/16/bin/initdb -D ~/data -U postgres --auth=trust"
su pgrunner -c "/usr/lib/postgresql/16/bin/pg_ctl -D ~/data -o '-p 54399 -k /tmp' -l ~/pg.log start"

export PGHOST=/tmp PGPORT=54399
scripts/db/apply-migrations.sh financy_local
scripts/db/testes/rodar.sh financy_local
```
