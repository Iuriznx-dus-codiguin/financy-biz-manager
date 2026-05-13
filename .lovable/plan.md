
# Auditoria Funcional Completa — Financy

Vou realizar uma verificação profunda em 7 frentes, testando fluxos reais no preview, inspecionando logs, queries no banco e código das edge functions.

## Escopo da Verificação

### 1. Autenticação e Onboarding
- Login / signup / logout / reset de senha
- Trigger `on_auth_user_created` → criação de profile
- Webhook `novo-usuario-webhook` (n8n)
- Fluxo de onboarding (steps 1–8, opcionais 5–8)
- Coleta de telefone (BrazilianPhoneInput, normalização E.164)
- AuthGuard e redirecionamentos

### 2. Sistema Multi-Dashboard
- Criação de dashboard default (upsert atômico recém-implementado)
- Troca entre Pessoal / Empresarial
- Isolamento de dados por `dashboard_id` (RLS `user_has_dashboard_access`)
- `CompactDashboardSelector` e badges visuais

### 3. CRUD Financeiro (Receitas, Despesas, Impostos, Metas, Equipe)
- Inserção, edição, exclusão com optimistic UI + rollback
- Filtragem por período (TimeFilter)
- Cálculos em `useFinancialCalculations` (totais, saldo)
- Categorias personalizadas
- Transações recorrentes (`useRecurringTransactions`, edge function `process-recurring-transactions`)
- Validação que o `dashboard_id` correto está sendo persistido

### 4. Assinaturas e Pagamentos
- Tabelas: `subscribers`, `user_subscriptions`, `customer_subscriptions`
- Webhook `cakto-webhook` (HMAC, mapeamento de planos, ativação)
- `useSubscription` (Promise.all paralelo)
- Gating de features (`useFeatureAccess`)
- Bloqueio de rotas para `pending_payment` (apenas /assinatura, /configuracoes, /ajuda)
- Notificações de pagamento + confetti
- Webhooks agendados de renovação (5d, 1d, dia)

### 5. IA e Chat
- Edge function `ai-agent` (allowlist de ações, cache de contexto 10min)
- `FinancyAIChat` (limites: 500 chars, 50 msgs/dia)
- Persistência em `ai_chat_sessions` / `ai_chat_messages`
- Invalidação de cache em mutações (register/delete)
- `ai-financial-insights` para dashboard
- Outros agents: `ai-financial-agent`, `ai-tax-agent`, `ai-support-agent`

### 6. Edge Functions e Integrações
- Status de deploy de todas as functions (Deno std@0.224.0)
- Logs recentes em busca de erros (já vi `process-recurring-transactions` falhando por falta de `CRON_SECRET_TOKEN`)
- Webhooks agendados (cron pg_cron 10h UTC)
- Daily transaction reminder (20h BRT)
- `get-main-dashboard`, `validate-developer-key`
- `schedule-user-webhooks`, `process-scheduled-webhooks`

### 7. Performance, Segurança e Integridade
- `supabase--linter` (RLS, search_path em funções)
- `security--run_security_scan`
- Verificação de RLS em tabelas críticas
- React Query cache (staleTime 5min)
- Excel export (exceljs) em Relatórios
- Console/network logs do preview
- Verificação de queries lentas via `supabase--analytics_query`

## Metodologia

Para cada frente:
1. **Code review** — leitura dos arquivos relevantes
2. **DB inspection** — queries de sanidade (`supabase--read_query`)
3. **Edge function logs** — últimos eventos por função
4. **Browser testing** — fluxos críticos no preview (login → CRUD → assinatura → IA)
5. **Linter/security scan**

## Entregáveis

Relatório final em chat, organizado por:
- ✅ **Funcionando corretamente** (com evidência)
- ⚠️ **Problemas menores / melhorias sugeridas**
- 🔴 **Bugs críticos** (quebram funcionalidade ou comprometem dados/segurança)

Para cada bug: arquivo, linha, descrição do problema, impacto e correção sugerida. Nenhuma alteração de código será feita nesta fase — apenas diagnóstico. Após sua aprovação do relatório, podemos planejar uma "Fase 6 — Correções da Auditoria".

## Estimativa de Tempo

A análise envolverá ~30–50 chamadas de ferramentas (leitura, queries, logs, browser). Posso priorizar uma frente específica se preferir, ou seguir todas em sequência.
