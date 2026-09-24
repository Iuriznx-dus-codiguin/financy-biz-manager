# Prompt para o Lovable

Este arquivo reúne o que **não pode ser resolvido editando o repositório** — depende de configurar segredos, apagar recursos no Supabase, ou de decisões que precisam ser validadas em ambiente com dados reais.

Use os prompts abaixo **na ordem**. Os blocos 1 e 2 são obrigatórios antes de fazer merge da branch `chore/auditoria-seguranca-performance`; sem eles, rotinas agendadas passam a responder 500.

---

## 1. Configurar segredos e reapontar os crons (OBRIGATÓRIO antes do merge)

Cole no Lovable:

> As edge functions `daily-transaction-reminder`, `process-scheduled-webhooks` e `process-recurring-transactions` passaram a exigir autenticação por token de cron, e as URLs do n8n saíram do código-fonte para variáveis de ambiente. Preciso que você:
>
> **1.1 — Crie os secrets** (gere um valor aleatório forte para o `CRON_SECRET_TOKEN`, com 32+ caracteres):
>
> - `CRON_SECRET_TOKEN` — token único para autenticar as rotinas agendadas
> - `N8N_NEW_USER_URL` = `https://central-financy-n8n.y8enlt.easypanel.host/webhook/Novo-Usúario`
> - `N8N_DAILY_REMINDER_URL` = `https://central-financy-n8n.y8enlt.easypanel.host/webhook/verificar-transacoes`
> - `N8N_RELATIONAL_DATA_URL` = `https://central-financy-n8n.y8enlt.easypanel.host/webhook/centro-de-dados-relacionais`
> - `WEBHOOK_ALLOWED_HOSTS` = `central-financy-n8n.y8enlt.easypanel.host`
>
> **1.2 — Atualize os agendamentos (pg_cron ou agendador externo)** de `daily-transaction-reminder` e `process-scheduled-webhooks` para enviar o header `Authorization: Bearer <CRON_SECRET_TOKEN>`. Hoje eles chamam sem esse header e, depois desta mudança, receberão 401. Me mostre a definição atual de cada cron job antes de alterar.
>
> **1.3 — Confirme** que `process-recurring-transactions` também é chamada por cron com esse header (ela já exigia o token antes, então pode já estar correta).
>
> Não altere nenhum arquivo de código neste passo — é só configuração.

---

## 2. Remover do ar recursos que não existem mais no repositório

> Removi do repositório as edge functions `ai-financial-agent`, `ai-support-agent` e `ai-tax-agent` numa auditoria anterior e depois as restaurei, então elas continuam no código. Mas quero confirmar a situação delas em produção:
>
> 1. Liste todas as edge functions **atualmente deployadas** no projeto e compare com as pastas em `supabase/functions/`.
> 2. Para cada function deployada que não tenha pasta correspondente no repositório, me diga qual é e desde quando não recebe deploy — não apague nada ainda, só me mostre a lista.
>
> Depois disso eu decido o que remover.

---

## 3. Confirmar a unidade do campo `amount` no webhook da Cakto (BUG FINANCEIRO ABERTO)

Este é o item mais importante que ficou sem resolução definitiva.

> No `supabase/functions/cakto-webhook/index.ts`, a função `parseAmount` decide se o valor recebido está em reais ou em centavos usando uma heurística: `valor > 1000 ? valor / 100 : valor`.
>
> Essa heurística está **errada** para vendas acima de R$ 1.000,00 informadas em reais — um plano de R$ 1.200,00 é registrado no caixa como R$ 12,00. Mas não posso simplesmente removê-la: se a Cakto envia `amount` em centavos, ler o valor direto multiplicaria por 100 toda a receita registrada.
>
> Preciso que você:
>
> 1. Consulte a tabela `cakto_webhook_logs` e me mostre, dos últimos 20 eventos aprovados, o campo `payload` com os valores brutos de `amount` (e variantes como `total_amount`, `price`, `paid_amount`) ao lado do `amount` já convertido e do `plan_name`.
> 2. Compare esses valores com os preços reais dos planos e me diga, com evidência: **a Cakto envia `amount` em reais ou em centavos?**
> 3. Se for possível, confirme também pela documentação oficial da Cakto.
>
> Não altere o código ainda — quero ver os dados primeiro. Depois removemos a heurística e deixamos a conversão explícita.

---

## 4. Rotacionar a chave anon do Supabase

> O arquivo `.env` esteve versionado num repositório público do GitHub, contendo `VITE_SUPABASE_PUBLISHABLE_KEY` (chave anon). A chave anon é pública por natureza — ela vai no bundle do frontend de qualquer forma — então isso **não é uma brecha por si só**, já que toda a proteção real vem das policies de RLS.
>
> Ainda assim, quero rotacionar por precaução. Me explique:
>
> 1. Qual é o procedimento para rotacionar a chave anon neste projeto e o que quebra durante a troca.
> 2. Se algum lugar guarda essa chave além do `.env` e das configurações de deploy.
>
> Confirme também que a `SUPABASE_SERVICE_ROLE_KEY` **nunca** apareceu em nenhum arquivo versionado — ela nunca deveria estar no `.env` do frontend.

---

## 5. Paginar o carregamento de transações (otimização estrutural)

Esta é a maior dívida de performance que sobrou, e mexer nela exige validar com dados reais.

> O `src/contexts/AppContext.tsx`, na função `carregarDados()`, faz `select('*')` em `receitas`, `despesas`, `impostos`, `metas` e `equipe_membros` **sem filtro de data e sem limite**, trazendo todo o histórico do usuário para a memória a cada troca de dashboard. Todas as telas então filtram no cliente (`TimeFilter`, `dateFilters.ts`).
>
> Funciona hoje, mas degrada de forma previsível conforme a base cresce. Antes de mexer, preciso medir:
>
> 1. Me mostre, por usuário, a contagem de linhas em `receitas` e `despesas` — mínimo, média, mediana, percentil 95 e máximo.
> 2. Me diga o tamanho médio em bytes de uma linha de `receitas` e de `despesas`.
> 3. Verifique se existe índice composto em `(user_id, dashboard_id, data)` nas duas tabelas. Se não existir, me mostre o `EXPLAIN ANALYZE` da consulta que o `carregarDados()` faz para o usuário com mais linhas.
>
> Com esses números eu decido se vale paginar agora ou se basta criar os índices. **Não altere código nem crie índices ainda.**

---

## 6. Consolidar as três tabelas de assinatura

> A plataforma tem três tabelas de assinatura coexistindo: `subscribers`, `user_subscriptions` e `customer_subscriptions`. Os hooks `useSubscription` e `useUserSubscription` leem combinações diferentes das três, com regras de prioridade próprias em cada um. Isso é uma fonte permanente de divergência — o mesmo usuário pode aparecer como assinante num lugar e não-assinante em outro.
>
> Antes de consolidar, preciso entender o estado real:
>
> 1. Quantas linhas tem cada uma das três tabelas?
> 2. Quantos usuários aparecem em mais de uma? Desses, em quantos os dados **divergem** (tier/status/validade diferentes)? Me mostre alguns exemplos concretos.
> 3. `customer_subscriptions` recebeu alguma escrita nos últimos 90 dias? Alguma edge function ainda escreve nela?
>
> Com isso definimos qual é a tabela canônica e como migrar. **Não altere nada ainda.**

---

## 7. Separar "acesso de desenvolvedor" de "papel de administrador"

> O hook `src/hooks/useIsAdmin.ts` considera admin quem tem papel `admin` em `user_roles` **ou** tier `developer` na tabela `subscribers`:
>
> ```ts
> isAdmin: hasAdminRole || isDeveloperTier(subscription)
> ```
>
> Isso significa que quem resgata uma chave de desenvolvedor (via `validate-developer-key`) ganha acesso às áreas administrativas — `/admin/suporte` e `/auditoria/webhooks-cakto`, que expõem conversas de suporte de outros usuários e logs de pagamento.
>
> Quero saber se isso é intencional:
>
> 1. Quantos usuários têm hoje `subscription_tier = 'developer'` em `subscribers`? Liste os e-mails mascarados.
> 2. Quantos têm papel `admin` em `user_roles`?
> 3. Há sobreposição entre os dois grupos?
>
> Se a intenção do tier developer era apenas liberar as features pagas (e não dar acesso administrativo), o certo é separar os conceitos. **Me mostre os dados antes de propor a mudança.**

---

## 8. Ativar o TypeScript estrito por etapas

> O `tsconfig.app.json` e o `tsconfig.json` deste projeto têm `strict: false`, `noImplicitAny: false` e `strictNullChecks: false`. Isso deixa passar o tipo de erro que mais aparece numa plataforma financeira: valor `undefined` entrando em cálculo e virando `NaN` na tela.
>
> Ligar tudo de uma vez produziria centenas de erros. Quero fazer por etapas:
>
> 1. Rode o typecheck com `strictNullChecks: true` **sem alterar os arquivos** e me diga quantos erros aparecem, agrupados por diretório (`src/hooks`, `src/components/sections`, `src/utils`, etc.).
> 2. Me indique qual diretório tem a melhor relação entre poucos erros e alto risco financeiro — por onde começar.
>
> Depois ativamos diretório por diretório.

---

## 9. Criar a primeira suíte de testes

> O projeto não tem nenhum teste automatizado. Os dois bugs financeiros mais graves que a auditoria encontrou estavam em lógica pura, fácil de testar:
>
> - `resolveTier` em `src/hooks/useFeatureAccess.tsx` — classificava o plano Enterprise ("Super Company") como `premium`, tirando do cliente do plano mais caro as features que ele pagava.
> - `identifyPlan` e `parseAmount` em `supabase/functions/cakto-webhook/index.ts` — o primeiro liberava plano pago por substring ("**pro**duto" casava com o plano Pro); o segundo ainda tem a ambiguidade de centavos descrita no item 3.
>
> Configure Vitest neste projeto e escreva testes cobrindo:
>
> 1. **`resolveTier`** — um caso para cada um dos 10 `plan_id` do webhook, mais os casos de fallback por `plan_name` (incluindo "Super Company - Mensal" → `enterprise` e "PRO Empresarial" ≠ "Plus Empresarial"), mais assinatura expirada e tier developer.
> 2. **`identifyPlan`** — os 10 planos por `plan_id` e por `plan_name`; e os casos que devem **falhar**: nome de produto contendo "produto"/"promoção" não pode liberar o plano Pro.
> 3. **`parseMoney`** em `supabase/functions/ai-agent/index.ts` — rejeitar `"abc"`, `null`, `Infinity`, negativos e zero; aceitar `"1234,56"`.
>
> Adicione o script `test` no `package.json`. Não altere a lógica das funções — se um teste falhar, me mostre o caso antes de corrigir.

---

## 10. Revisar o `search_path` das funções e o linter do Supabase

> Verifiquei que as 45 funções `SECURITY DEFINER` do projeto têm `SET search_path` e que as 26 tabelas em `public` têm RLS com policy. Quero a confirmação pelo lado do Supabase:
>
> 1. Rode o database linter do Supabase e me mostre **todos** os avisos, inclusive os de nível info.
> 2. Confirme que a configuração de Auth em produção tem confirmação de e-mail habilitada — o `supabase/config.toml` local tem `enable_confirmations = false`, e quero garantir que isso não valha para produção.
> 3. Me diga se a proteção contra senha vazada (leaked password protection) está ativada.
