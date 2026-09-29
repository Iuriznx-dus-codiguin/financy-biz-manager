# Financy — Domínio, fluxos, regras e contratos

> Fase 0 da reestruturação. Descreve a plataforma **como ela era na linha de base** (commit `95cc1c0`), com evidência
> no código daquela versão — os caminhos citados são os antigos (antes da Fase 2 mover o front para `src/features`).
> O que mudou desde então, com commit e evidência, está no status de cada achado da auditoria e em
> [`RELATORIO-FINAL.md`](./RELATORIO-FINAL.md).
> Onde o comportamento real diverge do pretendido, a divergência está marcada com ⚠ e detalhada em
> [`AUDITORIA.md`](./AUDITORIA.md). A proposta de mudança está em [`ARQUITETURA-ALVO.md`](./ARQUITETURA-ALVO.md).

## 1. Visão geral

SaaS brasileiro de gestão financeira para **pessoas físicas (PF)** e **empresas (PJ)**. Stack: React 18 + TypeScript +
Vite + Tailwind/shadcn + React Query no front (gerado e sincronizado pelo Lovable com a `main`), Supabase (Postgres com
RLS, Auth, Edge Functions em Deno) no back, cobrança pela **Cakto**, automações e IA no WhatsApp pelo **n8n** (fora do
repositório) e IA in-app pelo **Lovable AI Gateway** (Gemini) — mais três functions antigas que usam **OpenAI**.

Regra de negócio fixa: **não há plano gratuito nem teste grátis**. Sem assinatura ativa o usuário só acessa
Assinatura, Configurações, Ajuda e Suporte (`src/constants/routes.ts:37`).

## 2. Atores

| Ator | Como interage |
|---|---|
| Usuário PF | Controla entradas/gastos, metas e (hoje) impostos/taxas em dashboards `personal`. |
| Usuário PJ | Receitas/despesas com cliente/fornecedor, impostos, equipe e fechamento de caixa em dashboards `business`. |
| Administrador | Atende chamados escalados (`/admin/suporte`) e audita webhooks da Cakto (`/auditoria/webhooks-cakto`). Papel em `user_roles` (hoje o tier `developer` também é tratado como admin — ver A-09). |
| Cakto | Envia eventos de pagamento para a function `cakto-webhook`. |
| n8n | Recebe webhooks (boas-vindas, lembrete diário, avisos de renovação) e opera a IA do WhatsApp lendo/gravando tabelas do banco. |
| pg_cron | Dispara jobs diários (recorrências, lembrete, webhooks agendados). |

## 3. Entidades

As colunas reais estão em `src/integrations/supabase/types.ts` (snapshot gerado do banco). Oito tabelas existem no banco
**sem `CREATE TABLE` versionado** (marcadas com †) e algumas colunas também (drift, ver §3.12).

### 3.1 Identidade
- **`auth.users`** → trigger `on_auth_user_created` → **`profiles`** (`id`, `email`, `nome_completo`, `telefone`, `settings`).
  `telefone` é normalizado para E.164 por trigger (`normalize_phone_br`) e tem índice único parcial. Alterar o telefone
  sincroniza a tabela **`validacao_n8n`**† (trigger `sync_phone_to_validacao_n8n`), usada pelo n8n.
- **`onboarding_data`** (1 por usuário): `user_type` (`pessoal`/`empresarial`), `nome_preferido`, faixas de salário e
  faturamento, `saldo_conta`, `saldo_carteira`, `dividas_atuais`, `receita_extra`, `termos_aceitos`.
- **`user_roles`** (`admin`/`moderator`/`user`) + função `has_role()`.

### 3.2 Espaços (dashboards)
- **`user_dashboards`**: `type` `personal` | `business`, `is_default` (índice único parcial garante 1 padrão por usuário),
  nome único por usuário. A quantidade é limitada pelo plano (⚠ só no front e com o número errado — A-06).
- Todo lançamento pertence a um dashboard: triggers `ensure_{receita,despesa,imposto,meta}_has_dashboard` preenchem o
  dashboard padrão quando `dashboard_id` vem nulo; `migrate_orphan_transactions_to_main_dashboard` corrige órfãos.
- O tipo do dashboard muda a nomenclatura (PF: Entradas/Gastos; PJ: Receitas/Despesas — `src/utils/nomenclature.ts`,
  ⚠ usado só no seletor de dashboard) e libera **Equipe** e **Fechamento** apenas para `business`.

### 3.3 Lançamentos
- **`receitas`** (com `cliente`) e **`despesas`** (com `fornecedor`): `data`, `descricao`, `categoria`,
  `categoria_personalizada`, `valor numeric(10,2)`, `forma_pagamento`, `status` (`paga`/`pendente`),
  recorrência (`recorrente`, `tipo_recorrencia`, `proxima_data`, `configuracao_recorrencia`), `dashboard_id`.
  `receitas.cakto_transaction_id` guarda a idempotência do webhook de pagamento.
- **Recorrência**: o registro original é a 1ª ocorrência; `proxima_data` é a próxima. A geração copia o registro com
  sufixo " (Recorrente)" e `status = 'paga'`, e avança `proxima_data` com `calcular_proxima_data` (`diaria`, `semanal`,
  `mensal`; ⚠ `anual` devolve NULL e mata a recorrência). Quem gera:
  - RPC `processar_transacoes_recorrentes_usuario(p_user_id)`, chamada pelo front ao abrir o app (1×/dia/sessão) e pelo
    botão "Processar agora";
  - function `process-recurring-transactions` → `processar_receitas_recorrentes()`/`processar_despesas_recorrentes()`
    (globais), chamada pelo cron. ⚠ O job foi **desagendado** em 15/05/2026 (`20260515014327`) porque a function exige
    `CRON_SECRET_TOKEN` e o cron enviava a chave anon; hoje as recorrências dependem só de o usuário abrir o app.
  - ⚠ Cada chamada gera no máximo **uma** ocorrência por registro (meses perdidos não são recuperados de uma vez).
  - ⚠ O formulário de Receitas/Despesas coleta a recorrência, mas `addReceita`/`addDespesa` não gravam esses campos e
    o carregamento não os lê — a recorrência criada pela interface nunca é persistida (A-11).

### 3.4 Categorias
- Categorias padrão por tipo de dashboard (`src/constants/categories.ts`) + **`categorias_personalizadas`**
  (`nome`, `tipo` receita/despesa/ambos, `cor`, `icone`, `ativo`, `dashboard_id`). Exclusão é lógica (`ativo = false`).
  ⚠ A listagem ignora o dashboard; a unicidade é `(user_id, nome, tipo)` global; ícones nunca resolvem (A-27).

### 3.5 Impostos e taxas
- **`impostos`**: `tipo` (`imposto`/`taxa`), `descricao`, `valor`, `vencimento`, `pago`, `recorrente`, `dashboard_id`.
  ⚠ Não há coluna para "valor fixo × percentual" (o percentual volta como fixo — A-15), nem para periodicidade ou
  próxima data (a recorrência de imposto é só uma flag). Pagar um imposto só marca `pago = true`; não gera despesa.

### 3.6 Metas
- **`metas`**: `titulo`, `valor_meta`, `valor_atual` (digitado à mão), `progresso` (derivado no formulário),
  `prazo`, `categoria`, `status` (`em_andamento`/`concluida`/`atrasada`, escolhido à mão), `cor`.

### 3.7 Equipe (PJ)
- **`equipe_membros`**†: `nome`, `email`, `telefone`, `cargo`, `salario`, `periodicidade` (mensal/quinzenal/semanal),
  `status`, `data_admissao`, `permissoes` (jsonb, sem uso). Auditoria em **`equipe_membros_audit`**†.
  Salário **não gera lançamento**; os dashboards somam a folha como custo mensal fixo (semanal ×4, quinzenal ×2).

### 3.8 Fechamento de caixa (PJ)
- Não há tabela: a tela calcula na hora o resumo de um dia e a lista de um período a partir de receitas, despesas,
  impostos e folha. Não existe abertura, conferência, diferença nem trava de período.

### 3.9 Assinatura e cobrança
- **Fonte usada pelo front e pelo webhook: `user_subscriptions`** (1 por usuário): `subscription_type`
  (`pending`/`personal`/`business`/`developer`; histórico `free_trial`), `plan_id`, `plan_name`, `status`
  (`pending_payment`, `active`, `past_due`, `cancelled`, `refunded`, `expired`), `started_at`, `expires_at`,
  `billing_period`, `amount`, `features` (limites gravados pelo webhook), `cakto_subscription_id`, `metadata`.
- Trigger `create_trial_on_profile_insert` → `create_free_trial_subscription()` cria, desde 31/01/2026, uma assinatura
  `pending_payment` para todo usuário novo (o nome da função é histórico).
- Tabelas concorrentes/legadas: `customer_subscriptions` (lida por `useSubscription` e pela view `subscription_status`),
  `subscribers` (tier `developer` e espelho do tier pelo webhook; coluna `stripe_customer_id` legada),
  `usuarios_assinatura`†, `validacao_n8n`† (colunas `plano`, `proxima_cobranca`, `data_inicio_assinatura` que o webhook
  nunca atualiza), `free_trial_history` (do trial extinto), `payment_notifications` (toast de pagamento confirmado),
  `scheduled_webhooks` (avisos de renovação para o n8n) e `cakto_webhook_logs` (auditoria do webhook).
- **Tier no front** (`resolveTier`, `src/hooks/useFeatureAccess.tsx:83`) é deduzido **pelo nome do plano**, não pelo
  `plan_id` nem pelos `features` gravados (A-05/A-06).

### 3.10 Inteligência artificial
| Frente | Onde | Dados |
|---|---|---|
| Assistente in-app | `ai-agent` ← `FinancyAIChat` (rota `/agentes-ia`) | Contexto em `ai_context_cache` (10 min), sessões em `ai_chat_sessions`/`ai_chat_messages` (gravadas pelo front), ferramentas que criam/editam/excluem lançamentos com service role, limite de 50 msgs/dia em `rate_limits`. |
| Insights do dashboard | `ai-financial-insights` ← `InteligenciaFinanceiraIA` | Cache de 6 h em `query_cache`. |
| Suporte | `support-agent` ← `SupportChat` (`/suporte` e botão flutuante) | `support_conversations`/`support_messages`, catálogo `error_catalog`, `error_occurrences`, escalonamento em `support_escalations` e RPC `request_human_support`; painel `/admin/suporte`. |
| WhatsApp | n8n (fora do repositório) | Lê `validacao_n8n` e provavelmente grava lançamentos/`ai_recognized_transactions`. **Workflows não fornecidos — pendente.** |
| Legado (sem chamador) | `ai-financial-agent`, `ai-support-agent`, `ai-tax-agent` (OpenAI) | `ai_conversations`, `ai_recognized_transactions`. |

### 3.11 Suporte, auditoria e tutoriais
`error_catalog` (≈40 códigos semeados), `error_occurrences`, `security_audit_logs`†, `auth_rate_limits`†,
`phone_corrections_audit`, `section_tutorials`, `user_tour_progress`†, `notificacoes`†.

### 3.12 Drift entre migrações e banco (evidência: harness local + `types.ts`)
Aplicando todas as migrações num Postgres local (`scripts/db/apply-migrations.sh`):
- Colunas que existem em produção sem migração: `profiles.telefone`, `receitas/despesas.configuracao_recorrencia`.
- `security_audit_logs` **não tem** a coluna `metadata`, mas `ensure_user_has_subscription`, `check_user_exists` e a
  function `daily-transaction-reminder` gravam nela (as funções falham ao executar esse trecho).
- Três migrações não podem ter sido aplicadas por inteiro: `20250827211918` (referência `extensions.cron.schedule`),
  `20250918173518` (`CREATE INDEX CONCURRENTLY` dentro de transação — por isso não existem em produção
  `get_dashboard_stats`, `cleanup_expired_cache`, os gatilhos `enhanced_audit_*` e os índices compostos) e
  `20250920201928` (`ENABLE ROW LEVEL SECURITY` numa view — por isso `validate_developer_key` também não aparece em
  `types.ts`). Confirmação definitiva: bloco 7 de [`sql/inspecao-banco.sql`](./sql/inspecao-banco.sql).

## 4. Fluxos

### 4.1 Cadastro → pagamento → uso
1. Cadastro por e-mail/senha (`AuthPage`) → `profiles` → `user_subscriptions` `pending_payment`.
2. `AuthenticatedLayout` força o **onboarding** antes de qualquer tela (`src/components/layouts/AuthenticatedLayout.tsx:78`):
   cria/renomeia o dashboard padrão, grava telefone, `onboarding_data`, gastos iniciais como despesas, meta inicial e
   chama `novo-usuario-webhook` (boas-vindas no n8n).
3. Sem assinatura ativa (`isBlocked`) o layout redireciona para `/assinatura`; a página abre o checkout da Cakto numa
   nova aba (URLs fixas em `src/components/sections/Assinatura.tsx:42`).
4. A Cakto chama `cakto-webhook` → `user_subscriptions` ativa com `expires_at = agora + 30/365 dias`, espelho em
   `subscribers`, receita "Pagamento de assinatura" **no dashboard do comprador** (⚠ A-19), `payment_notifications`,
   agendamento dos avisos de renovação (`schedule-user-webhooks`) e log em `cakto_webhook_logs`.
5. O front consulta `payment_notifications` a cada 10 s, solta confetes e marca a notificação como processada.
   ⚠ Não recarrega a assinatura — o usuário continua bloqueado até recarregar a página (A-24).

### 4.2 Lançamento manual
Formulário (Receitas/Despesas) → `AppContext.addReceita/addDespesa` (otimista) → insert com RLS (posse do usuário e do
dashboard) → cache em memória de 5 min por dashboard + canal realtime com debounce.

### 4.3 Renovação, falha e cancelamento
`purchase_approved`/`subscription_renewed` reativam; `subscription_renewal_refused` → `past_due`; `purchase_refused`
→ `pending_payment`; `pix_gerado`/`boleto_gerado` → `pending_payment` (sem sobrescrever plano ativo);
`subscription_canceled`/`refund`/`chargeback`/`subscription_expired` → `cancelled`/`refunded` **imediatamente**.

### 4.4 Lembrete diário (n8n)
Cron 23:00 UTC → `daily-transaction-reminder` → lista **todos** os perfis e, para cada um, consulta receitas e despesas
do dia → envia a lista (nome, e-mail, telefone) ao n8n (`/webhook/verificar-transacoes`).

### 4.5 Avisos de renovação
`schedule-user-webhooks` grava 3 linhas em `scheduled_webhooks` (5 dias antes, 1 dia antes e no dia de `expires_at`);
o cron das 10:00 UTC chama `process-scheduled-webhooks`, que envia ao n8n (`/webhook/centro-de-dados-relacionais`)
apenas as linhas com `scheduled_date = hoje`.

## 5. Regras de negócio (como implementadas)

| # | Regra | Onde |
|---|---|---|
| R1 | Sem plano gratuito; bloqueado vê só Assinatura, Configurações, Ajuda e Suporte. | `routes.ts:37`, `AuthenticatedLayout.tsx:83` (⚠ só no front — A-03) |
| R2 | Assinatura ativa = `status = 'active'` e `expires_at` futuro (ou tier `developer`). | `useUserSubscription.tsx:155-205` → hoje `_shared/assinatura.ts` e `tem_assinatura_ativa` (mesma regra) |
| R3 | Equipe e Fechamento só em dashboard `business`. | `routes.ts:40`, `AuthenticatedLayout.tsx:41` |
| R4 | 1 dashboard padrão por usuário; todo lançamento tem dashboard. | índice `idx_unique_user_default_dashboard`, triggers `ensure_*` |
| R5 | Limite de dashboards por plano. | `useFeatureAccess.tsx:69` (⚠ valores divergentes do webhook) → hoje `features.max_dashboards`/catálogo, imposto pelo trigger `validar_limite_de_dashboards` |
| R6 | Lançamento `pendente` "não é contabilizado até ser pago". | texto em `Receitas.tsx:345` (⚠ o Dashboard soma pendentes) |
| R7 | Recorrência gera cópias `paga` com sufixo "(Recorrente)". | `processar_*_recorrentes` |
| R8 | Imposto percentual incide sobre a receita do período. | `useFinancialCalculations.tsx:56` (⚠ nunca ocorria — A-15) → hoje `_shared/impostos.ts`, com `valor_tipo` gravado |
| R9 | Folha entra como custo mensal (semanal ×4, quinzenal ×2). | `useFinancialCalculations.tsx:86` |
| R10 | IA in-app: 50 mensagens/dia; suporte: 60/dia. | `ai-agent/index.ts:57`, `support-agent/index.ts:10` |
| R11 | Telefone único e normalizado (+55). | índice `idx_profiles_telefone_unique`, trigger `normalize_phone_trigger` |
| R12 | Excluir categoria em uso exige confirmação; exclusão lógica. | `useCategoriasPersonalizadas.tsx:149-197` |

## 6. Planos e oferta (Assinatura.tsx × cakto-webhook)

| Plano (UI) | Mensal | Anual | Vendido | `plan_id` (webhook) | `max_dashboards` gravado | Tier do front (`resolveTier`) | Perfis que o front libera |
|---|---|---|---|---|---|---|---|
| Plus Pessoal | 19,90 | 159,90 | 1 conta, dashboard básico | `personal_plus_*` | 1 | plus | 1 |
| Pro Pessoal | 34,90 | 279,90 | até 3 contas, dashboard avançado | `personal_pro_*` | 3 | pro | 3 |
| Plus Empresarial | 44,90 | 360,00 | 1 empresa | `business_plus_*` | 1 | ⚠ premium | ⚠ 5 |
| PRO Empresarial | 97,00 | 770,00 | até 2 empresas/perfis | `business_pro_*` | 2 | ⚠ premium | ⚠ 5 |
| Super Company | 147,00 | 1.170,00 | até 10 empresas/perfis | `business_enterprise_*` | 10 | ⚠ premium | ⚠ 5 |

Todos os planos prometem "Receitas/Despesas ILIMITADAS" e "IA no WhatsApp ILIMITADA (texto, áudio, foto)"; o suporte é
"Email/WhatsApp" (Plus Pessoal) ou "24/7" (demais), enquanto a Ajuda informa "WhatsApp das 8h às 18h".

## 7. Contratos externos (não quebrar)

### 7.1 Cakto → `cakto-webhook`
- URL: `https://hbyozfmpsgbxofcetdez.supabase.co/functions/v1/cakto-webhook`, `POST`, `verify_jwt = false`.
- Autenticação: header `x-webhook-signature: sha256=<hmac>` do corpo cru **ou** `secret` no corpo, comparados com o
  secret `CAKTO_WEBHOOK_SECRET` (tempo constante).
- Corpo: `{ event, data: {...} }`; o parser aceita vários caminhos (e-mail em `customer.email`, valor em `amount`,
  ids em `id`/`transaction_id`/`subscription.id`, plano por `metadata.plan_id`, `product.name` ou `offer.name`).
  ⚠ A unidade de `amount` (reais × centavos) precisa ser confirmada nos logs — bloco 10 do SQL de inspeção.
- Eventos: aprovados `purchase_approved`, `payment_approved`, `order_paid`, `subscription_renewed`; cancelamento
  `subscription_canceled`/`cancelled`, `refund`, `chargeback`, `subscription_expired` (+ aliases); pendentes
  `pix_gerado`, `boleto_gerado`, `picpay_gerado`, `openfinance_nubank_gerado`; falhas `purchase_refused`,
  `subscription_renewal_refused`; funil `initiate_checkout`, `checkout_abandonment`, `subscription_created`.
- Resposta: 200 processado/ignorado, 202 perfil ainda não existe, 4xx/5xx erro (a Cakto reenvia).

### 7.2 Functions → n8n (host `central-financy-n8n.y8enlt.easypanel.host`)
| Webhook | Origem | Payload |
|---|---|---|
| `/webhook/Novo-Usúario` | `novo-usuario-webhook` | `{ nome, email, telefone, data_cadastro, user_id }` |
| `/webhook/verificar-transacoes` | `daily-transaction-reminder` | `{ data, hora_verificacao, total_usuarios, usuarios: [{ nome, email, telefone, user_id }] }` |
| `/webhook/centro-de-dados-relacionais` | `process-scheduled-webhooks` (linhas de `schedule-user-webhooks`) | `{ nome, email, telefone, user_id, event_type: renovacao5\|renovacao1\|renovacao0, webhook_id }` |

### 7.3 n8n → banco (a confirmar com os workflows)
Tratar como contrato até prova em contrário: `validacao_n8n` (todas as colunas), `ai_recognized_transactions`,
`profiles.telefone`, `receitas`/`despesas`/`user_dashboards` (lançamentos pelo WhatsApp), `user_subscriptions`,
e toda RPC/function sem chamador no front (`get_user_main_dashboard`, `renew_subscription`, `check_user_exists`,
`get_dashboard_data`, `processar_*`, `ai-financial-agent`, `ai-support-agent`, `ai-tax-agent`,
`validate-developer-key`, `get-main-dashboard`).

### 7.4 pg_cron
| Job | Agenda (UTC) | Alvo | Autenticação enviada |
|---|---|---|---|
| `process-recurring-transactions` | `1 0 * * *` | function homônima | chave anon (a function exige `CRON_SECRET_TOKEN` → 401). ⚠ Desagendado em `20260515014327`. |
| `daily-transaction-reminder` | `0 23 * * *` | function homônima | chave anon |
| `process-scheduled-webhooks-daily` | `0 10 * * *` | `process-scheduled-webhooks` | chave anon |

### 7.5 Edge functions
| Function | `verify_jwt` | Chamador | Autenticação no código |
|---|---|---|---|
| `cakto-webhook` | false | Cakto | secret/HMAC |
| `ai-agent` | false | `FinancyAIChat` | `getUser(token)` |
| `ai-financial-insights` | false | `InteligenciaFinanceiraIA` | `getUser(token)` |
| `support-agent` | padrão (true) | `useSupportChat` | `getUser(token)` |
| `novo-usuario-webhook` | false | `useOnboarding` | ⚠ nenhuma (`userId` do corpo) |
| `process-recurring-transactions` | false | cron, botão Atualizar | `CRON_SECRET_TOKEN` |
| `daily-transaction-reminder` | padrão | cron | ⚠ nenhuma |
| `process-scheduled-webhooks` | padrão | cron | ⚠ nenhuma |
| `schedule-user-webhooks` | padrão | `cakto-webhook` | ⚠ nenhuma (`userId` do corpo) |
| `ai-financial-agent`, `ai-support-agent`, `ai-tax-agent` | true | nenhum (componentes órfãos) | `getUser(token)` |
| `validate-developer-key` | true | nenhum (componente órfão) | `getClaims` + `DEVELOPER_VALID_KEYS` |
| `get-main-dashboard` | true | nenhum | `getClaims` |

Secrets usados: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `CAKTO_WEBHOOK_SECRET`,
`CRON_SECRET_TOKEN`, `LOVABLE_API_KEY`, `OPENAI_API_KEY`, `DEVELOPER_VALID_KEYS`.

### 7.6 RPCs chamadas pelo front
`processar_transacoes_recorrentes_usuario`, `ensure_user_has_subscription`, `renew_subscription` (⚠ A-01),
`get_user_profile_data`, `request_human_support`.

## 8. Telas

| Rota | Tela | Função real |
|---|---|---|
| `/login` | AuthPage | Entrar, cadastrar, recuperar senha. |
| `/dashboard` | Dashboard (+ `DashboardAvancado` nos planos com `dashboard_avancado`) | Métricas do período, insights de IA, recorrências. |
| `/receitas`, `/despesas` | Receitas, Despesas (quase idênticas) | CRUD, status, importação/exportação de planilha. |
| `/categorias` | Categorias | Categorias personalizadas e gasto do mês por categoria. |
| `/impostos` | Impostos e Taxas | Vencimentos e marcação de pago (⚠ aparece igual para PF). |
| `/equipe` | Equipe (PJ) | Membros e folha. |
| `/metas` | Objetivos | Metas com valor atual manual. |
| `/relatorios` | Relatórios | Gráficos por período e PDF (jsPDF). |
| `/fechamento` | Fechamento de Caixa (PJ) | Resumo do dia e fluxo do período (sem persistência). |
| `/agentes-ia` | "Agentes de IA" | Um único assistente (`FinancyAIChat`). |
| `/assinatura` | Assinatura | Planos, checkout Cakto, plano atual (⚠ nunca exibido para pagantes — A-07). |
| `/configuracoes` | Configurações | Perfil, senha, e-mail, telefone, dashboards, apagar dados. |
| `/ajuda` | Ajuda e Suporte | FAQ, WhatsApp humano, e-mail. |
| `/suporte` | Suporte Inteligente | Chat do `support-agent` (mesmo chat do botão flutuante). |
| `/admin/suporte` | Atendimento humano | Admin responde chamados escalados. |
| `/auditoria/webhooks-cakto` | Auditoria de webhooks | Logs da Cakto (tier `developer`). |
