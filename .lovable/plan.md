# Sistema de Suporte Inteligente — Plano de Execução

Escopo: 8 fases descritas. Sprint dividido em 4 entregas incrementais para manter a plataforma estável a cada passo.

---

## Entrega 1 — Fundação: Catálogo + Captura + Logs

**Fase 1 (auditoria)** — mapeada inline durante a implementação, refletida nas categorias do catálogo. Módulos identificados na base atual: `AUTH` (login/signup/reset), `SUB` (assinatura/Cakto), `DB` (Supabase/RLS), `WBH` (webhooks recebidos e agendados), `AI` (edge functions ai-agent, ai-financial-insights, ai-support-agent), `INT` (Google Sheets/Excel), `UI` (renderização/ErrorBoundary), `NET` (fetch/functions.invoke), `SEC` (rate-limit/permissões), `INF` (env/secrets).

**Fase 2 (taxonomia)** — tabela `error_catalog`:
- `code` (ex.: `AUTH-001`, `WBH-014`) — PK estável
- `title`, `tech_description`, `user_description`
- `severity` (critical|high|medium|low|info)
- `module`, `flow`
- `probable_causes` (jsonb), `resolution_steps` (jsonb)
- `ai_resolvable` (bool), `related_codes` (text[])
- `version`, `created_at`, `updated_at`, `changelog` (jsonb)

Seed inicial com ~40 códigos cobrindo os fluxos auditados (login, refresh token — já visto no console —, RLS violations, webhook 401/500 do Cakto, rate-limit IA, falhas de importação de planilha, etc.).

**Fase 3 (captura)**:
- Tabela `error_occurrences`: `id`, `user_id`, `session_id`, `conversation_id?`, `ticket_id?`, `error_code?`, `route`, `context` (jsonb sanitizado), `stack_hash`, `created_at`, `status` (open|investigating|resolved|reopened).
- RLS: usuário só vê as próprias; admin vê todas via `has_role`.
- Frontend: extensão do `ErrorBoundary` já existente + interceptor no cliente Supabase (`src/integrations/supabase/client.ts`) + helper `logError(code, ctx)` em `src/utils/errorLogger.ts`.
- Backend: helper compartilhado em `supabase/functions/_shared/errorLogger.ts` para uso uniforme em todas as edge functions.
- Sanitização: strip de tokens/emails/senhas antes de persistir.

**Deliverables:**
- Migração criando `error_catalog`, `error_occurrences`, roles `admin` (via padrão `user_roles` + `has_role`), grants e RLS.
- Seed do catálogo.
- `errorLogger` frontend + backend.
- Hook no `ErrorBoundary` + interceptor Supabase.

---

## Entrega 2 — Chat de Suporte com IA (diagnóstico + geral)

**Fase 5 + 6:**
- Tabelas `support_conversations` (`id`, `user_id`, `state`, `ticket_id?`, `created_at`, `updated_at`, `rating?`) e `support_messages` (`id`, `conversation_id`, `role`, `content`, `matched_code?`, `created_at`). RLS por `user_id`.
- Nova edge function `support-agent`:
  - Recebe histórico + mensagem do usuário.
  - System prompt inclui: descrição real da plataforma (extraída da auditoria) + catálogo carregado do DB (só campos public-safe).
  - Fluxo: se usuário informar código → retorna passos do catálogo verbatim. Se descrever sintoma → LLM propõe hipótese, cruza com `error_occurrences` recentes do usuário, faz UMA pergunta de esclarecimento se ambíguo, senão responde.
  - Se sem match no catálogo → cria `error_occurrences` com `error_code=NULL` marcado `uncatalogued=true` para triagem humana.
  - Usa Lovable AI Gateway (`gemini-2.5-flash`), com rate-limit e persistência.
- UI: novo `SupportChat` acessível via botão flutuante global (substitui/complementa o antigo WhatsApp button removido) + página dedicada `/suporte`. Estados de conversa visíveis (aberta/diagnóstico/aguardando/resolvida/escalada).
- Reaproveita padrão markdown do `FinancyAIChat`.

**Fase 7 (escalonamento):**
- Regra: severity `critical` OU `ai_resolvable=false` OU keywords financeiras/segurança → seta `state='escalated'`, cria linha em `support_escalations` com contexto completo.
- Toast + mensagem clara ao usuário: "Encaminhado para nossa equipe. Chamado #XYZ."

---

## Entrega 3 — Painel Admin de Observabilidade

**Fase 4:**
- Rota `/admin/observabilidade` protegida por `has_role('admin')`.
- Abas:
  1. **Dashboard**: volume por código (7d/30d), série temporal, top módulos, ocorrências não catalogadas.
  2. **Ocorrências**: tabela filtrável (código, módulo, severity, status, usuário, período), drill-down para detalhes.
  3. **Catálogo**: CRUD do `error_catalog` inline (título/descrições/passos/severity) sem novo deploy.
  4. **Conversas**: lista de `support_conversations`, com transcript e ticket vinculado; ações: marcar resolvida, reabrir, escalar.
- Reutiliza componentes shadcn já no projeto (Table, Card, Dialog).

---

## Entrega 4 — KPIs e Evolução Contínua

**Fase 8:**
- Ao encerrar conversa: prompt inline "Isso resolveu seu problema?" (👍/👎 + comentário) grava em `support_conversations.rating`.
- View SQL `support_kpis`: % resolvido pela IA, tempo médio de resolução, top 10 códigos, taxa de escalonamento.
- Nova aba "KPIs" no painel admin com gráficos (recharts, já usado no projeto).
- Job semanal (edge function agendada) que lista os top erros não catalogados e cria uma notificação para admins.

---

## Detalhes técnicos

- **Stack**: mantém React + Vite + Supabase + Lovable AI Gateway. Sem novas libs pesadas.
- **Segurança**: todas as tabelas novas com RLS estrita; grants explícitos por role; sanitização de PII antes de persistir contextos; rate-limit reutiliza `check_and_increment_rate_limit`.
- **Roles**: implementa `app_role` enum + `user_roles` + `has_role()` conforme padrão do projeto (ainda não existe — `get_user_role` atual lê `profiles.settings->>role` que é inseguro; será migrado).
- **Compatibilidade**: `ErrorBoundary` e edge functions existentes continuam funcionando; captura é aditiva.
- **Deploy**: cada entrega é independente e testável antes da próxima.

---

## Ordem sugerida

1. Entrega 1 (fundação, 1 mensagem) — desbloqueia tudo.
2. Entrega 2 (chat) — valor imediato ao usuário.
3. Entrega 3 (admin) — valor à equipe.
4. Entrega 4 (KPIs) — polimento.

Confirma o escopo completo ou prefere começar apenas pela Entrega 1 e validar antes de seguir?
