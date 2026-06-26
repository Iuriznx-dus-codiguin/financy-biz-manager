# Sprint de aprimoramentos MVP

**Escopo**: responsividade mobile/tablet + ferramentas/funcionalidades + lógica/consistência de dados.
**Profundidade**: polish + refinos de lógica (sem refatoração estrutural).
**Intocáveis**: Onboarding, Auth/Login, Tour/Tutorial.

---

## 1. Responsividade mobile/tablet

**Tabelas e listas** (Receitas, Despesas, Impostos, Equipe, Metas, Categorias)
- Padronizar wrappers com `overflow-x-auto` + `min-w-` interno, evitando scroll horizontal da página inteira.
- Em telas <640px, converter linhas longas para cards empilhados (padrão já existe em algumas seções; replicar).
- Ajustar paddings (`p-3 sm:p-4 lg:p-6`) e remover larguras fixas que estouram em 360px.

**Headers de seção**
- Padronizar: título + descrição + ações (botões/dropdowns) com `flex-col sm:flex-row` e `gap-3`.
- `SectionTourTrigger` sempre alinhado à direita do título.

**Diálogos e Sheets**
- Garantir `max-h-[90dvh] overflow-y-auto` em todos os Dialogs com formulários longos.
- Em mobile, trocar Dialogs grandes (Despesas/Receitas) por Sheet `side="bottom"` quando viewport <640px.

**Filtros e seletores**
- `TimeFilter` e `CategorySelector`: largura `w-full sm:w-auto`, evitar quebra de chips.
- `CompactDashboardSelector` no header mobile: truncar nomes longos com tooltip.

**Dashboard**
- Grids de cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`; revisar `InteligenciaFinanceira*` para não estourar.
- `RelatoriosAvancados`/`DashboardAvancado`: charts com `ResponsiveContainer` e altura mínima em mobile.

---

## 2. Ferramentas e funcionalidades

**Import/export de planilhas** (já existe em Receitas/Despesas)
- Estender `SpreadsheetImportExport` para **Metas** e **Impostos** (template + import + export).
- Validação no import: linhas inválidas listadas em toast com contagem; commit apenas das válidas.
- Adicionar coluna `dashboard_id` no template para usuários multi-dashboard (default = atual).

**Filtros globais**
- Adicionar busca textual em Receitas/Despesas (descrição/categoria) com debounce 250ms.
- Persistir `TimeFilter` selecionado por seção em `localStorage` (`financy-filter-{section}`).

**Notificações**
- `notificacoes`: marcar lidas em lote ("marcar todas como lidas") e badge no header.
- Limpar notificações com mais de 30 dias automaticamente no client (já no fetch).

**Recorrentes**
- Botão "Processar agora" em Receitas/Despesas para forçar `useRecurringTransactions` (útil quando usuário entra após várias datas).
- Indicador visual (badge "Recorrente") nas linhas geradas.

**IA / Chat**
- Manter como está (recém-revisado); apenas garantir que `data-tutorial` não conflite com mobile.

---

## 3. Lógica e consistência de dados

**`useDashboard`**
- Garantir que toda mutação (criar/excluir/renomear) invalide caches dependentes (`useFinancialCalculations`, `query_cache`).
- `switchDashboard`: prevenir corrida quando usuário troca durante fetch em andamento (AbortController ou guard por id).

**`useFinancialCalculations`**
- Auditar filtros por `dashboard_id`: confirmar que todas as queries (receitas, despesas, impostos, metas) escopam pelo dashboard atual — relatos de totais "vazando" entre contas.
- Memoizar resultados pesados (`useMemo` com deps explícitas) para reduzir re-render.

**`useUserSubscription` / gating**
- Centralizar `isBlocked` em um único helper exportado (hoje calculado em `AuthenticatedLayout` e replicado em sidebar).
- Edge case: `subscription.status === 'active'` com `expires_at` no passado — tratar como expirado.

**Categorias personalizadas**
- Ao excluir categoria com transações vinculadas: confirmar via `AlertDialog` e mover transações para "Outros" em vez de deixar órfãs.

**Metas**
- Recalcular `progresso` no client a partir das transações reais quando `dashboard_id` muda (hoje pode ficar stale).

**Datas / fuso**
- Padronizar uso de `date-fns` com timezone BRT em todos os agregados (alguns lugares usam `new Date()` direto).

---

## Detalhes técnicos

**Arquivos editados** (lista não-exaustiva):
- `src/components/sections/{Receitas,Despesas,Impostos,Equipe,Metas,Categorias,Relatorios,Fechamento}.tsx`: padronização de header, responsividade de tabelas/cards, integração de busca/filtro persistido.
- `src/components/SpreadsheetImportExport.tsx`: suporte a Metas/Impostos + validação de linhas.
- `src/components/CompactDashboardSelector.tsx`: truncamento + tooltip.
- `src/components/TimeFilter.tsx`: persistência por seção.
- `src/hooks/useDashboard.tsx`: invalidação de cache, guard de corrida em `switchDashboard`.
- `src/hooks/useFinancialCalculations.tsx`: auditoria de `dashboard_id`, memoização.
- `src/hooks/useUserSubscription.tsx`: helper `isBlocked` centralizado; tratamento de expiração.
- `src/hooks/useCategoriasPersonalizadas.tsx`: fluxo de exclusão com reatribuição.
- `src/hooks/useRecurringTransactions.tsx`: expor `runNow()`.
- `src/components/sections/Dashboard.tsx`: grids responsivos.
- `src/utils/dateFilters.ts`: padronização BRT.

**Sem alterações de schema**. Nenhuma migração necessária — todas as melhorias usam tabelas/colunas existentes.

**Não tocar**: `OnboardingFlow.tsx`, `tourSteps.ts`, `ProductTour.tsx`, `TourOverlay.tsx`, `AuthPage.tsx`, `RootRedirect`.

---

## Validação manual sugerida
1. Mobile 360–414px: abrir cada seção, verificar ausência de scroll horizontal e Dialogs acessíveis.
2. Trocar de dashboard em sequência rápida e conferir totais corretos no Dashboard/Relatórios.
3. Importar planilha de Metas com 2 linhas válidas + 1 inválida — confirmar toast e persistência apenas das válidas.
4. Excluir categoria com transações — confirmar reatribuição para "Outros".
5. Expirar assinatura manualmente (via SQL) — confirmar bloqueio consistente em sidebar e rotas.
