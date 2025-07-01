
-- Criar tabela para armazenar dados do onboarding
CREATE TABLE public.onboarding_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_type text NOT NULL,
  how_did_you_know text NOT NULL,
  salary_range text,
  revenue_range text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE public.onboarding_data ENABLE ROW LEVEL SECURITY;

-- Política para que usuários vejam apenas seus próprios dados
CREATE POLICY "Users can view their own onboarding data" 
  ON public.onboarding_data 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Política para que usuários insiram apenas seus próprios dados
CREATE POLICY "Users can insert their own onboarding data" 
  ON public.onboarding_data 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Política para que usuários atualizem apenas seus próprios dados
CREATE POLICY "Users can update their own onboarding data" 
  ON public.onboarding_data 
  FOR UPDATE 
  USING (auth.uid() = user_id);
