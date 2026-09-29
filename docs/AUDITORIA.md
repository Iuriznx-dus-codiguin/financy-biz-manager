# Financy — Auditoria técnica e de produto (Fase 0)

> Cada achado tem severidade, evidência (`arquivo:linha`), impacto e correção. **Status** indica o que foi feito nesta
> reestruturação; decisões de negócio ficam como `D-xx` em [`ARQUITETURA-ALVO.md`](./ARQUITETURA-ALVO.md#decisões-pendentes).
> Nada aqui foi declarado sem evidência: quando a prova depende do banco de produção, o achado diz qual bloco de
> [`sql/inspecao-banco.sql`](./sql/inspecao-banco.sql) confirma.

## Método e linha de base (27/09/2026)

| Verificação | Resultado |
|---|---|
| `npm ci` | **Falha**: `package-lock.json` fora de sincronia com `package.json` (faltam `exceljs`, `react-markdown`; `jspdf` 3.0.1 × ^4.2.1). |
| `bun install --frozen-lockfile` | Falha fora do Lovable: 173 pacotes apontam para um cache npm privado (`europe-west*-npm.pkg.dev/lovable-core-prod`). Reproduzido com as mesmas versões numa cópia temporária, sem alterar lockfiles. |
| `vite build` | OK. **1 chunk JS de 3.793,38 kB (1.016,27 kB gzip)** + CSS 108,29 kB. |
| `tsc --noEmit -p tsconfig.app.json` | OK, mas com `strict: false`, `noImplicitAny: false`, `strictNullChecks: false`. |
| `eslint .` | **210 problemas (172 erros, 38 avisos)**: 155 `no-explicit-any`, 20 `exhaustive-deps`, 18 `only-export-components`, 13 `no-case-declarations`; 136 em `src/`, 73 em `supabase/`. |
| Testes | Nenhum. |
| Banco | Sem acesso ao banco de produção (não é gerenciado pelo Lovable). Montei um **Postgres 16 local com shim do Supabase** (`scripts/db/`) e apliquei as 74 migrações: 71 aplicam, 3 falham (também não podem ter aplicado em produção). As provas "no harness" abaixo foram executadas nesse banco. |

## Situação após as Fases 1–3 (28/09/2026)

| Verificação | Linha de base | Agora |
|---|---|---|
| `npm run build` | OK; 1 chunk JS de 3.793,38 kB (1.016,27 kB gzip) + CSS 108,29 kB | OK; JS inicial 798,43 kB (246,85 kB gzip) + CSS 102,27 kB (17,32 kB gzip); gráficos, PDF e planilhas em chunks sob demanda |
| `npm run typecheck` | OK (sem `strict`) | OK (sem `strict`; **D-09**) |
| `npm run lint` | 210 problemas (172 erros) | 0 erros, 28 avisos (`exhaustive-deps`/fast-refresh) |
| `npm test` | nenhum teste | 96 testes (Vitest) em 13 arquivos |
| Banco local (`scripts/db`) | 71 de 74 migrações aplicam | 76 de 79 aplicam (as mesmas 3 inválidas); 7 arquivos de teste SQL passam |
| `scripts/deno/checar-functions.sh` | — | todas as functions e `_shared` passam no `deno check` |

Status por achado abaixo, com o commit e a evidência. **Nada foi aplicado em produção**: migrações, secrets e
deploy das functions seguem os pré-requisitos do PR.

## Resumo

| Severidade | Qtde | Destaques |
|---|---|---|
| Crítica | 4 | Paywall contornável por RPC pública (provado), RPCs que leem/alteram dados de qualquer usuário, paywall só visual, crons e webhooks n8n disparáveis por qualquer um. |
| Alta | 15 | Planos com limites errados, recorrência que não grava nem roda, webhook que estende assinatura em reenvio e erra plano/valor, datas em UTC, modelo financeiro com cinco "lucros", impostos percentuais perdidos, IA do WhatsApp possivelmente aberta a não pagantes. |
| Média | 16 | CORS, segredos n8n, custos de IA sem limite, cache/realtime do AppContext, onboarding não atômico, PF com dashboard PJ, drift de schema. |
| Baixa | 7 | Tipagem, código morto, duplicações, monólitos, UX. |

---

## Críticas

### A-01 — Qualquer pessoa ativa qualquer assinatura sem pagar
- **Evidência:** `supabase/migrations/20250925003707_…sql:165` cria `renew_subscription(p_user_id, p_new_expires_at, p_amount)`
  como `SECURITY DEFINER`, sem checar o chamador; nenhuma migração revoga `EXECUTE` de `anon`/`authenticated`.
  O front ainda expõe a chamada (`src/hooks/useUserSubscription.tsx:263`).
- **Prova (harness):** como `authenticated`, `select renew_subscription('<meu id>')` deixou minha assinatura `active`
  por 1 mês; como `anon` (só a chave pública do `.env`), `renew_subscription('<id de outro>', now() + '10 years')`
  ativou a conta de outro usuário por 10 anos. `isBlocked()` do front passa a liberar tudo.
- **Impacto:** receita — o produto inteiro fica gratuito para quem descobrir a RPC; integridade dos dados de cobrança.
- **Correção:** revogar `EXECUTE` de `PUBLIC/anon/authenticated` (manter `service_role`); remover a chamada do front.
  Bloco 12 do SQL mostra quantas contas estão ativas sem plano pago.
- **Status:** **Corrigido** — `ed0eb78` revoga `EXECUTE` de `renew_subscription` (e de outras 20 funções) para `anon`/`authenticated`; `ffd1472` remove a chamada do front. Prova: `scripts/db/testes/10_rpcs.sql` (anon e authenticated recebem 42501).
### A-02 — RPCs `SECURITY DEFINER` confiam no `p_user_id` recebido
- **Evidência:** todas executáveis por `anon` (harness, bloco 4 do SQL):
  `get_dashboard_data` (`20250918173633_…sql:61`, lê receitas/despesas/impostos/metas de quem a chamada indicar),
  `processar_transacoes_recorrentes_usuario` (`20251211000507_…sql:99`), `get_user_main_dashboard` (cria dashboard
  para terceiros), `migrate_orphan_transactions_to_main_dashboard`, `ensure_user_has_subscription`,
  `get_user_profile_data` (nome e tipo de conta de qualquer usuário), `user_has_feature`,
  `get_user_subscription_limits`, `processar_receitas_recorrentes`/`processar_despesas_recorrentes` (processamento
  global), `check_and_increment_rate_limit` (permite esgotar a cota de IA de outro usuário), `log_security_event`,
  `log_financial_data_access`, `log_bulk_financial_query` (poluem a auditoria), `check_user_exists` (enumeração de
  e-mails e telefones).
- **Impacto:** vazamento de dados financeiros (LGPD), negação de serviço da IA, lixo em logs de auditoria.
- **Correção:** guarda `p_user_id = auth.uid()` (ou chamador privilegiado: `service_role`, conexão direta/cron) nas que o
  front usa; revogar `EXECUTE` de `anon`/`authenticated` nas demais. Mantêm nome, assinatura e retorno (contrato n8n).
- **Status:** **Corrigido** — `ed0eb78`: guarda `exigir_acesso_ao_usuario` nas RPCs usadas pelo front e `EXECUTE` só para `service_role` nas demais; mesmos nomes, argumentos e retornos. Prova: `10_rpcs.sql` e `11_rpcs.privilegiado.sql`. **Pré-requisito:** n8n com a chave `service_role`.
### A-03 — O paywall é só visual
- **Evidência:** RLS de escrita de `receitas`/`despesas` só checa posse (`20250919161926_…sql:25-100`); `impostos`,
  `metas`, `categorias_personalizadas` idem; nenhuma function de IA consulta assinatura (`ai-agent/index.ts:40-63`,
  `ai-financial-insights/index.ts:33-46`); o bloqueio existe apenas em `AuthenticatedLayout.tsx:83`.
- **Impacto:** usuário sem assinatura grava dados pela API e consome IA (custo direto no gateway).
- **Correção:** função `tem_assinatura_ativa(uuid)`; policies **restritivas** de `INSERT/UPDATE` nas tabelas
  financeiras (leitura, exportação e exclusão continuam liberadas — LGPD); checagem de assinatura nas functions de IA
  (exceto suporte); onboarding por RPC atômica (o bloqueado ainda precisa concluí-lo).
- **Status:** **Corrigido** — `3179dcf` (`tem_assinatura_ativa` + policies restritivas de `INSERT`/`UPDATE`; prova em `20_paywall.sql`), `f0c5312`/`dc806c9` (functions de IA respondem 402 sem assinatura), `c656603`/`fd55d15` (onboarding por RPC, único caminho de escrita antes do pagamento).
### A-04 — Functions que disparam o n8n aceitam qualquer chamador
- **Evidência:** `daily-transaction-reminder/index.ts:15` e `process-scheduled-webhooks/index.ts:9` usam service role
  e não autenticam o chamador; não constam no `config.toml`, então o `verify_jwt` padrão aceita a chave anon pública.
  `schedule-user-webhooks/index.ts:20` e `novo-usuario-webhook/index.ts:27` (este com `verify_jwt = false`) usam o
  `userId` do corpo. O lembrete percorre **todos** os perfis com 2 consultas por usuário (`:62`).
- **Impacto:** qualquer pessoa dispara mensagens de WhatsApp para toda a base (custo, spam, risco de banimento do
  número), agenda avisos para terceiros e força carga no banco.
- **Correção:** `_shared/auth.ts` com `exigirChamadorInterno` (header `x-cron-secret` = `CRON_SECRET_TOKEN` ou
  bearer `service_role`), falhando fechado; `novo-usuario-webhook` passa a exigir JWT do próprio usuário; cron envia o
  segredo lido do Vault; lembrete usa uma consulta agregada.
- **Status:** **Corrigido** — `0f3aef7` (`exigirChamadorInterno` nas functions de cron/n8n; `novo-usuario-webhook` exige o JWT do próprio usuário) e migração `20260927120400` (cron envia `x-cron-secret` lido do Vault; prova em `50_cron.privilegiado.sql`). **Pré-requisitos:** secret `CRON_SECRET_TOKEN` e `cron_secret` no Vault.
---

## Altas

### A-05 — Tier calculado pelo nome do plano
- **Evidência:** `src/hooks/useFeatureAccess.tsx:97` — "Plus Empresarial", "PRO Empresarial" e "Super Company"
  (fallback por `subscription_type = 'business'`, `:102`) viram `premium`; `enterprise` é inalcançável (nenhum nome
  contém "enterprise"). `features.max_dashboards` gravado pelo webhook é ignorado.
- **Correção:** catálogo único de planos por `plan_id` (`supabase/functions/_shared/planos.ts`), usado pelo webhook e
  pelo front; limites lidos de `user_subscriptions.features`.
- **Status:** **Corrigido** — `9ada371` (catálogo `planos.ts` + regra `assinatura.ts`, testados), `ffd1472` (front lê plano e limites do catálogo e de `features`), `12952c7` (registros antigos sem `plan_id`).
### A-06 — Limite de perfis/empresas errado e não imposto no banco
- **Evidência:** `useFeatureAccess.tsx:73` (premium = 5 perfis) × vendidos 1, 2 e 10 (`Assinatura.tsx:130-175`,
  `cakto-webhook/index.ts:93-140`). A criação é só um `insert` com RLS de posse (`useDashboard.tsx:126`).
- **Correção:** limite vindo de `features.max_dashboards`; trigger `BEFORE INSERT` em `user_dashboards` que permite o
  primeiro dashboard e impõe o limite do plano aos demais. Dashboards existentes acima do limite são mantidos.
- **Status:** **Corrigido** — `3179dcf` (trigger `validar_limite_de_dashboards`; prova em `20_paywall.sql`) e `ffd1472` (limite real no diálogo e nas Configurações). Dashboards acima do limite são mantidos.
### A-07 — Pagantes nunca veem "Seu plano" na tela de Assinatura
- **Evidência:** `useUserSubscription.tsx:222` compara `subscription_type` com `premium`/`enterprise`, valores que o
  webhook nunca grava (`personal`/`business`); `Assinatura.tsx:194` usa esse `isPremium()`.
  `isBusinessPlan` decide por substring do nome (`:234`).
- **Status:** **Corrigido** — `ffd1472`: a tela mostra o plano ativo para qualquer assinatura ativa, com nome comercial e valor em BRL.
### A-08 — Quatro fontes de verdade para a assinatura
- **Evidência:** `useSubscription` (lê `subscribers`, `user_subscriptions` e `customer_subscriptions`, com e-mail cru
  interpolado em `.or()` — `useSubscription.tsx:54`), `useUserSubscription` (hook comum, não contexto: cada componente
  refaz 2–3 consultas), `useFeatureAccess` e `subscriptionHelpers`; a UI mostra o tier interno (`MobileSidebar.tsx:105`,
  `DashboardCreateDialog.tsx:185`, `Configuracoes.tsx:150`) em vez do nome do plano.
- **Impacto:** telas discordam entre si; e-mail com `,`/`)` quebra o filtro (injeção de filtro PostgREST).
- **Status:** **Corrigido** — `ffd1472`: `features/assinatura/useAssinatura` (React Query) substitui os quatro hooks; o filtro `.or()` com e-mail foi removido junto.
### A-09 — Admin e auditoria de pagamentos protegidos por "tier developer"
- **Evidência:** `useIsAdmin.ts:44` considera `developer` admin; `/admin/suporte` e `/auditoria/webhooks-cakto` têm
  guardas diferentes e só no componente (`AuditoriaWebhooksPage.tsx:174`); a policy de `cakto_webhook_logs`
  (`20260706220736_…sql:40-51`) libera pelo tier `developer`, concedido por `validate-developer-key` a quem tiver uma
  chave compartilhada. Chaves literais foram versionadas em repositório público (`20250920201928_…sql:26-30`); a
  função provavelmente nunca foi criada (migração inválida), mas as chaves estão no histórico do git.
- **Impacto:** quem obtiver uma chave de desenvolvedor lê payloads de pagamento (e-mail, telefone e nome de clientes).
- **Correção:** admin = `has_role(auth.uid(), 'admin')` no banco e numa guarda de rota única (`AdminRoute`); policy de
  `cakto_webhook_logs` por papel admin; payload do log com dados pessoais mascarados.
- **Status:** **Corrigido** — `ed0eb78` (policy de `cakto_webhook_logs` por `has_role(..., 'admin')`), `ffd1472` (`AdminGuard` nas duas rotas; developer não é admin), `c18959a` (payload do log mascarado). **Pré-requisitos:** cadastrar o admin em `user_roles` e rotacionar `DEVELOPER_VALID_KEYS`.
### A-10 — Recorrências não rodam sozinhas e perdem ocorrências
- **Evidência:** job desagendado (`20260515014327_…sql:4`); a function exige `CRON_SECRET_TOKEN`
  (`process-recurring-transactions/index.ts:47-62`); o botão "Atualizar" chama a function sem token, recebe 401 e
  ignora (`FloatingDashboardInfo.tsx:42`); cada chamada gera no máximo uma ocorrência por registro;
  `calcular_proxima_data` não conhece `anual` (devolve NULL, a recorrência morre); `CURRENT_DATE` é UTC.
- **Impacto:** quem não abre o app não tem recorrências; meses parados viram uma única ocorrência por dia de acesso.
- **Correção:** job `process-recurring-transactions` chama o SQL direto às 03:01 UTC (00:01 de Brasília), sem HTTP nem
  segredo; processamento com "hoje" em `America/Sao_Paulo`, recuperação de todas as ocorrências vencidas (limitada) e
  periodicidades `quinzenal`, `bimestral`, `trimestral`, `semestral`, `anual`; botão Atualizar usa a RPC do usuário.
- **Status:** **Corrigido** — `caca72e` (job SQL diário às 00:01 de Brasília, recuperação de ocorrências, novas periodicidades; prova em `30_recorrencias.privilegiado.sql` e `31_recorrencias.sql`) e `ffd1472` (botão Atualizar usa a RPC do usuário).
### A-11 — Recorrência criada pela interface nunca é gravada
- **Evidência:** o formulário monta `recorrente`, `tipo_recorrencia`, `proxima_data` (`Receitas.tsx:53-60`), mas
  `AppContext.addReceita` insere só 7 campos (`AppContext.tsx:387-401`) e o carregamento não lê os campos de
  recorrência (`:292-302`); `RecurringTransactions` filtra `r.recorrente && r.proxima_data` e fica sempre vazio.
- **Status:** **Corrigido** — `454165f`: `AppContext` grava e lê `recorrente`, `tipo_recorrencia` e `proxima_data`; a próxima data nunca repete o próprio lançamento (`recorrenciaDoLancamento`, testada).
### A-12 — Webhook da Cakto: expiração, plano, valor e usuário
- **Evidência (`supabase/functions/cakto-webhook/index.ts`):**
  - `:532` `expires_at = agora + duração` a cada evento aprovado: reenvio do mesmo pagamento estende a assinatura;
    renovação antecipada perde os dias restantes; `started_at` é reescrito (`:569`).
  - `:415` `/ano/` casa "pl**ano**" → qualquer produto chamado "Plano …" vira anual (365 dias);
    `:421` `/pro/` casa "**pro**duto"; `:410` casamento por substring.
  - `:343-349` `parseAmount` divide por 100 tudo acima de 1000: "Super Company anual" (R$ 1.170,00) vira R$ 11,70 se a
    Cakto enviar reais; a string "1.197,00" vira 1,197. Unidade real: bloco 10 do SQL.
  - `:281`, `:470` usuário buscado com `ilike` (e-mail com `_` casa outros e-mails).
  - `:672` cancelamento sem e-mail cancela por `cakto_subscription_id`, mas com e-mail cancela **a assinatura atual**,
    mesmo que o evento seja de uma assinatura antiga.
  - `:384` ignora `paymentMethod` (camelCase), sempre grava "Cakto"; `:228-242` o payload salvo no log mantém e-mail,
    telefone e nome do cliente.
- **Correção:** parser puro e testado em `_shared/cakto.ts` (identificação por id de oferta do checkout, depois por
  tokens inteiros; valor normalizado pelo preço de referência do plano); idempotência por `transaction_id` antes de
  qualquer efeito; `expires_at = max(agora, expiração vigente) + duração` só para pagamento novo; `started_at`
  preservado na renovação; busca exata de e-mail; cancelamento só da assinatura correspondente; payload mascarado.
- **Status:** **Corrigido, exceto o cancelamento** — `c18959a` (parser testado em `cakto.test.ts`: oferta, tokens inteiros, valor pelo preço de referência, `paymentMethod`, payload mascarado) e `22f1c67` (idempotência antes de qualquer efeito, `expires_at = max(agora, vigente) + duração`, `started_at` preservado, busca exata). Cancelamento: comportamento mantido e divergência registrada no log até confirmar o payload real (**D-18**).
### A-13 — Datas em UTC viram o dia seguinte e o dia anterior
- **Evidência:** 56 ocorrências de `toISOString().split('T')[0]` (21 em `src/`, 34 em `supabase/functions`, 1 `slice`),
  ex.: data padrão de Receitas (`Receitas.tsx:37`), do Fechamento (`Fechamento.tsx:31`), receita do webhook
  (`cakto-webhook/index.ts:543`), "hoje" do assistente (`ai-agent/index.ts:484`). Depois das 21h em Brasília o dia
  vira o seguinte. Na leitura, `new Date('AAAA-MM-DD')` é meia-noite UTC = 21h do dia anterior em Brasília
  (`dateFilters.ts:101`): o filtro "Hoje" mostra lançamentos de amanhã e esconde os de hoje; o dia 1º cai no mês
  anterior; um imposto aparece vencido no próprio dia (`Impostos.tsx:126`).
- **Correção:** `src/shared/lib/datas.ts` (datas-calendário sem fuso, "hoje" em `America/Sao_Paulo`) e equivalente em
  `_shared/datas.ts`; testes cobrindo 23h de Brasília.
- **Status:** **Corrigido** — `9ada371` (`datas.ts`, testado às 23h30 de Brasília), functions em `f0c5312`/`0f3aef7`/`22f1c67`, front em `454165f` (filtros, exibição com `dataLocal`, datas padrão) e `a853e7c` (planilhas). Testes: `datas.test.ts`, `dateFilters.test.ts`, `spreadsheetIO.test.ts`.
### A-14 — Modelo financeiro incoerente (cinco "lucros")
- **Evidência:**
  1. Dashboard básico: saldo = receitas − despesas (`Dashboard.tsx:137`).
  2. `useFinancialCalculations.tsx:97`: lucro = receitas − despesas − impostos − taxas (por vencimento, pagos ou não)
     − folha mensal fixa.
  3. `DashboardAvancado.tsx:126-157`: igual ao 2, mais "saldo atual" = saldo estático do onboarding + resultado **do
     período filtrado** (`:159-172`) — trocar o filtro muda o "saldo atual"; o período anterior não desconta folha.
  4. `Relatorios.tsx:33-38`: impostos **pagos** (incluindo taxas) + taxas pagas de novo → taxas contadas em dobro;
     sem folha.
  5. `ai-financial-insights/index.ts:113`: receitas − despesas − impostos pagos − folha mensal, para qualquer período
     (hoje, semana, ano).
  Também: folha semanal ×4/quinzenal ×2 para qualquer período; lançamentos pendentes somados apesar do texto
  "não será contabilizada até ser paga" (`Receitas.tsx:345`); "pró-labore recomendado = 11% do lucro"
  (`DashboardAvancado.tsx:253` — 11% é a alíquota de INSS do pró-labore, não uma recomendação); "capital de giro =
  3 × despesas do período" (`:254`, com filtro anual vira 3 anos).
- **Correção:** modelo único proposto em ARQUITETURA-ALVO §4 — **decisão D-01** (muda números exibidos).
- **Status:** **Parcial** — corrigido o que não muda regra: taxas em dobro nos Relatórios (`f4f07ce`), percentuais em reais no painel/relatórios/IA (`454165f`, `f4f07ce`, `f0c5312`) e datas. O modelo único aguarda **D-01**.
### A-15 — Imposto percentual volta como valor fixo
- **Evidência:** a tabela `impostos` não tem coluna de tipo de valor (`types.ts`, migração inicial); o carregamento
  fixa `valorTipo: 'fixo'` (`AppContext.tsx:321`). Um imposto de 5% vira R$ 5,00 após recarregar. A periodicidade do
  imposto recorrente e a próxima data também não são gravadas (`Impostos.tsx:37-69`).
- **Correção:** colunas `valor_tipo`, `tipo_recorrencia`, `proxima_data` (aditivas); front grava e lê, com fallback
  enquanto a migração não é aplicada. Registros antigos não podem ser recuperados (o percentual nunca foi salvo).
- **Status:** **Corrigido** — `caca72e` (colunas aditivas) e `454165f` (front grava e lê, com fallback sem as colunas). Percentuais antigos não são recuperáveis (nunca foram salvos).
### A-16 — Pagamentos de imposto e salário fora do fluxo de caixa (dupla contagem)
- **Evidência:** `Impostos.tsx:89-95` só alterna `pago`; salário não gera lançamento; os cálculos somam impostos e folha
  por fora. Quem registra o pagamento do DAS ou do salário como despesa conta duas vezes.
- **Correção:** parte do modelo financeiro (D-01): pagar imposto/folha gera (ou vincula) uma despesa.
- **Status:** **Pendente** — parte do modelo financeiro (**D-01**).
### A-17 — IA do WhatsApp possivelmente aberta a quem não paga
- **Evidência:** `sync_phone_to_validacao_n8n` grava `ativo = true` sempre que o telefone muda
  (`20251010163514_…sql:44-72`); `cakto-webhook` nunca atualiza `validacao_n8n` (colunas `plano`,
  `proxima_cobranca`, `data_inicio_assinatura` ficam paradas). Se o workflow do n8n checa só `ativo`, a principal
  feature vendida funciona sem assinatura. A tabela é criada fora das migrações (RLS e policies desconhecidas) e o front
  apaga linhas dela (`Configuracoes.tsx:212`).
- **Correção:** depende dos workflows do n8n (não fornecidos). Pronto para aplicar após confirmação: RPC
  `tem_assinatura_ativa` para o n8n consultar, e/ou sincronização de `plano`/`proxima_cobranca` pelo webhook, e RLS
  dona-do-registro em `validacao_n8n` (**D-04**). Blocos 2 e 14 do SQL.
- **Status:** **Pendente** — depende dos workflows do n8n (**D-04**). `tem_assinatura_ativa(uuid)` já existe para o n8n consultar com `service_role` (`3179dcf`).
### A-18 — `ai-agent` grava onde o cliente mandar e aceita qualquer mensagem
- **Evidência:** `ai-agent/index.ts:497` usa `dashboardId` do corpo com service role, sem validar posse; `:199` e
  `:272` repassam `messages` do cliente sem filtrar papel (aceita `system`) nem limitar tamanho/quantidade (o front
  envia o histórico inteiro a cada mensagem — `FinancyAIChat.tsx:232`); `:334` grava `agent_type =
  'financy_assistant'`, fora do `CHECK` da tabela (`20250804204612_…sql:5`) — falha silenciosa; valores e datas das
  ferramentas não são validados; o limite diário conta também ações diretas.
- **Status:** **Corrigido** — `f0c5312`: posse do dashboard, histórico saneado (só user/assistant, 20 mensagens, 4.000 caracteres), argumentos validados, exclusão/alteração filtradas pelo dashboard, `agent_type` válido, ações diretas fora do limite.
### A-19 — Pagamento da assinatura vira receita do cliente
- **Evidência:** `cakto-webhook/index.ts:539-551` insere "Pagamento de assinatura - …" como **receita** no dashboard
  principal do comprador. Para o cliente é uma saída; para a Financy a receita pertence ao caixa da empresa.
- **Correção:** **D-02** (parar de gravar / gravar como despesa do cliente / manter). Idempotência deixa de depender
  dessa receita. Registros existentes só mudam com aprovação (bloco 15 do SQL).
- **Status:** **Pendente de decisão** (**D-02**) — comportamento mantido; data em Brasília e idempotência independente da receita (`22f1c67`).
---

## Médias

| ID | Achado | Evidência | Correção / status |
|---|---|---|---|
| A-20 | CORS `*` em 11 functions; a allowlist existente não inclui o preview do Lovable, então o assistente falha no preview (a resposta volta com `Allow-Origin: https://app.financy.site`). | `ai-financial-insights/index.ts:5` e outras 10; `ai-agent/index.ts:5-24` | `_shared/cors.ts` (allowlist + preview do Lovable + `ALLOWED_ORIGINS`) em `f71708b`; functions reescritas e `get-main-dashboard` em `dc806c9`. **Corrigido.** |
| A-21 | URLs do n8n fixas num repositório público e sem segredo compartilhado. | `daily-transaction-reminder/index.ts:108`, `schedule-user-webhooks/index.ts:36`, `novo-usuario-webhook/index.ts:70` | `_shared/n8n.ts` em `f71708b` (base configurável, header `x-financy-secret`, falha fechada); uso em `0f3aef7`. **Corrigido**; o n8n deve validar o header. |
| A-22 | Insights sem limite de uso e com `forceRefresh` livre; `query_cache` sem limpeza; `checkRateLimit` libera em caso de erro. | `ai-financial-insights/index.ts:48,137`; `_shared/utils.ts:141` | Limite diário `ai_insights` só nas chamadas à IA, cache só de insights válidos (`f0c5312`); `checkRateLimit`/`consumirLimite` falham fechados (`f71708b`). **Corrigido**; limpeza periódica de `query_cache` fica como melhoria. |
| A-23 | Suporte informa só "planos Plus e Pro"; cada mensagem escalada cria outro escalonamento; modelo diferente dos demais. | `support-agent/index.ts:51,212,292-301` | Planos do catálogo, últimas 30 mensagens, um chamado aberto por conversa (`dc806c9`). **Corrigido.** |
| A-24 | Após o pagamento o app não recarrega a assinatura; `payment_notifications` consultada a cada 10 s para sempre. | `usePaymentSuccess.tsx:58` | Recarrega a assinatura e só consulta enquanto bloqueado (`ffd1472`). **Corrigido.** |
| A-25 | `AppContext` concentra todo o estado de servidor; o recarregamento pelo realtime lê o cache antigo (closure) e não atualiza por 5 min; canal realtime com nome fixo. | `AppContext.tsx:189-221`, `:204`, `:226-236` | Cache em ref, canal único, invalidação em toda escrita, paginação e proteção contra troca de dashboard (`454165f`). **Corrigido**; migrar para React Query por domínio fica como evolução. |
| A-26 | Todo usuário PF recebe um dashboard **empresarial**: o provider cria o padrão como `business` ao logar, antes do onboarding, que depois só renomeia para PJ. | `useDashboard.tsx:97-105`, `useOnboarding.tsx:71-107`, `get_user_main_dashboard` | Dashboard padrão criado como pessoal (`ffd1472`) e tipo/nome definidos pelo onboarding (`c656603`, `fd55d15`). **Corrigido para novos usuários**; existentes: **D-05**. |
| A-27 | Ícones de categoria nunca resolvem (nomes kebab-case contra exports PascalCase) e `import * as Icons` traz o lucide inteiro; categorias ignoram o dashboard. | `CategorySelector.tsx:11`, `Categorias.tsx:11`, `useCategoriasPersonalizadas.tsx:46` | Mapa explícito (`shared/ui/iconesCategoria.ts`, testado) em `a853e7c`. **Corrigido.** Escopo por dashboard: **D-06**. |
| A-28 | Excluir dashboard apaga dados pelo front, sem transação, e deixa equipe e categorias órfãs; "apagar todos os dados" ignora erros e esquece sessões de IA/suporte. | `useDashboard.tsx:159-176`, `Configuracoes.tsx:167-240` | RPCs `excluir_dashboard`/`apagar_meus_dados` (`c656603`, prova em `40_onboarding_exclusoes.sql`) usadas pelo front (`ffd1472`), com fallback. **Corrigido.** |
| A-29 | `novo-usuario-webhook` lê o perfil com cliente anon sem o JWT do usuário: a RLS de `profiles` devolve vazio e as boas-vindas provavelmente falham sempre. | `novo-usuario-webhook/index.ts:18-35` | JWT obrigatório e perfil lido com service role (`0f3aef7`). **Corrigido** (confirmar nos logs após o deploy). |
| A-30 | Onboarding em 6 escritas independentes; falhas de despesas e meta são ignoradas. | `useOnboarding.tsx:64-243` | `concluir_onboarding` (`c656603`) usada pelo front (`fd55d15`). **Corrigido.** |
| A-31 | Handler global silencia `AbortError`. A causa são locks de sessão do supabase-js 2.50 disputados por chamadas `getSession()` redundantes. | `main.tsx:7-15`, `FinancyAIChat.tsx:230` | `getSession()` redundantes removidos e handler só para `AbortError` (`fd55d15`). **Corrigido.** Atualizar o supabase-js: **D-08**. |
| A-32 | Todas as rotas no mesmo chunk; recharts, exceljs, jspdf e o lucide inteiro no carregamento inicial. | `App.tsx:18-35` | Rotas lazy (`ffd1472`), lucide sob demanda e exceljs/markdown lazy (`a853e7c`). **Corrigido:** JS inicial de 3.793 kB (1.016 kB gzip) para 798 kB (247 kB gzip). |
| A-33 | Lockfiles inconsistentes (`npm ci` falha; `bun.lock` depende de cache privado). | linha de base | **D-08** (exige regenerar lockfiles). |
| A-34 | Funções gravam `metadata` em `security_audit_logs`, coluna que não existe em produção (falham); `audit_financial_operations` copia cada lançamento inteiro para o log de auditoria, sem retenção. | `20260131163149_…sql:113`, `20250924185216_…sql:197`, `daily-transaction-reminder/index.ts:139`, `20250919161926_…sql:52` | `ensure_user_has_subscription` corrigida (`ed0eb78`). **Parcial**; retenção/escopo do log: **D-07**. |
| A-35 | Histórico de migrações não reproduz o banco: 3 migrações inválidas e colunas criadas à mão. | harness `scripts/db/apply-migrations.sh`; `scripts/db/drift/` | Documentado; migrações novas idempotentes e validadas no harness (`3cd2bbb`). |

## Baixas

| ID | Achado | Evidência | Status |
|---|---|---|---|
| A-36 | TypeScript sem `strict`; 69 `any` explícitos em `src/` (155 no lint contando `supabase/`); lint roda regras de browser sobre código Deno. | `tsconfig.app.json:25`, `eslint.config.js` | `npm run lint` com 0 erros (`91a29a7`; eram 172). `strict` gradual: **D-09**. |
| A-37 | 20 módulos órfãos (`AIAgentChat`, `DeveloperAccessDialog`, `RelatoriosAvancados`, `SubscriptionStatus`, `useAIChat`, `financialUtils`, `secureStorage`, `security`, …) e 22 primitivos shadcn sem uso; 5 functions sem chamador; dois provedores de IA; duplicações (`excelExport` × `spreadsheetIO`, `phoneValidation` × `evolutionPhoneValidation`, Receitas × Despesas, três cálculos de folha); funções SQL "de segurança" sem uso. | `scripts` de grafo de imports no PR | Módulos órfãos, duplicatas e exports sem uso removidos (`c27fb63`, `a853e7c`, `6cac177`); functions e funções SQL sem chamador mantidas até confirmar o n8n (**D-03**). |
| A-38 | Produto: 18 das 22 features dos tiers nunca bloqueiam nada; 5 não existem (`ia_pixel`, `gestao_multi_empresa`, `premiacoes_anuais`, `fechamento_automatico`, `relatorios_corporativos`); três entradas de suporte; "Agentes de IA" com um assistente; menu sem nomenclatura PF/PJ; "Impostos e Taxas" igual para PF. | `useFeatureAccess.tsx:4-39`, `routes.ts:42-57` | Tiers fictícios removidos com o hook único (`ffd1472`); menu, nomes PF/PJ e suporte coerentes (`aa64af4`). Oferta: **D-10**. |
| A-39 | Oferta × realidade: "IA ILIMITADA" e suporte "24/7" × limite de 50 mensagens/dia no assistente e "WhatsApp das 8h às 18h". | `Assinatura.tsx:102-123`, `FinancyAIChat.tsx:41`, `Ajuda.tsx:259` | **D-10** (não alterei a oferta). |
| A-40 | Monólitos: `Configuracoes` 1.171 linhas, `DashboardAvancado` 1.021, `cakto-webhook` 861, `AppContext` 832, `ai-agent` 802. | — | `ai-agent` e `cakto-webhook` em módulos (`f0c5312`, `c18959a`), `AppContext` reescrito (`454165f`), front por domínio (Fase 2). **Parcial:** `Configuracoes` e `DashboardAvancado` seguem grandes. |
| A-41 | Dinheiro com `parseFloat`/`toFixed`/`toLocaleString` espalhados e soma em ponto flutuante. | `Receitas.tsx:55` e outros | `shared/lib/dinheiro.ts` (centavos, testado) em cálculos de impostos, relatórios, assinatura, planilhas e functions. **Parcial:** algumas telas ainda formatam com `toLocaleString`. |
| A-42 | Página 404 em inglês e fora do tema. | `NotFound.tsx` | 404 em português e no tema (`ffd1472`). **Corrigido.** |

## Achados durante a implementação

| ID | Achado | Evidência | Status |
|---|---|---|---|
| A-43 | `get_user_profile_data` sempre falhava ("column reference user_id is ambiguous"): a personalização do perfil principal nunca carregava. | harness, `10_rpcs.sql` | Corrigida em `ed0eb78` (mesma assinatura). |
| A-44 | Formulário de Metas declarado dentro do render: o campo perdia o foco a cada tecla. | `Metas.tsx` (antes `MetaFormFields` interno) | Corrigido em `91a29a7`. |
| A-45 | Relatório "Impostos e Taxas" mostrava percentual como reais ("6%" → R$ 6,00); exportação Excel levava ids internos e JSON. | `Relatorios.tsx` | Corrigido em `91a29a7`. |
| A-46 | Importação de planilha: "1234.56" virava 123456 e datas vazias viravam o dia seguinte depois das 21h. | `spreadsheetIO.ts` (`parseNumber`, `parseDate`) | Corrigido em `a853e7c` (testado). |
| A-47 | Marcar imposto recorrente como pago desligava a recorrência (o update enviava `recorrente=false`). | `AppContext.updateImposto` | Corrigido em `454165f`. |
| A-48 | Pré-checagem de telefone duplicado no onboarding nunca encontra nada: a RLS de `profiles` só mostra o próprio perfil. A constraint única segura o duplicado no fim. | `phoneValidation.ts` | Documentado; checagem antecipada exige decisão (**D-19**: uma RPC de disponibilidade permitiria enumerar telefones). |
| A-49 | Lançamento inserido sem `dashboard_id` por usuário sem dashboard padrão falha: o trigger cria o padrão, mas a policy (função `STABLE`) não o enxerga no mesmo comando. Afeta só quem grava sem dashboard (possivelmente o n8n). | harness (teste do usuário developer) | Não alterado; recomendação no **D-04** (n8n enviar `dashboard_id` via `get_user_main_dashboard`). |
| A-50 | Textos contra a oferta: painel pedia plano "Premium", selo mostrava tier legado, exclusão de dados citava "teste gratuito". | `Dashboard.tsx`, `DashboardPersonalization.tsx`, `Configuracoes.tsx` | Corrigido em `aa64af4` (planos lidos do catálogo). |
| A-51 | Functions legadas sem chamador (`ai-financial-agent`, `ai-tax-agent`) gravavam lançamentos e consumiam IA sem assinatura; a confirmação duplicava lançamentos. | `ai-financial-agent/index.ts` | Protegidas em `dc806c9`; remoção: **D-03**. |
| A-52 | Banner "vence em N dias" nunca aparece para assinantes ativos (só é montado para bloqueados). Ligá-lo com "Renovar agora" arrisca pagamento em dobro em assinaturas com renovação automática. | `AuthenticatedLayout.tsx`, `SubscriptionBanners.tsx` | Mantido; **D-17**. |
