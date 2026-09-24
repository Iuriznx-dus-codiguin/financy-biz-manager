# Auditoria técnica — Financy

Data: setembro de 2026 · Escopo: frontend (`src/`), edge functions (`supabase/functions/`), migrações e configuração de build.

Este documento substitui `src/docs/SECURITY_ISSUES_CRITICAL.md`, `PLATFORM_ANALYSIS_REPORT.md` e `PERFORMANCE_OPTIMIZATIONS.md`, que descreviam problemas já resolvidos e otimizações que nunca chegaram a ser ligadas no código.

O que não pode ser resolvido editando o repositório está em [`PROMPT-LOVABLE.md`](PROMPT-LOVABLE.md).

> **Nota sobre remoções.** A primeira rodada desta auditoria removeu 18 módulos
> órfãos e 3 edge functions substituídas. Todos foram **restaurados** a pedido,
> para que nenhuma ferramenta da plataforma deixasse de existir. Os dois módulos
> que estavam quebrados (`security.ts` e `secureStorage.ts`) voltaram **com os
> defeitos corrigidos** em vez de apagados — ver item 21.

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

A preservação só vale quando a chave de idempotência veio de `transaction_id`, que é único por cobrança. Se ela caiu no fallback para `subscription_id` — igual em todas as renovações da mesma assinatura — o comportamento original de recalcular é mantido; do contrário, uma **renovação legítima** deixaria de estender o plano. A primeira versão desta auditoria não fazia essa distinção e teria quebrado as renovações.

### 5. `cakto-webhook` — plano pago liberado por substring

`identifyPlan` fazia `key.includes('pro')` e `/pro/.test(...)`. Qualquer produto cujo nome contivesse "pro" — **"produto"**, "promoção" — casava com o plano Pro e liberava acesso premium.

**Corrigido:** correspondência por palavra inteira sobre o identificador normalizado (`pro` só casa como token isolado, nunca dentro de "produto"), e o fallback heurístico também passou a exigir palavra inteira.

A periodicidade **continua** caindo em "mensal" quando o payload não informa — igual ao comportamento original, de propósito. Exigir periodicidade explícita devolveria 422 e o cliente ficaria **sem acesso após pagar**; conceder 30 dias é o modo de falha recuperável. Cada vez que isso acontece vai para o log.

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

### 9. `cakto-webhook` — valor da venda dividido por 100 ⚠️ PARCIAL

`parseAmount` usa a heurística `valor > 1000 ? valor / 100 : valor`. Um plano de R$ 1.200,00 informado em reais é registrado no caixa como **R$ 12,00**.

**Parcialmente corrigido.** Agora, quando o payload traz um campo que declara a unidade (`amount_cents` e variantes), a conversão é exata. Mas a heurística foi **mantida** como fallback, e isso é deliberado: não sei se a Cakto envia `amount` em reais ou em centavos. Se envia em centavos, trocar a heurística por leitura direta multiplicaria por 100 **toda** a receita registrada — bem pior que o bug atual.

A primeira versão desta auditoria removeu a heurística; a revisão reverteu, porque o risco da mudança é maior que o do defeito. Cada uso da heurística passou a gerar log com o valor bruto e o convertido.

**Pendente:** confirmar a unidade real do campo — é o item 3 de [`PROMPT-LOVABLE.md`](PROMPT-LOVABLE.md), que instrui a comparar `cakto_webhook_logs` com os preços dos planos.

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

Resultado medido (fechamento transitivo dos chunks por rota — antes, **toda** rota carregava o bundle único de 3.792 kB / 1.017 kB gzip):

| Rota | Depois | Redução (gzip) |
|---|---|---|
| Login | 937 kB / **292 kB gzip** | **−71%** |
| Categorias | 940 kB / **293 kB gzip** | **−71%** |
| Receitas / Despesas | 950 kB / **296 kB gzip** | **−71%** |
| Dashboard | 1.403 kB / **420 kB gzip** | **−59%** |

As rotas de Categorias, Receitas e Despesas só chegaram a esse número depois de corrigir também o item 21 (biblioteca de ícones) — sem ele ficavam ~130 kB gzip acima.

Tempo de build caiu de 8m08s para ~55s.

### 20. Uma dezena de consultas idênticas por render

Três hooks faziam as próprias consultas com `useState` + `useEffect`, sem compartilhar nada — e são consumidos por dezenas de componentes simultâneos. O `QueryClient` já estava configurado no projeto, mas nenhum deles o usava.

| Hook | Consultas por montagem | Consumidores |
|---|---|---|
| `useUserSubscription` | 2 (`subscribers`, `user_subscriptions`) | ~10 (layout, sidebar, banners, `useFeatureAccess`, `useIsAdmin`…) |
| `useSubscription` | 3 (+ `customer_subscriptions`) | 3 (`FloatingDashboardInfo`, `MobileSidebar`, `Configuracoes`) |
| `useIsAdmin` | 1 (`user_roles`) | 2 (`AdminGuard` + a própria página) |

Num único carregamento do dashboard isso passava de 25 requisições idênticas.

**Corrigido:** os três migrados para React Query com chave compartilhada por usuário — uma requisição de cada, com cache de 5 minutos. A API pública dos hooks não mudou.

### 21. Biblioteca de ícones inteira no bundle — e o ícone escolhido nunca aparecia

`Categorias.tsx` e `CategorySelector.tsx` faziam `import * as Icons from 'lucide-react'` e resolviam o ícone com `Icons[iconName]`. Dois problemas de uma vez:

- **O seletor de ícone não funcionava.** O lucide-react exporta em PascalCase (`BookOpen`), mas os nomes gravados são kebab-case (`book-open`). `Icons['book-open']` era `undefined`, então **toda categoria caía no fallback `Folder`** — o usuário escolhia um ícone e via sempre a mesma pasta.
- **O bundler não conseguia fazer tree-shaking.** Indexar um namespace com chave dinâmica obriga a incluir a biblioteca toda: ~1.500 ícones, **742 kB (132 kB gzip)** num chunk compartilhado pelas telas de Categorias, Receitas e Despesas.

**Corrigido:** registro explícito em `src/constants/categoryIcons.ts` com os 30 ícones que a aplicação realmente usa (verificado contra `iconOptions` e `constants/categories.ts`), mais `getCategoryIcon()` aceitando kebab-case e PascalCase. O seletor passa a funcionar e o chunk de 742 kB desaparece.

### 22. Placeholder de rota substituía toda a interface

Ao introduzir o carregamento sob demanda, o limite de `Suspense` ficou acima de `<Routes>`. Como o React sobe até o limite mais próximo, a primeira navegação para cada página trocava **a aplicação inteira** — sidebar, cabeçalho e rodapé — por um spinner.

**Corrigido:** o limite passou para dentro de `AuthenticatedLayout`, em volta do `<Outlet />`. Só a área de conteúdo mostra o placeholder.

### 23. Botão "Atualizar" não atualizava nada

`FloatingDashboardInfo` invocava a edge function `process-recurring-transactions`, que exige `CRON_SECRET_TOKEN` e portanto respondia 401 a toda chamada vinda do app. E como `functions.invoke` devolve `{ error }` em vez de lançar, o `try/catch` em volta nunca disparava: o botão exibia "Dados atualizados!" sem ter processado transação recorrente nenhuma.

**Corrigido:** passou a usar `useRecurringTransactions().runNow()`, a mesma RPC que o `AppContext` já chama na montagem.

---

## Limpeza

### 24. 2,5 mil linhas de código órfão (restaurado, com correções)

18 módulos sem nenhuma referência no projeto, entre eles `AIAgentChat.tsx` (302 linhas, duplicata de `FinancyAIChat`), `RelatoriosAvancados.tsx` (357), `PhoneCollectionStep.tsx` (245) e `SubscriptionStatus.tsx` (194).

Dois deles merecem destaque porque pareciam ser infraestrutura de segurança:

- **`src/utils/security.ts`** — funções de sanitização que ninguém chamava. `isValidTextInput` rejeitava caracteres acentuados, então teria quebrado qualquer descrição em português ("Alimentação") se tivesse sido ligada.
- **`src/utils/secureStorage.ts`** — escapava HTML no valor *antes* de gravar e devolvia o valor escapado sem reverter, corrompendo qualquer dado com `/`, `<` ou `"` (inclusive tokens). Também usava `process.env` em código de navegador, o que lança `ReferenceError` num bundle Vite.

**Removidos.** São o caso clássico de "segurança de fachada": arquivos que parecem endurecimento mas nunca foram conectados — e que, se conectados, quebrariam a aplicação.

### 25. Três edge functions obsoletas

`ai-financial-agent`, `ai-support-agent` e `ai-tax-agent` não eram invocadas por lugar nenhum — foram substituídas por `ai-agent` e `support-agent`, que usam o gateway da Lovable. As três ainda usavam `OPENAI_API_KEY` (outro provedor), aceitavam chamadas de qualquer usuário autenticado e operavam com service role no banco. Superfície de ataque e custo de API sem contrapartida de produto.

**Mantidas** (foram removidas e depois restauradas, já com o CORS por allowlist). Se um dia decidir tirá-las do ar, lembre que apagar o código **não** as remove do Supabase — é preciso rodar também `supabase functions delete <nome>` para cada uma. O item 2 de [`PROMPT-LOVABLE.md`](PROMPT-LOVABLE.md) levanta a lista do que está deployado antes de qualquer remoção.

Duas outras functions sem chamador no frontend foram **mantidas** por serem endpoints potencialmente usados fora do app: `get-main-dashboard` e `validate-developer-key`. Vale notar que a interface que chamava a segunda (`DeveloperAccessDialog.tsx`) já estava órfã — o resgate de chave de desenvolvedor não tinha mais entrada na UI antes desta auditoria.

### 26. Três lockfiles simultâneos — NÃO alterado

`bun.lock`, `bun.lockb` e `package-lock.json` versionados ao mesmo tempo, com `package-lock.json` listado no `.gitignore` mas rastreado.

**Revertido — os três continuam versionados.** A auditoria tinha removido o `package-lock.json` do índice, e isso **mudou o resultado do check de segurança do Snyk no PR**: o Snyk lê `package-lock.json` para projetos npm e não entende `bun.lock`, então ficou sem lockfile para resolver a árvore de dependências. O `npm install` da esteira também depende dele.

Redundância de lockfile é desarrumação; lockfile faltando é quebra de ferramenta. O `.gitignore` foi ajustado para refletir o estado real (os três versionados) em vez de listar um arquivo que está rastreado. Consolidar num único lockfile exige antes confirmar o que a CI e o Snyk estão configurados para ler.

### 27. Lint ignorado na prática

O ESLint rodava sobre `supabase/functions/**` (Deno, com globais e imports por URL próprios) usando a config de navegador, gerando ~110 erros inacionáveis que afogavam os avisos reais de `src`. E `@typescript-eslint/no-unused-vars` estava `"off"`, o que permitiu o acúmulo dos módulos órfãos acima.

**Corrigido:** edge functions excluídas do lint do frontend (use `deno lint`); regra reativada como `warn`.

### 28. `index.html` malformado

Sem `</head>`, `<body>` aninhado dentro do `<head>`, `og:title` e `og:description` ausentes e `description` igual a "Financy Ltda".

**Corrigido:** HTML válido e metadados sociais completos.

---

### 29. Componentes e dependências instalados sem uso

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
