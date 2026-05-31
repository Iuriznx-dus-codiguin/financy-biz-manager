# Plano: Onboarding Redesign + Product Tour Unificado

## Fase 1 — Novo Onboarding (4 etapas)

Substituir `OnboardingFlow.tsx` (9 steps) por fluxo enxuto de 4 etapas, preservando toda lógica de telefone (`validateAndNormalizePhone`, `checkPhoneDuplicate`, `savePhoneCorrection`, `BrazilianPhoneInput`).

**Novos componentes em `src/components/onboarding/steps/`:**

- `WelcomeAccountStep.tsx` — Boas-vindas + 2 cards (Pessoal/Empresarial), validação obrigatória.
- `IdentityStep.tsx` — Nome preferido (obrigatório), nome da empresa (condicional empresarial), WhatsApp (opcional com badge). Preview animado "Olá, [Nome]!".
- `FinancialContextStep.tsx` — Faixa de renda (pessoal) ou faturamento (empresarial) com opção "Prefiro não informar" (valor `prefer_not_say`).
- `TermsCompleteStep.tsx` — Termos + checkbox + CTA "Começar a usar".

`**OnboardingFlow.tsx` (reescrito):**

- Barra de progresso linear: "Etapa X de 4 — NN%" (substitui os 9 pontos).
- `AnimatePresence` com transição `x: 30 → 0` / `0 → -30`.
- `onComplete(data)` mantém shape esperado: `gastos_iniciais: []`, `how_did_you_know: ''`.
- Após `onComplete`: dispara `confetti()` + toast, marca flag `startTour('general')` no localStorage e navega para `/dashboard` (o `AuthenticatedLayout` detecta a flag e abre o tour).

**Migração SQL:**

```sql
ALTER TABLE onboarding_data 
  ALTER COLUMN how_did_you_know DROP NOT NULL;
```

(Verificar se `gastos_iniciais` existe na tabela; caso não exista, ignorar.)

---

## Fase 2 — Sistema unificado de Product Tour

Substitui `useSectionTutorials`, `useInteractiveTutorial`, `useSectionTutorialTrigger`, `SectionTutorial.tsx`, `InteractiveTutorial.tsx`.

### Arquivos novos

`**src/config/tourSteps.ts**` — Define todos os tours:

- `general` (5 steps macro)
- `dashboard`, `receitas`, `despesas`, `metas`, `relatorios`, `agentes-ia` (todos os perfis)
- `impostos`, `equipe`, `fechamento` (empresarial)

Cada step: `{ id, target: string | null, title, content, position: 'top'|'bottom'|'left'|'right'|'center', badge?: string }`.

`**src/hooks/useProductTour.tsx**` — Context provider com:

- Estado: `isActive`, `currentTourId`, `currentStep`, `progress`.
- Métodos: `startTour(tourId)`, `next()`, `prev()`, `skip()`, `complete()`, `hasTourBeenSeen(tourId)`.
- Persistência: usa tabela `section_tutorials` existente (campo `section_name` = tourId, `skipped`/`viewed_at`). Sem nova tabela.
- Keyboard: `Escape`/`ArrowLeft`/`ArrowRight`.

`**src/components/onboarding/TourOverlay.tsx**` — Renderiza via `createPortal`:

- Overlay `rgba(0,0,0,0.55)` + `backdrop-blur:2px` com recorte spotlight via `box-shadow` inset calculado por `getBoundingClientRect()`.
- Tooltip com posição calculada (com fallback para posição oposta / center se não couber).
- `scrollIntoView({ behavior: 'smooth', block: 'center' })` quando target fora da viewport.
- Mobile (<768px): tooltip vira bottom-sheet ocupando metade inferior.
- Controles: "X de Y" + barra de progresso + "Pular | Anterior | Próximo/Concluir".

`**src/components/onboarding/SectionTourBadge.tsx**` — Badge `[? Guia rápido]` (variant outline, ícone `HelpCircle`) que chama `startTour(tourId)`.

`**src/components/onboarding/ProductTour.tsx**` — Wrapper montado uma vez no layout; observa o hook e renderiza `TourOverlay` quando ativo.

### Integrações

- `AuthenticatedLayout.tsx`: envolver com `ProductTourProvider`, montar `<ProductTour />`. No `useEffect` pós-onboarding, se flag `start_general_tour` no localStorage, chamar `startTour('general')` e limpar flag.
- Cada Page (Dashboard, Receitas, Despesas, Metas, Relatórios, AgentesIA, Impostos, Equipe, Fechamento): `useEffect` que dispara `startTour(tourId)` com delay 800ms se `!hasTourBeenSeen(tourId)`. Renderizar `<SectionTourBadge tourId="..." />` no header da seção.
- Adicionar atributos `data-tutorial="..."` nos elementos target faltantes (manter os já existentes).

### Limpeza

Deletar:

- `src/hooks/useSectionTutorials.tsx`
- `src/hooks/useSectionTutorialTrigger.tsx`
- `src/hooks/useInteractiveTutorial.tsx`
- `src/components/tutorials/SectionTutorial.tsx`
- `src/components/tutorials/InteractiveTutorial.tsx`
- `src/config/tutorialSteps.ts` (após migração validada)

Remover referências em `AppProviders.tsx`, `Ajuda.tsx` (botão "rever tutorial" passa a usar `useProductTour().startTour`), e qualquer outro consumidor — substituir por API do `useProductTour`.

---

## Detalhes técnicos relevantes

- **Sem `position: fixed**` no tooltip: usar Portal no `document.body` com `position: absolute` ancorado em coordenadas calculadas.
- **Não bloquear interação**: overlay clicável apenas no botão fechar; clique no spotlight passa para o elemento real (pointer-events: none na área do recorte via mask).
- **Persistência**: `section_tutorials` upsert por `(user_id, section_name)`; tour 'general' tratado como section_name='general'.
- **Compatibilidade**: manter `getTutorialSteps` exportado durante a migração; só remover após validação.

## Ordem de execução

1. Migração SQL (`onboarding_data`).
2. Criar `tourSteps.ts`, `useProductTour`, `TourOverlay`, `SectionTourBadge`, `ProductTour`.
3. Montar provider no `AuthenticatedLayout` + triggers nas Pages.
4. Reescrever `OnboardingFlow.tsx` com 4 novos steps.
5. Atualizar `Ajuda.tsx` para usar nova API.
6. Remover arquivos legados.