-- Adicionar sistema de permissões para equipe
CREATE TABLE IF NOT EXISTS public.equipe_membros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dashboard_id UUID REFERENCES user_dashboards(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  cargo TEXT NOT NULL,
  salario DECIMAL(10,2) NOT NULL DEFAULT 0,
  periodicidade TEXT NOT NULL DEFAULT 'mensal' CHECK (periodicidade IN ('mensal', 'semanal', 'quinzenal')),
  data_admissao DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'pendente')),
  permissoes JSONB DEFAULT '{"read": true, "write": false, "admin": false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar tabela de notificações
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('pagamento', 'meta', 'imposto', 'equipe', 'sistema', 'transacao_recorrente')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT false,
  data_vencimento DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar configurações de recorrência para receitas e despesas  
ALTER TABLE public.receitas 
ADD COLUMN IF NOT EXISTS configuracao_recorrencia JSONB DEFAULT NULL;

ALTER TABLE public.despesas 
ADD COLUMN IF NOT EXISTS configuracao_recorrencia JSONB DEFAULT NULL;

-- Adicionar tabela de sessões de tour
CREATE TABLE IF NOT EXISTS public.user_tour_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tour_name TEXT NOT NULL,
  step_completed INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tour_name)
);

-- Enable RLS para todas as tabelas
ALTER TABLE public.equipe_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tour_progress ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para equipe_membros
CREATE POLICY "Users can view their own team members" ON public.equipe_membros
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own team members" ON public.equipe_membros
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own team members" ON public.equipe_membros
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own team members" ON public.equipe_membros
FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para notificacoes
CREATE POLICY "Users can view their own notifications" ON public.notificacoes
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notifications" ON public.notificacoes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notificacoes
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON public.notificacoes
FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para user_tour_progress
CREATE POLICY "Users can manage their own tour progress" ON public.user_tour_progress
FOR ALL USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_equipe_membros_updated_at
BEFORE UPDATE ON public.equipe_membros
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_tour_progress_updated_at
BEFORE UPDATE ON public.user_tour_progress  
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();