-- Criar tabela completa de assinaturas de usuários
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    
    -- Informações do plano
    subscription_type TEXT NOT NULL DEFAULT 'free_trial', -- free_trial, basic, premium, enterprise
    plan_name TEXT NOT NULL DEFAULT 'Teste Gratuito',
    plan_id TEXT,
    
    -- Status da assinatura
    status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, expired, suspended
    
    -- Datas importantes
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    renewed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Informações de pagamento
    amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'BRL',
    billing_period TEXT DEFAULT 'monthly', -- monthly, yearly, lifetime
    payment_method TEXT,
    
    -- Integração com Cakto
    cakto_subscription_id TEXT,
    cakto_customer_id TEXT,
    
    -- Recursos disponíveis
    features JSONB DEFAULT '{"max_dashboards": 1, "ai_requests_per_month": 50, "team_members": 1}'::jsonb,
    
    -- Metadados adicionais
    metadata JSONB DEFAULT '{}'::jsonb,
    
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own subscription" 
ON public.user_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" 
ON public.user_subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert subscriptions" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role'::text OR auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar assinatura de teste gratuito automaticamente
CREATE OR REPLACE FUNCTION public.create_free_trial_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir assinatura de teste gratuito padrão
  INSERT INTO public.user_subscriptions (
    user_id,
    email,
    subscription_type,
    plan_name,
    status,
    started_at,
    expires_at,
    amount,
    features
  ) VALUES (
    NEW.id,
    NEW.email,
    'free_trial',
    'Teste Gratuito - 14 dias',
    'active',
    now(),
    now() + INTERVAL '14 days', -- 14 dias de teste gratuito
    0,
    '{"max_dashboards": 1, "ai_requests_per_month": 50, "team_members": 1, "whatsapp_integration": true}'::jsonb
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger para criar teste gratuito automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created_free_trial ON auth.users;
CREATE TRIGGER on_auth_user_created_free_trial
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE PROCEDURE public.create_free_trial_subscription();

-- Função para verificar se usuário tem acesso a um recurso
CREATE OR REPLACE FUNCTION public.user_has_feature(p_user_id UUID, p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_record RECORD;
BEGIN
  -- Buscar assinatura ativa do usuário
  SELECT * INTO subscription_record
  FROM public.user_subscriptions
  WHERE user_id = p_user_id 
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now());
    
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Verificar se o recurso está disponível
  RETURN (subscription_record.features ->> p_feature)::boolean IS TRUE
    OR (subscription_record.features ->> p_feature)::integer > 0;
END;
$$;

-- Função para obter limites de recursos do usuário
CREATE OR REPLACE FUNCTION public.get_user_subscription_limits(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_record RECORD;
BEGIN
  -- Buscar assinatura ativa do usuário
  SELECT * INTO subscription_record
  FROM public.user_subscriptions
  WHERE user_id = p_user_id 
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now());
    
  IF NOT FOUND THEN
    -- Retornar limites básicos se não encontrou assinatura
    RETURN '{"max_dashboards": 1, "ai_requests_per_month": 10, "team_members": 1}'::jsonb;
  END IF;
  
  RETURN subscription_record.features;
END;
$$;

-- Função para renovar assinatura
CREATE OR REPLACE FUNCTION public.renew_subscription(
  p_user_id UUID,
  p_new_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_amount NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_subscription RECORD;
  new_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Buscar assinatura atual
  SELECT * INTO current_subscription
  FROM public.user_subscriptions
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Calcular nova data de expiração se não fornecida
  IF p_new_expires_at IS NULL THEN
    IF current_subscription.billing_period = 'yearly' THEN
      new_expires_at = COALESCE(current_subscription.expires_at, now()) + INTERVAL '1 year';
    ELSE
      new_expires_at = COALESCE(current_subscription.expires_at, now()) + INTERVAL '1 month';
    END IF;
  ELSE
    new_expires_at = p_new_expires_at;
  END IF;
  
  -- Atualizar assinatura
  UPDATE public.user_subscriptions
  SET 
    expires_at = new_expires_at,
    renewed_at = now(),
    status = 'active',
    amount = COALESCE(p_amount, amount),
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN true;
END;
$$;

-- Índices para performance
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_expires_at ON public.user_subscriptions(expires_at);
CREATE INDEX idx_user_subscriptions_cakto_id ON public.user_subscriptions(cakto_subscription_id);

-- Atualizar função handle_new_user para não inserir telefone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome_completo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nome_completo', '')
  );
  RETURN NEW;
END;
$$;