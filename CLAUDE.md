# Financy Biz Manager

SaaS brasileiro de gestão financeira com IA para pessoas físicas e empresas. React 18 + TypeScript + Vite +
Tailwind/shadcn + React Query; Supabase (Postgres/RLS, Auth, Edge Functions em Deno); cobrança pela Cakto; IA no
WhatsApp operada pelo n8n (fora do repositório). O Lovable edita e sincroniza a `main` nos dois sentidos.

**Regra fixa:** não existe plano gratuito nem teste grátis. Sem assinatura ativa o usuário só acessa Assinatura,
Configurações, Ajuda e Suporte — e o banco garante isso (RLS restritiva de escrita + checagem nas functions).

## Documentos
- `docs/DOMINIO.md` — entidades, fluxos, regras e contratos externos.
- `docs/AUDITORIA.md` — achados com severidade, evidência e status.
- `docs/ARQUITETURA-ALVO.md` — estrutura, plano por fases, modelo financeiro, riscos e decisões pendentes (D-xx).
- `docs/sql/inspecao-banco.sql` — inspeção somente leitura do banco de produção.
- `scripts/db/` — Postgres local com shim do Supabase para validar migrações (`README.md` lá dentro).

## Regras invioláveis
- Não alterar: `.env`, o `project_id` de `supabase/config.toml`, `src/integrations/supabase/client.ts` e `types.ts`
  (gerados), o `lovable-tagger` e o bloco `server` de `vite.config.ts`, os lockfiles. O front não pode depender de
  variável de ambiente nova.
- Preservar contratos: URL e payload do `cakto-webhook`, jobs do cron, e toda tabela/coluna/RPC/function que o n8n
  possa usar (`validacao_n8n`, `ai_recognized_transactions`, `profiles.telefone`, functions sem chamador no front) até
  prova em contrário.
- Nunca editar migração antiga: criar nova, idempotente, sem perda de dados e com a reversão comentada. Renomear ou
  apagar tabela/coluna exige aprovação e plano de migração de dados.
- Secret novo faz a function falhar fechada e vem com passo a passo. Remover código de function não a tira do ar:
  listar o `supabase functions delete`.
- Mudança de regra de negócio, preço, oferta ou exclusão de dado de cliente é decisão pendente, nunca implementação.
- Commits atômicos em português (Conventional Commits); o app funciona ao fim de cada commit. Nada é declarado
  corrigido sem evidência (teste, saída de comando ou diff).

## Comandos
- `npm run build` · `npm run lint` · `npm run typecheck` · `npm test` (Vitest via `npx`, sem mexer em lockfile).
- Banco local: `PGHOST=/tmp PGPORT=54399 scripts/db/apply-migrations.sh && scripts/db/testes/rodar.sh`.

## Convenções
- Código novo por domínio em `src/features/<domínio>`; utilitários em `src/shared`; shadcn fica em `src/components/ui`.
- Datas-calendário (`AAAA-MM-DD`) sem fuso; "hoje" é o de `America/Sao_Paulo` (`src/shared/lib/datas.ts`).
- Dinheiro em centavos inteiros para cálculo (`src/shared/lib/dinheiro.ts`).
- Plano, tier e limites vêm do catálogo `supabase/functions/_shared/planos.ts` + `user_subscriptions` (`plan_id`, `features`).
