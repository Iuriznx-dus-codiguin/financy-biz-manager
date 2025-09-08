-- Criar tabela de categorias personalizadas
CREATE TABLE public.categorias_personalizadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa', 'ambos')),
  cor TEXT NOT NULL DEFAULT '#3B82F6',
  icone TEXT DEFAULT 'folder',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  dashboard_id UUID,
  UNIQUE(user_id, nome, tipo)
);

-- Enable Row Level Security
ALTER TABLE public.categorias_personalizadas ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own categories" 
ON public.categorias_personalizadas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories" 
ON public.categorias_personalizadas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" 
ON public.categorias_personalizadas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" 
ON public.categorias_personalizadas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_categorias_personalizadas_updated_at
BEFORE UPDATE ON public.categorias_personalizadas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir algumas categorias padrão para novos usuários
INSERT INTO public.categorias_personalizadas (user_id, nome, tipo, cor, icone) VALUES
('00000000-0000-0000-0000-000000000000', 'Alimentação', 'despesa', '#F59E0B', 'utensils'),
('00000000-0000-0000-0000-000000000000', 'Transporte', 'despesa', '#10B981', 'car'),
('00000000-0000-0000-0000-000000000000', 'Moradia', 'despesa', '#8B5CF6', 'home'),
('00000000-0000-0000-0000-000000000000', 'Saúde', 'despesa', '#EF4444', 'heart'),
('00000000-0000-0000-0000-000000000000', 'Educação', 'despesa', '#3B82F6', 'book-open'),
('00000000-0000-0000-0000-000000000000', 'Lazer', 'despesa', '#F97316', 'gamepad-2'),
('00000000-0000-0000-0000-000000000000', 'Vendas', 'receita', '#22C55E', 'shopping-cart'),
('00000000-0000-0000-0000-000000000000', 'Serviços', 'receita', '#06B6D4', 'briefcase'),
('00000000-0000-0000-0000-000000000000', 'Investimentos', 'receita', '#8B5CF6', 'trending-up');