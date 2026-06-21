## Plano de correções e melhorias

### 1. Tela de carregamento (`LoadingScreen.tsx`)
**Diagnóstico**: Hoje ela renderiza por cima do `AuthenticatedLayout`, mas o próprio layout já mostra um spinner enquanto `authLoading || onboardingLoading || subscriptionLoading` é `true`. Quando esses estados terminam, o `LoadingScreen` também é avaliado como pronto imediatamente — ou seja, ele só adiciona uma piscada visual de ~450ms sem nenhum ganho real, e ainda é a causa do "carregamento quebrado" relatado (estado intermediário sem progresso).

**Ação**: remover o `LoadingScreen` do fluxo autenticado. Deletar o uso em `AuthenticatedLayout.tsx` (estado `showLoading`, import e render). O arquivo `LoadingScreen.tsx` é mantido (caso seja reutilizado em outro contexto) mas deixa de ser montado. O spinner já existente no layout cobre o caso de carregamento real.

### 2. Botão flutuante do WhatsApp
- Remover `<FloatingWhatsAppButton />` de `AuthenticatedLayout.tsx`.
- Remover do tour os passos que apontam para `whatsapp-button` (`g-whatsapp` em desktop e `gm-whatsapp` em mobile) em `src/config/tourSteps.ts`.
- O componente `FloatingWhatsAppButton.tsx` permanece no projeto, apenas desmontado (reativação trivial no futuro).

### 3. Bug do alternador de tema (1º clique não funciona)
**Causa**: tema inicial é `'system'`. O toggle faz `theme === 'dark' ? 'light' : 'dark'`. Quando o sistema já está em dark mas o estado é `'system'`, a comparação retorna `false` e o toggle define `'dark'` — visualmente nada muda e o usuário precisa clicar de novo. Além disso, `useSettings` chama `setTheme` ao sincronizar settings do servidor, podendo reverter o clique do usuário.

**Ações** em `src/hooks/useTheme.tsx`:
- Resolver o tema "efetivo" considerando `prefers-color-scheme` quando for `'system'` e usar esse valor para a comparação do toggle, expondo `resolvedTheme`.
- Em `AppSidebar`/`MobileSidebar`/`Configuracoes`, trocar o toggle para basear-se em `resolvedTheme` (ou em `theme === 'light' ? 'dark' : 'light'` — invertendo a lógica) para que o primeiro clique sempre alterne corretamente.
- Em `useSettings.tsx`, não sobrescrever o tema do usuário se o tema atual já estiver definido em localStorage (ou só sincronizar a primeira vez); evita o "reverter" após clique.

### 4. Onboarding — selects travados, persistência e confetes

**4.1 Selects travados nas etapas 5 e 6**
Os componentes Radix `Select` aparecem dentro do `OptionalStepWrapper` que vive num `motion.div` controlado por `AnimatePresence`. O `transform` do framer-motion + o `overflow-hidden` do `Card` cortam/quebram o portal do Radix em alguns navegadores.
**Ações**:
- Trocar `overflow-hidden` por `overflow-visible` no `Card` que envolve o `<AnimatePresence>` em `OnboardingFlow.tsx`.
- Forçar `z-50` no `SelectContent` (já é padrão do shadcn, validar `cn` na variante usada).
- Verificar que nenhum elemento ancestral tem `pointer-events-none` herdado durante a animação (a animação de `exit` aplica `pointer-events:none` enquanto o nó está sendo desmontado — adicionar `style={{ pointerEvents: 'auto' }}` ao `motion.div` ativo).

**4.2 Persistir progresso ao sair/voltar**
Hoje todo o estado do `OnboardingFlow` está em memória; ao fechar a aba o usuário recomeça.
**Ação**: persistir `data` e `step` em `localStorage` (`financy-onboarding-draft`) a cada mudança, com `useEffect`. Ao montar, hidratar de volta. Limpar a chave após `onComplete` bem-sucedido. Versão simples, totalmente client-side, retrocompatível.

**4.3 Bug dos confetes**
Hoje a ordem é: `await onComplete(...)` → `triggerConfetti()` → toast. Como `onComplete` muda o estado global e o `AuthenticatedLayout` re-renderiza/redireciona quase ao mesmo tempo, os confetes começam, a tela troca, e eles voltam a aparecer no dashboard com volume reduzido.
**Ação**:
- Em `OnboardingFlow`, remover a chamada direta de `triggerConfetti()` na finalização.
- Gravar um flag em `sessionStorage` (`financy-onboarding-celebrate=1`) **antes** de chamar `onComplete`.
- Criar um pequeno hook/efeito em `AuthenticatedLayout` (ou `DashboardPage`) que, ao montar com esse flag, espera ~150ms (após a primeira pintura) e dispara um confete equilibrado em duas rajadas laterais (`origin: { x: 0.1 }` e `origin: { x: 0.9 }`), depois remove o flag. Resultado: a página atualiza primeiro, **depois** os confetes aparecem suavemente, sem perder volume.

### 5. Aprimorar dashboards secundários (multi-conta)

**Objetivo**: deixar a criação e gerência claros para os 3 casos típicos — família com várias contas em um plano, empresário com vários setores (transporte, vendas…) e empresário que mistura pessoal/empresarial.

**5.1 `DashboardCreateDialog.tsx`**
- Adicionar campo **"Finalidade"** (chips selecionáveis, opcional) com presets adaptativos:
  - Modo pessoal: `Eu`, `Família`, `Filho(a)`, `Casa`, `Viagens`, `Outro`.
  - Modo empresarial: `Setor de Vendas`, `Setor de Transporte`, `Marketing`, `Operacional`, `Filial`, `Pessoal do sócio`, `Outro`.
- Pré-preencher o `name` sugerido com base na finalidade escolhida (ainda editável).
- Substituir `window.location.replace(...)` por `setCurrentDashboard(novo)` + `navigate('/dashboard')` (sem reload), para não perder estado.
- Após criar: toast com CTA "Personalizar" abrindo `DashboardPersonalization` para o novo dashboard.
- Corrigir o `upsert` em `onboarding_data` que está limpando dados do dashboard principal: trocar para um `insert` em uma tabela dedicada ao dashboard ou usar `onConflict: 'user_id'` apenas se for o primeiro dashboard. **Decisão**: armazenar nome/finalidade no próprio `user_dashboards` (já tem `name`; aproveitar coluna existente — sem migração) e não tocar em `onboarding_data` na criação de dashboards secundários.

**5.2 `useDashboard.tsx`**
- Garantir que ao criar um dashboard ele já vire o atual (já faz) e expor um helper `switchDashboard(id)` que também navega ao `/dashboard`.

**5.3 Tour — destacar o seletor de dashboards**
- Adicionar `data-tutorial="dashboard-selector"` no botão do `CompactDashboardSelector` (e no equivalente mobile, se houver).
- Inserir um novo passo no tour geral (desktop e mobile) explicando: "Aqui você troca entre seus perfis/empresas e cria novos — útil para separar finanças de família, setores do negócio ou misturar pessoal e empresarial."
- Atualizar `getTourSteps`/`applyContext` para mostrar esse passo apenas quando o plano permite múltiplos dashboards (`hasMultiDashboard`), caso contrário substituir por uma versão com badge `Upgrade`.

### Detalhes técnicos resumidos

- **Arquivos editados**:
  - `src/components/layouts/AuthenticatedLayout.tsx` (remove LoadingScreen + FloatingWhatsAppButton, monta efeito de confete pós-onboarding).
  - `src/hooks/useTheme.tsx` (expor `resolvedTheme`, considerar `prefers-color-scheme`).
  - `src/hooks/useSettings.tsx` (não sobrescrever tema definido manualmente).
  - `src/components/AppSidebar.tsx`, `src/components/MobileSidebar.tsx`, `src/components/sections/Configuracoes.tsx` (toggle baseado em `resolvedTheme`).
  - `src/components/onboarding/OnboardingFlow.tsx` (overflow do Card, pointer-events no motion ativo, persistência em localStorage, remover confete direto, setar flag).
  - `src/config/tourSteps.ts` (remover passos do WhatsApp, adicionar passos do seletor de dashboard).
  - `src/components/DashboardCreateDialog.tsx` (chips de finalidade, remover reload, navegação suave).
  - `src/components/CompactDashboardSelector.tsx` (atributo `data-tutorial`).
  - `src/hooks/useDashboard.tsx` (helper `switchDashboard`, opcional).

- **Sem mudanças de banco** (a melhoria do dashboard secundário usa colunas/tabelas já existentes).
- **Retrocompatível**: usuários atuais não perdem dados; o draft de onboarding só afeta quem ainda não terminou; a remoção do LoadingScreen e do botão de WhatsApp é puramente visual.

### Validação pós-implementação
1. Login limpo: confirma que não há mais piscada do LoadingScreen e o spinner do layout aparece apenas se realmente houver carregamento.
2. Toggle de tema: do estado inicial `system`, o primeiro clique alterna visivelmente entre claro/escuro.
3. Onboarding etapas 4-6: abrir cada `Select` (categoria, forma de pagamento, prazo) e confirmar que abrem e fecham normalmente; sair da aba e voltar deve restaurar o passo e os campos preenchidos.
4. Finalizar onboarding: a tela troca para o dashboard, e logo depois os confetes caem suavemente em duas rajadas laterais.
5. Criar dashboard secundário (perfil e empresa) via seletor: a finalidade aparece nos chips, o novo dashboard fica ativo sem reload, e o tour, ao ser reexibido, destaca o seletor explicando sua função.
