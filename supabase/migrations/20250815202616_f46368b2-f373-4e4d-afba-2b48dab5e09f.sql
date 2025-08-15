-- Adicionar novos campos à tabela onboarding_data
ALTER TABLE public.onboarding_data
ADD COLUMN nome_preferido TEXT,
ADD COLUMN termos_aceitos BOOLEAN DEFAULT false;