-- Criar tabela para conversas dos agentes de IA
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('support', 'financial_intelligence', 'tax_specialist')),
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own conversations" ON public.ai_conversations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" ON public.ai_conversations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Criar tabela para gastos/receitas reconhecidos pela IA
CREATE TABLE IF NOT EXISTS public.ai_recognized_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  confirmed BOOLEAN DEFAULT false,
  saved_to_platform BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_recognized_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own AI transactions" ON public.ai_recognized_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI transactions" ON public.ai_recognized_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI transactions" ON public.ai_recognized_transactions
FOR UPDATE
USING (auth.uid() = user_id);