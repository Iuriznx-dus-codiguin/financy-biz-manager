ALTER TABLE public.onboarding_data
  ADD COLUMN IF NOT EXISTS saldo_conta numeric,
  ADD COLUMN IF NOT EXISTS saldo_carteira numeric,
  ADD COLUMN IF NOT EXISTS dividas_atuais numeric,
  ADD COLUMN IF NOT EXISTS receita_extra numeric;