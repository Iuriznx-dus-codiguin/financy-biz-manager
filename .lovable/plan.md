

# Finalizar correções de médio impacto pendentes

## Contexto
A correção de layout do Agente de IA já está aplicada e funcional. Restam duas tarefas que foram criadas mas não executadas no turno anterior.

## Escopo

### 1. Migrar cores hardcoded para design tokens (Dark Mode consistente)

Substituir cores estáticas Tailwind por tokens semânticos do `index.css`/`tailwind.config.ts` em **26 arquivos** com 438 ocorrências.

**Mapeamento padrão:**
- `text-green-600` → `text-success` (financeiro positivo: receitas, lucro, saldo positivo)
- `text-red-600` → `text-destructive` (financeiro negativo: despesas, saldo negativo)
- `text-orange-600` → `text-warning` (avisos)
- `text-blue-600` → `text-primary` (informativo)
- `bg-green-50 dark:bg-green-900/20` → `bg-success/10`
- `bg-red-50 dark:bg-red-900/20` → `bg-destructive/10`
- `bg-orange-50 dark:bg-orange-900/20` → `bg-warning/10`
- `bg-blue-50 dark:bg-blue-900/20` → `bg-primary/10`
- `border-green-200` → `border-success/30`, etc.

**Pré-requisito:** adicionar tokens `--success` e `--warning` ao `src/index.css` (light + dark) e ao `tailwind.config.ts` (cores `success`, `warning`), caso ainda não existam.

**Arquivos prioritários (alto tráfego visual):**
- `InteligenciaFinanceiraBasica.tsx`
- `InteligenciaFinanceiraAprimorada.tsx`
- `InteligenciaFinanceira.tsx`
- `InteligenciaFinanceiraIA.tsx`
- `AnalyticsChart.tsx`
- `DashboardAvancado.tsx`
- `OptimizedMetricCard.tsx`
- `sections/Dashboard.tsx`, `Receitas.tsx`, `Despesas.tsx`, `Metas.tsx`, `Impostos.tsx`
- `OnboardingFlow.tsx`
- Demais arquivos da lista de 26

### 2. Adicionar loading skeletons no Dashboard

Substituir estados em branco por placeholders animados durante carregamento de dados.

**Onde aplicar:**
- `src/components/sections/Dashboard.tsx` — enquanto `receitas`/`despesas`/`impostos` estão carregando do `AppContext`, mostrar `<Skeleton>` nos cards de métricas (`OptimizedMetricCard`) e nos gráficos.
- `src/components/DashboardAvancado.tsx` — skeletons para gráficos avançados.
- `src/components/InteligenciaFinanceiraIA.tsx` — já tem estado de loading, mas pode ganhar skeleton ao invés de spinner para melhor percepção.

**Implementação:**
- Usar `<Skeleton>` de `@/components/ui/skeleton`.
- Detectar loading via flag do `useAppContext` (verificar se existe `loading`/`isLoading`; se não, derivar de `receitas === undefined`).
- Criar componente `DashboardSkeleton` reutilizável para manter consistência.

## Garantias

- **Não afetar funcionalidades existentes:** apenas substituições visuais e adição de skeletons condicionais.
- **Validação:** rodar `tsc --noEmit` ao final.
- **QA visual:** verificar `/dashboard` em dark mode e light mode após as mudanças.

## Tarefas que serão criadas

1. Adicionar tokens success/warning ao tema
2. Migrar cores hardcoded para tokens semânticos
3. Criar e aplicar skeletons no Dashboard

