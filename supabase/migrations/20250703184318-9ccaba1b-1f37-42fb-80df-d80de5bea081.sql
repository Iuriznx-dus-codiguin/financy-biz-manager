
-- Criar tabela para metas dos usuários
CREATE TABLE public.metas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  titulo TEXT NOT NULL,
  valor_meta NUMERIC NOT NULL,
  valor_atual NUMERIC NOT NULL DEFAULT 0,
  progresso INTEGER NOT NULL DEFAULT 0,
  prazo DATE NOT NULL,
  categoria TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  cor TEXT NOT NULL DEFAULT 'bg-blue-500',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela metas
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

-- Política para usuários visualizarem suas próprias metas
CREATE POLICY "Users can view their own metas" 
  ON public.metas 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Política para usuários criarem suas próprias metas
CREATE POLICY "Users can create their own metas" 
  ON public.metas 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Política para usuários atualizarem suas próprias metas
CREATE POLICY "Users can update their own metas" 
  ON public.metas 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Política para usuários deletarem suas próprias metas
CREATE POLICY "Users can delete their own metas" 
  ON public.metas 
  FOR DELETE 
  USING (auth.uid() = user_id);
