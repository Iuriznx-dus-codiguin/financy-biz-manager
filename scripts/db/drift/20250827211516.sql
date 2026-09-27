-- configuracao_recorrencia foi criada direto no banco (sem migração).
ALTER TABLE public.receitas ADD COLUMN IF NOT EXISTS configuracao_recorrencia jsonb;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS configuracao_recorrencia jsonb;
