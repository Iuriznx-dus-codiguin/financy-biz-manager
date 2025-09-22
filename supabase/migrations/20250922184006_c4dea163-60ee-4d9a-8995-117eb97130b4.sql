-- Criar índice para busca eficiente por telefone na tabela profiles
CREATE INDEX IF NOT EXISTS idx_profiles_telefone ON public.profiles (telefone) WHERE telefone IS NOT NULL;