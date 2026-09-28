# Relatório final — reestruturação do Financy (Fases 0–3)

Branch `claude/financy-restructure-xavsf8`, base `95cc1c0` (a `main` não avançou desde então). Detalhe por achado,
com commit e evidência, em [`AUDITORIA.md`](./AUDITORIA.md); arquitetura e decisões em
[`ARQUITETURA-ALVO.md`](./ARQUITETURA-ALVO.md).

**Nada foi aplicado em produção.** As migrações, os secrets, o deploy das functions e a publicação do front seguem a
ordem da seção 4.

## 1. Resumo

- **Segurança e cobrança:** a RPC que ativava qualquer assinatura sem pagamento foi fechada. RPCs que agiam sobre
  qualquer usuário agora exigem o próprio usuário ou o backend. O paywall passou a ser garantido pelo banco (RLS
  restritiva) e pelas functions de IA. Crons e webhooks do n8n exigem segredo. Admin é por papel, não mais por
  "tier developer". O webhook da Cakto ficou idempotente, soma a duração à expiração vigente e identifica plano e
  valor corretamente.
- **Regras únicas e testadas:** datas de Brasília, dinheiro em centavos, recorrência, impostos, catálogo de planos,
  regra de assinatura e parser da Cakto ficam em `supabase/functions/_shared`. O front, as functions e o SQL usam a
  mesma regra, com 96 testes Vitest e 7 arquivos de teste SQL.
- **Bugs de produto corrigidos:**
  - recorrência que nunca era gravada e que não rodava sozinha;
  - imposto percentual que voltava como valor fixo;
  - datas deslocadas depois das 21h;
  - limites de plano errados;
  - pagantes sem "Seu plano";
  - taxas contadas em dobro nos Relatórios;
  - ícones de categoria sempre iguais;
  - formulário de metas que perdia o foco;
  - planilhas que liam "1234.56" como 123456;
  - onboarding que perdia gastos e meta.
- **Estrutura:** front organizado por domínio (`src/app`, `src/features/*`, `src/shared`), com 20 módulos órfãos e
  os exports sem uso removidos. Lint sem erros (eram 172). O JS inicial caiu de 3,8 MB para 0,8 MB.
- **Produto:** vocabulário PF/PJ no menu e nas telas, "Assistente de IA" no singular, uma entrada de suporte, e o
  suporte e os textos passaram a usar os planos reais. **A oferta não mudou:** preços, planos, limites e textos dos
  cards continuam os mesmos.

## 2. O que mudou, por fase

| Fase | Commits | Conteúdo |
|---|---|---|
| 0 | `3cd2bbb`, `ec26575` | Harness Postgres local; `DOMINIO`, `AUDITORIA`, `ARQUITETURA-ALVO`, `inspecao-banco.sql`, `CLAUDE.md`. |
| 1 — regras e testes | `d1f47fc`, `0829db2`, `9ada371`, `c18959a` | Vitest; caracterização; regras puras compartilhadas; parser da Cakto corrigido. |
| 1 — banco | `ed0eb78`, `3179dcf`, `caca72e`, `c656603` + `20260927120400` | 5 migrações idempotentes com reversão comentada (RPCs, paywall, limite de dashboards, recorrências, impostos, onboarding, exclusões, índices, cron autenticado). |
| 1 — functions | `f71708b`, `22f1c67`, `0f3aef7`, `f0c5312`, `dc806c9` | `_shared` (CORS, HTTP, auth, acesso, IA, n8n, log, paginação); webhook; crons; assistente; insights; suporte; legadas protegidas. |
| 1 — front | `93cf1a1`…`91a29a7` | Hook único de assinatura, admin por papel, rotas lazy, datas, recorrência e impostos persistidos, onboarding por RPC, erros reais das functions, lint. |
| 2 | `47cc220`…`6cac177` | Código por domínio (só `git mv` e imports), exports mortos removidos. |
| 3 | `aa64af4`, `f4f07ce` | Nomenclatura PF/PJ, menu, textos coerentes com a oferta; taxas em dobro nos Relatórios. |

## 3. Evidências

| Verificação | Linha de base | Agora |
|---|---|---|
| `npm run build` | OK | OK |
| `npm run typecheck` | OK | OK |
| `npm run lint` | 210 problemas (172 erros) | 0 erros, 28 avisos |
| `npm test` | — | 13 arquivos, 96 testes |
| Migrações no harness | 71/74 | 76/79 (as mesmas 3 inválidas); `scripts/db/testes/rodar.sh`: 7/7 |
| `scripts/deno/checar-functions.sh` | — | todas as functions e `_shared` OK |

### Tamanhos do build (`vite build`)

| | Antes | Depois |
|---|---|---|
| JS carregado na abertura | 3.793,38 kB (1.016,27 kB gzip) — chunk único | 798,43 kB (246,85 kB gzip) |
| CSS | 108,29 kB | 102,27 kB (17,32 kB gzip) |
| Sob demanda | — | recharts 411 kB (painel/relatórios), exceljs 938 kB (só ao importar/exportar planilha), jspdf 416 kB + html2canvas 201 kB (só no PDF), uma página por rota (2–60 kB) |

## 4. Deploy (ordem) e rollback

**Antes de tudo:** rodar `docs/sql/inspecao-banco.sql` e enviar os resultados + os workflows do n8n exportados, e
congelar edições no Lovable até a sincronização.

1. Confirmar que o n8n usa a chave `service_role` (ou conexão direta) para RPCs e tabelas.
2. Secrets das functions: `CRON_SECRET_TOKEN` (confirmar se já existe) e **`N8N_WEBHOOK_SECRET` (novo)**. Sem eles,
   as functions de cron e n8n respondem 401/503 (falham fechadas). Opcionais: `N8N_WEBHOOK_BASE_URL`, `ALLOWED_ORIGINS`.
3. Vault: `select vault.create_secret('<mesmo valor do CRON_SECRET_TOKEN>', 'cron_secret');`.
4. n8n: validar o header `x-financy-secret` nos webhooks de lembrete, avisos e boas-vindas.
5. Aplicar as migrações, na ordem: `20260927120000`, `…120100`, `…120200`, `…120300`, `…120400`.
6. Papel admin da conta dona:
   `insert into public.user_roles (user_id, role) select id, 'admin' from auth.users where email = '<e-mail>' on conflict do nothing;`
7. Rotacionar `DEVELOPER_VALID_KEYS` se alguma chave coincidir com as do histórico do git (A-09).
8. Deploy das functions (todas importam `_shared`): `ai-agent`, `ai-financial-insights`, `support-agent`,
   `cakto-webhook`, `daily-transaction-reminder`, `process-scheduled-webhooks`, `process-recurring-transactions`,
   `schedule-user-webhooks`, `novo-usuario-webhook`, `ai-financial-agent`, `ai-support-agent`, `ai-tax-agent`,
   `get-main-dashboard`, `validate-developer-key`.
9. Merge na `main` (o Lovable publica o front). O front tolera RPC/coluna ausente, mas a ordem acima evita esse modo.
10. Só após aprovar o D-03 e confirmar que o n8n não as chama:
    `supabase functions delete ai-financial-agent`, `supabase functions delete ai-support-agent`,
    `supabase functions delete ai-tax-agent`, `supabase functions delete validate-developer-key`,
    `supabase functions delete get-main-dashboard`.

**Rollback:**
- Front e functions: `git revert -m 1 <merge>` na `main` e redeploy das functions da versão anterior.
- Banco: cada migração traz a reversão comentada no topo. Nenhuma apaga ou altera dados existentes. As colunas
  novas são aditivas e podem ficar.
- Cron: a reversão de `20260927120400` reaplica os jobs antigos.

## 5. Checklist no preview do Lovable

1. **Login** e logout; link de verificação de e-mail cai no painel (hash preservado).
2. **Conta sem assinatura:** só Assinatura, Configurações, Central de Ajuda e Suporte. Tentar lançar pela API deve
   ser recusado pelo banco.
3. **Assinatura ativa:** tela Assinatura mostra "Sua Assinatura Atual" com nome comercial, período, valor em R$ e
   limite de perfis/empresas.
4. **Dashboard PF:** menu com Entradas, Gastos, Contas e Compromissos e Objetivos; sem Equipe e Fechamento.
   **Dashboard PJ:** Receitas, Despesas, Impostos e Taxas, Metas, Equipe e Fechamento.
5. **Criar perfil/empresa** acima do limite do plano mostra "Seu plano permite N perfil(is)/empresa(s)".
6. **Lançamento:** nova receita e nova despesa com data de hoje. Depois das 21h continua o mesmo dia, e o filtro
   "Hoje" as mostra.
7. **Recorrência:** despesa mensal recorrente aparece no card "Transações Recorrentes" do painel com a próxima data;
   "Processar agora" gera as vencidas.
8. **Imposto percentual** (ex.: 6%) continua percentual ao recarregar. Marcar como pago não desliga a recorrência.
9. **Pagamento de teste na Cakto:** assinatura ativa com a expiração certa, confete e aviso. Reenviar o mesmo
   webhook não estende a assinatura (`idempotent_retry: true`).
10. **Assistente de IA:** "gastei 50 no mercado hoje" registra a despesa no dashboard atual; perguntar o total do
    mês; sem assinatura, a mensagem mostra "exige uma assinatura ativa".
11. **Suporte:** o chat cita os planos reais; pedir atendente humano gera um chamado só.
12. **Admin:** `/auditoria/webhooks-cakto` e `/admin/suporte` abrem só para o papel admin.

## 6. Decisões pendentes

| ID | Tema | Recomendação | Bloqueia |
|---|---|---|---|
| D-01 | Modelo financeiro único (caixa, contas a pagar, imposto/folha como despesa) | Aprovar; entrega própria | A-14, A-16 |
| D-02 | Receita "Pagamento de assinatura" no dashboard do cliente | Parar de gravar; manter as existentes | A-19 |
| D-03 | Remover functions/funções SQL sem chamador | Remover após confirmar o n8n | A-37 |
| D-04 | Paywall do WhatsApp e `validacao_n8n` | n8n consulta `tem_assinatura_ativa` | A-17, A-49 |
| D-05 | Converter dashboards PF criados como PJ | Só os sem equipe/fechamento | A-26 |
| D-06 | Categorias por dashboard | Aprovar com cópia das atuais | A-27 |
| D-07 | Retenção de `security_audit_logs` | Só metadados, 180 dias | A-34 |
| D-08 | Regenerar lockfiles e atualizar supabase-js; Vitest como devDependency | Aprovar | A-31, A-33 |
| D-09 | TypeScript `strict` gradual | Aprovar por pasta | A-36 |
| D-10 | Oferta × realidade ("IA ILIMITADA", "24/7") | Decisão comercial | A-39 |
| D-11 | Cancelamento corta na hora ou no fim do período | Fim do período pago | — |
| D-12 | Carência na renovação | 3 dias com banner | — |
| D-13 | Lembrete diário só para assinantes com telefone | Sim | — |
| D-14 | Recorrência gerada como paga × pendente | Pendente para despesas futuras | — |
| D-15 | Fuso único `America/Sao_Paulo` | Manter | — |
| D-16 | Branch por fase × commits por fase | Revisar por commits | — |
| D-17 | Aviso de renovação para assinantes ativos | Sem botão de pagamento | A-52 |
| D-18 | Cancelamento por e-mail cancela a assinatura atual | Casar por `cakto_subscription_id` | A-12 |
| D-19 | Checagem antecipada de telefone duplicado | Manter só a constraint | A-48 |
| D-20 | Expor quinzenal/bimestral/trimestral/semestral nos formulários | Aprovar | — |

## 7. Novas funcionalidades (priorizadas)

Ordem por impacto no cliente × esforço, aproveitando o que já existe (recorrência, IA, n8n, catálogo de planos).

| # | Funcionalidade | Por quê | Esforço | Depende de |
|---|---|---|---|---|
| 1 | **Contas a pagar e a receber** com vencimento, status e aviso no WhatsApp no dia | É a dor nº 1 de PF e PJ; a recorrência e o lembrete diário já existem | Médio | D-01, D-14 |
| 2 | **Fluxo de caixa projetado** (30/60/90 dias) | Mostra o saldo futuro com recorrências, pendentes, impostos e folha; forte diferencial PJ | Médio | 1 |
| 3 | **Orçamento por categoria** com alerta de estouro (app e WhatsApp) | Controle proativo em vez de só registro; simples sobre os dados atuais | Baixo | — |
| 4 | **Importação de extrato (OFX/CSV)** com categorização pela IA e detecção de duplicados | Reduz digitação; reaproveita importação de planilha e o assistente | Médio | — |
| 5 | **Calendário fiscal do MEI/Simples** (DAS dia 20, DASN, DEFIS) pré-cadastrado conforme o regime | Aproveita impostos recorrentes; relevante para o público PJ pequeno | Baixo | D-20 |
| 6 | **Relatório mensal automático** (PDF por e-mail/WhatsApp no dia 1º) | Reaproveita Relatórios e o n8n; aumenta retenção | Baixo | — |
| 7 | **Perfil compartilhado** (casal ou sócio com acesso ao mesmo dashboard) | O plano Pro Pessoal é vendido como "ideal para casais", mas hoje cada conta é individual | Alto | RLS por membro |
| 8 | **Separação PF/PJ para MEI:** pró-labore e retirada como transferência PJ→PF | Evita a mistura de contas, erro comum do pequeno empresário | Médio | D-01 |
| 9 | **Anexos e recibos** no lançamento (foto da nota lida pela IA) | O WhatsApp já aceita foto; falta guardar e exibir o comprovante | Médio | Storage |
| 10 | **Metas com aportes vinculados** a lançamentos (progresso real) | Hoje o progresso é digitado à mão | Baixo | — |

## 8. Riscos remanescentes

- O n8n pode chamar RPCs com a chave anon. Com as guardas, essas chamadas passam a ser recusadas. A mitigação é o
  pré-requisito 1; a reversão por função está documentada.
- `AppContext` ainda concentra os dados do dashboard (corrigido no lugar; migração para React Query por domínio é a
  próxima etapa técnica). `Configuracoes` e `DashboardAvancado` seguem grandes.
- Lockfiles inconsistentes (D-08): o `npm ci` falha fora do Lovable; o Vitest roda via `npx` sem tocar nos lockfiles.
