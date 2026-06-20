## Resultado da verificação dos blocos 6, 7, 10 e 11

Auditei o código atual. A maior parte foi implementada corretamente, mas **um item do Bloco 6 está incompleto**.

### Bloco 6 — Etapas opcionais do onboarding ⚠️ parcial
- ✅ `TOTAL_STEPS = 7` em `OnboardingFlow.tsx`
- ✅ `OptionalStepWrapper` + botão "Pular etapa" presentes
- ✅ `FinancialDataStep`, `ExpenseSheetStep`, `FinancialGoalStep` reativados como etapas 4, 5 e 6
- ✅ Campo "Como conheceu?" (`how_did_you_know`) na etapa de identificação, persistido em `onboarding_data`
- ✅ `gastos_iniciais` salvos em `despesas`, `meta_financeira` salva em `metas`
- ❌ **Os campos `saldo_conta`, `saldo_carteira`, `dividas_atuais` e `receita_extra` do `FinancialDataStep` são capturados na UI mas nunca persistidos.** Não existem colunas no schema (`onboarding_data` só tem user_type, how_did_you_know, salary/revenue range, nome_preferido, termos_aceitos) e `useOnboarding.completeOnboarding` não envia esses valores para lugar nenhum — o passo é cosmético hoje.

### Bloco 7 — Robustez ✅
- ✅ `.maybeSingle()` aplicado em `useOnboarding.tsx` (linhas 48 e 76), elimina o ruído de `PGRST116`
- ✅ Removida a chamada extra de verificação de telefone na gravação final (UI valida na etapa 2 + constraint de unicidade no banco)

### Bloco 9 — Views/funções mascaradas ✅
- ✅ Migration `20260620200052_*.sql` faz `DROP FUNCTION IF EXISTS public.get_receitas_masked()` e `get_despesas_masked()`
- ✅ Nenhuma referência remanescente no código-fonte

### Bloco 10 — LoadingScreen orientado a estado ✅
- ✅ `MIN_VISIBLE_MS = 450` em `LoadingScreen.tsx`
- ✅ Consome `useAuth`, `useOnboarding`, `useUserSubscription` (sem timers fixos)

### Bloco 11 — Retrocompatibilidade ✅
- ✅ Migration nova só faz DROP de funções não usadas, sem alterar tabelas existentes
- ✅ `how_did_you_know` já era `nullable` desde `20260531133016_*.sql`, então contas antigas continuam válidas
- ✅ Etapas 4–6 são opcionais via `OptionalStepWrapper`; usuários antigos com onboarding marcado como completo não são forçados a refazer

---

## Correção proposta (única lacuna)

Persistir os dados financeiros opcionais coletados na etapa 4. Plano:

1. **Nova migration** `supabase/migrations/<timestamp>_onboarding_financial_data.sql`:
   - `ALTER TABLE public.onboarding_data ADD COLUMN IF NOT EXISTS saldo_conta numeric, ADD COLUMN saldo_carteira numeric, ADD COLUMN dividas_atuais numeric, ADD COLUMN receita_extra numeric;`
   - Todas nullable — retrocompatível com contas existentes.
2. **`src/hooks/useOnboarding.tsx`** — no `upsert` em `onboarding_data` (linhas 133–145), incluir os quatro campos com `?? null` para que pular a etapa grave `null` sem erro.
3. **`src/integrations/supabase/types.ts`** — será regenerado automaticamente após a migration.
4. Sem alterações em `OnboardingFlow.tsx` ou `FinancialDataStep.tsx` — a UI já está pronta.

Nenhuma mudança em autenticação, cálculos financeiros, integração Cakto ou em páginas fora do onboarding.

Se aprovar, aplico apenas essa correção e confirmo o resultado.