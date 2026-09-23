# Auditoria técnica — Financy

Data: setembro de 2026 · Escopo: frontend (`src/`), edge functions (`supabase/functions/`), migrações e configuração de build.

Este documento substitui `src/docs/SECURITY_ISSUES_CRITICAL.md`, `PLATFORM_ANALYSIS_REPORT.md` e `PERFORMANCE_OPTIMIZATIONS.md`, que descreviam problemas já resolvidos e otimizações que nunca chegaram a ser ligadas no código.

---

## O que estava bom

A camada de banco é a parte mais sólida da plataforma e **não precisou de alterações**:

- 26 tabelas em `public`, **todas** com RLS habilitada e ao menos uma policy.
- 45 funções `SECURITY DEFINER`, **todas** com `SET search_path` — nenhuma exposta a sequestro de `search_path`.
- `user_roles` só tem policy de `SELECT` para o próprio usuário. Não há como um usuário se promover a admin pelo cliente.
- As policies permissivas antigas (`USING (true)` em `subscribers` e `customer_subscriptions`) já haviam sido corrigidas pela migração `20250815140025`.

Os problemas concentram-se nas **edge functions** e no **frontend**.

---

## Severidade alta

### 1. `daily-transaction-reminder` — rotina de cron sem autenticação

A function roda com `SUPABASE_SERVICE_ROLE_KEY` (ignora RLS), lê `profiles` de **todos** os usuários (nome, e-mail, telefone) e envia a lista para o n8n. Não havia nenhuma checagem de autorização, e a entrada não existia no `config.toml` — então valia o `verify_jwt = true` padrão, que só exige *um JWT válido qualquer*. **Qualquer usuário logado da plataforma** podia disparar a rotina: exfiltração da base de cadastro para o endpoint n8n e disparo em massa de mensagens.

**Corrigido:** exige `CRON_SECRET_TOKEN` comparado em tempo constante; entrada declarada no `config.toml`.

### 2. `schedule-user-webhooks` — IDOR

Mesmo padrão: service role, sem autenticação, e o `userId` vindo do corpo da requisição sem validação de posse. Qualquer usuário autenticado podia passar o UUID de outra conta e provocar o envio dos dados pessoais dela para o n8n.

**Corrigido:** valida `userId` como UUID e exige que o chamador seja interno (service role) ou o próprio dono da conta.

### 3. `novo-usuario-webhook` — endpoint público + a function estava quebrada

`verify_jwt = false` e nenhuma checagem interna: endpoint totalmente aberto. Além disso, usava a chave **anon** para ler `profiles` — barrada pela RLS. Ou seja, a mensagem de boas-vindas provavelmente **nunca funcionou em produção**, falhando em silêncio.

**Corrigido:** passa a usar service role para a leitura, exige chamada interna ou do próprio usuário, e deixou de logar o corpo cru da requisição (que continha PII).

### 4. `cakto-webhook` — replay concede assinatura vitalícia

A autenticação por HMAC estava correta, mas não havia proteção contra *replay*: sem timestamp nem nonce, um POST autêntico capturado podia ser reenviado indefinidamente. A idempotência existente só evitava duplicar a receita — `expires_at` era recalculado a partir de `now` a cada reenvio, **renovando o plano de graça**.

**Corrigido:** em retentativa do mesmo `transaction_id`, o vencimento atual é preservado.

### 5. `cakto-webhook` — plano pago liberado por substring

`identifyPlan` fazia `key.includes('pro')` e `/pro/.test(...)`. Qualquer produto cujo nome contivesse "pro" — **"produto"**, "promoção" — casava com o plano Pro e liberava acesso premium.

**Corrigido:** correspondência por palavra inteira sobre o identificador normalizado; o fallback heurístico agora exige tier **e** periodicidade explícitos, em vez de assumir "mensal".

### 6. CORS aberto em 8 de 14 functions

Oito functions declaravam `Access-Control-Allow-Origin: '*'` enquanto o `_shared/utils.ts` já tinha uma allowlist pronta — deriva clássica de desenvolvimento prompt a prompt. Com `*`, qualquer site aberto pelo usuário logado consegue ler as respostas, que incluem dados financeiros.

**Corrigido:** `getCorsHeaders(req)` centralizado; nenhuma function usa `*`.

---

## Severidade média

### 7. `ai-agent` — `dashboardId` sem validação de posse

O `dashboardId` vem do corpo da requisição e é gravado nas transações por um client com service role. As leituras filtravam por `user_id` (protegidas), mas as **escritas** aceitavam o id de um dashboard de outra conta.

**Corrigido:** `userOwnsDashboard()` valida antes de qualquer operação, com *fail closed* em caso de erro.

### 8. `ai-agent` — valores monetários sem validação

`args.valor` vinha direto do modelo de IA (ou do cliente, pela rota `action`) e ia para `.toFixed(2)` sem checagem: `"abc"`, `null` ou `Infinity` estouravam a função; negativos entravam no banco.

**Corrigido:** `parseMoney()` normaliza e rejeita valores não finitos, negativos ou absurdos. Também há teto de tamanho para o histórico de mensagens, que é reenviado inteiro ao gateway de IA a cada turno e é cobrado por token.

### 9. `cakto-webhook` — valor da venda dividido por 100

`parseAmount` usava a heurística `valor > 1000 ? valor / 100 : valor`. Um plano de R$ 1.200,00 era registrado no caixa como **R$ 12,00**.

**Corrigido:** a unidade passou a ser explícita — só trata como centavos quando o payload declara o campo em centavos.

### 10. `cakto-webhook` — curingas de LIKE no e-mail

`.ilike('email', email)` com valor do payload: `_` e `%` são curingas. `joao_silva@x.com` casava com `joaoXsilva@x.com`; `%@%` casaria com qualquer perfil.

**Corrigido:** curingas escapados antes da consulta.

### 11. `cakto-webhook` — cancelamento em massa

Em `processSubscriptionStop`, se o perfil não fosse encontrado e `subscriptionId` viesse vazio, o `UPDATE` saía sem cláusula identificadora útil.

**Corrigido:** sem identificador utilizável, o evento é ignorado e registrado.

### 12. Assinante Enterprise recebia features de Premium

`resolveTier` classificava o plano pelo **nome**. O plano Enterprise chama-se **"Super Company"** — não contém a palavra "enterprise", então caía no fallback `subscription_type === 'business'` → `premium`. O cliente do plano mais caro **perdia** `ia_pixel`, `economia_impostos`, `gestao_multi_empresa` e `suporte_dedicado`. Pelo mesmo motivo, "PRO Empresarial" e "Plus Empresarial" casavam ambos em `'empresarial'` antes de `'pro'`, e o assinante Pro recebia exatamente o mesmo que o Plus.

**Corrigido:** classificação por `plan_id` (identificador estável gravado pelo webhook), com o nome apenas como fallback para assinaturas antigas.

### 13. Injeção no filtro PostgREST

`useSubscription` montava `.or(\`user_id.eq.${user.id},email.eq.${user.email}\`)` interpolando o e-mail cru. Vírgula e parêntese são válidos em e-mail e reescrevem a condição.

**Corrigido:** filtro por `user_id` com `.eq()`.

### 14. Fluxo de autenticação implícito

O cliente Supabase usava o fluxo padrão (implícito), que devolve o token no fragmento da URL (`#access_token=...`) — onde ele acaba em histórico do navegador, extensões e logs de referrer.

**Corrigido:** `flowType: 'pkce'`.

### 15. `process-recurring-transactions` — comparação de segredo não constante

Validava o token de cron com `authHeader !== expectedToken`. A comparação curto-circuita no primeiro byte diferente e vaza, pelo tempo de resposta, quantos caracteres o atacante acertou — mesmo o repositório já tendo `constantTimeCompare` pronto.

**Corrigido:** passou a usar `isAuthorizedCron()`.

### 16. Mensagens de erro internas expostas

`get-main-dashboard`, `daily-transaction-reminder`, `novo-usuario-webhook` e `process-scheduled-webhooks` devolviam `error.message` cru ao cliente, revelando nomes de RPC, colunas e variáveis de ambiente ausentes.

**Corrigido:** detalhe fica no log, cliente recebe mensagem genérica.

### 17. `.env` versionado no repositório

Constava no `.gitignore` mas seguia rastreado — entrou antes da regra existir. Contém apenas a chave anon (pública por natureza), mas o padrão é perigoso: a primeira variável realmente secreta adicionada ao arquivo iria direto para o GitHub.

**Corrigido:** removido do índice com `git rm --cached`; `.gitignore` reforçado.

### 18. URLs internas de n8n hardcoded

Três endpoints n8n estavam escritos no código-fonte de um repositório público.

**Corrigido:** movidos para variáveis de ambiente, documentadas em `.env.example`.

---

## Performance

### 19. Bundle único de 3,79 MB

O build gerava **um único chunk JS de 3,79 MB (1,02 MB gzip)**. Todas as 17 páginas eram importadas estaticamente em `App.tsx`, então quem abria a tela de login baixava junto Relatórios, `exceljs`, `jspdf`, `html2canvas`, `recharts` e `framer-motion` antes do primeiro render.

**Corrigido** em três frentes:

1. `React.lazy` por rota em `App.tsx`.
2. `exceljs` e `jspdf` carregados por `import()` dinâmico no ponto de uso. O `exceljs` entrava no grafo estático por um caminho nada óbvio — `AuthenticatedLayout` → `OnboardingFlow` → `ExpenseSheetStep` → `parseNumber`, uma função pura que só estava no mesmo arquivo que o código de planilha.
3. `manualChunks` restrito a react e supabase. Listar `recharts`/`exceljs`/`jspdf` ali **criava uma aresta de import estático a partir do chunk de entrada** e anulava o lazy loading — a primeira tentativa desta auditoria caiu exatamente nessa armadilha, e só a medição do grafo de chunks revelou.

Resultado medido (fechamento transitivo dos chunks por rota):

| Rota | Antes | Depois | Redução (gzip) |
|---|---|---|---|
| Login | 3.792 kB / 1.017 kB gzip | 937 kB / **292 kB gzip** | **−71%** |
| Dashboard | 3.792 kB / 1.017 kB gzip | 1.404 kB / **420 kB gzip** | **−59%** |

Tempo de build também caiu de 8m08s para ~1m30s.

### 20. Uma dezena de consultas idênticas por render

`useUserSubscription` usava `useState` + `useEffect` e é consumido por ~10 componentes (layout, sidebar, banners, `useFeatureAccess`, `useIsAdmin`…). Cada instância disparava as próprias consultas a `subscribers` e `user_subscriptions` a cada montagem. O `QueryClient` já estava configurado no projeto, mas não era usado aqui.

**Corrigido:** migrado para React Query com chave compartilhada — uma requisição por usuário, com cache.

---

## Limpeza

### 21. 2,5 mil linhas de código morto

18 módulos sem nenhuma referência no projeto, entre eles `AIAgentChat.tsx` (302 linhas, duplicata de `FinancyAIChat`), `RelatoriosAvancados.tsx` (357), `PhoneCollectionStep.tsx` (245) e `SubscriptionStatus.tsx` (194).

Dois deles merecem destaque porque pareciam ser infraestrutura de segurança:

- **`src/utils/security.ts`** — funções de sanitização que ninguém chamava. `isValidTextInput` rejeitava caracteres acentuados, então teria quebrado qualquer descrição em português ("Alimentação") se tivesse sido ligada.
- **`src/utils/secureStorage.ts`** — escapava HTML no valor *antes* de gravar e devolvia o valor escapado sem reverter, corrompendo qualquer dado com `/`, `<` ou `"` (inclusive tokens). Também usava `process.env` em código de navegador, o que lança `ReferenceError` num bundle Vite.

**Removidos.** São o caso clássico de "segurança de fachada": arquivos que parecem endurecimento mas nunca foram conectados — e que, se conectados, quebrariam a aplicação.

### 22. Três edge functions obsoletas ainda no ar

`ai-financial-agent`, `ai-support-agent` e `ai-tax-agent` não eram invocadas por lugar nenhum — foram substituídas por `ai-agent` e `support-agent`, que usam o gateway da Lovable. As três ainda usavam `OPENAI_API_KEY` (outro provedor), aceitavam chamadas de qualquer usuário autenticado e operavam com service role no banco. Superfície de ataque e custo de API sem contrapartida de produto.

**Removidas do repositório.** Atenção: remover o código **não** as tira do ar — é preciso rodar também:

```bash
supabase functions delete ai-financial-agent
supabase functions delete ai-support-agent
supabase functions delete ai-tax-agent
```

Duas outras functions sem chamador no frontend foram **mantidas** por serem endpoints potencialmente usados fora do app: `get-main-dashboard` e `validate-developer-key`. Vale notar que a interface que chamava a segunda (`DeveloperAccessDialog.tsx`) já estava órfã — o resgate de chave de desenvolvedor não tinha mais entrada na UI antes desta auditoria.

### 23. Três lockfiles simultâneos

`bun.lock`, `bun.lockb` e `package-lock.json` versionados ao mesmo tempo, com `package-lock.json` listado no `.gitignore` mas rastreado.

**Corrigido:** mantido apenas `bun.lock`.

### 24. Lint ignorado na prática

O ESLint rodava sobre `supabase/functions/**` (Deno, com globais e imports por URL próprios) usando a config de navegador, gerando ~110 erros inacionáveis que afogavam os avisos reais de `src`. E `@typescript-eslint/no-unused-vars` estava `"off"`, o que permitiu o acúmulo dos módulos órfãos acima.

**Corrigido:** edge functions excluídas do lint do frontend (use `deno lint`); regra reativada como `warn`.

### 25. `index.html` malformado

Sem `</head>`, `<body>` aninhado dentro do `<head>`, `og:title` e `og:description` ausentes e `description` igual a "Financy Ltda".

**Corrigido:** HTML válido e metadados sociais completos.

---

### 26. Componentes e dependências instalados sem uso

22 componentes de `src/components/ui/` não têm nenhum import no projeto (`calendar`, `carousel`, `chart`, `command`, `form`, `popover`, `slider`, `radio-group`, entre outros). **Não foram removidos**: são scaffolding do shadcn/ui, o Vite já os elimina do bundle por tree-shaking e podem ser regerados a qualquer momento. Ficam registrados porque cada um carrega uma dependência Radix no `package.json`.

Mais relevante: **`zod` e `@hookform/resolvers` estão instalados e não são usados em lugar nenhum**. Uma plataforma financeira sem nenhum schema de validação de entrada, tendo a biblioteca à disposição — é o mesmo padrão do `security.ts` do item 21: a ferramenta foi adicionada, mas nunca conectada.

---

## Recomendações não aplicadas

Ficaram de fora porque exigem decisão de produto ou mudam comportamento de forma que precisa de validação em staging:

1. **`AppContext` carrega o histórico inteiro.** `carregarDados()` faz `select('*')` em `receitas` e `despesas` **sem filtro de data e sem limite**, trazendo todas as transações do usuário para a memória a cada troca de dashboard. Funciona hoje e vai degradar de forma previsível conforme a base cresce. A correção é paginar ou filtrar pelo período visível — mas as telas filtram no cliente hoje, então mexer nisso exige revisar cada seção.

2. **Três tabelas de assinatura.** `subscribers`, `user_subscriptions` e `customer_subscriptions` coexistem, com `useSubscription` e `useUserSubscription` lendo combinações diferentes das três. Vale consolidar numa fonte única.

3. **`useIsAdmin` equipara tier `developer` a admin.** Quem resgata uma chave de desenvolvedor ganha acesso às áreas administrativas. Se a intenção era só liberar features, os dois conceitos deveriam ser separados.

4. **`checkRateLimit` falha aberto.** Se o RPC de rate limit falhar, a requisição passa. É uma troca deliberada (disponibilidade > custo) e foi mantida — mas é uma decisão que merece estar consciente.

5. **`react-hooks/exhaustive-deps`:** 17 avisos em `src`, quase todos do padrão "função de fetch não memoizada omitida das dependências". Não são bugs hoje, mas cada um é uma armadilha para quem mexer no arquivo depois.

6. **`strict: false` no TypeScript.** `strictNullChecks` e `noImplicitAny` desligados em toda a base. Ligar de uma vez produziria centenas de erros; o caminho viável é ativar por diretório.

7. **Nenhum teste automatizado.** Não há suíte de testes no projeto. As regras de entitlement (`resolveTier`) e o parser do webhook da Cakto (`identifyPlan`, `parseAmount`) são os melhores candidatos a começar: são lógica pura, de alto impacto financeiro, e foi exatamente onde os bugs apareceram.
