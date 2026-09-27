# Drift de schema

Colunas que existem no banco de produção (segundo `src/integrations/supabase/types.ts`)
mas que nenhuma migração versionada cria. O `apply-migrations.sh` aplica cada arquivo
daqui logo depois da migração de mesmo prefixo, para que o banco local reproduza produção.
