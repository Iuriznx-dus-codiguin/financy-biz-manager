-- ============================================
-- FASE 1: CORREÇÃO DE SEGURANÇA CRÍTICA
-- Prevenir abuso de teste gratuito
-- ============================================

-- 1.1 Criar tabela de histórico de testes gratuitos
CREATE TABLE IF NOT EXISTS public.free_trial_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  telefone text,
  user_id uuid,
  granted_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_trial_history_email ON public.free_trial_history(email);
CREATE INDEX IF NOT EXISTS idx_trial_history_phone ON public.free_trial_history(telefone) WHERE telefone IS NOT NULL;

-- RLS - Apenas system role
ALTER TABLE public.free_trial_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System only access" ON public.free_trial_history;
CREATE POLICY "System only access" ON public.free_trial_history
  FOR ALL USING (auth.role() = 'service_role');

-- 1.2 Modificar função de criação de teste gratuito
DROP TRIGGER IF EXISTS create_trial_on_profile_insert ON public.profiles;

CREATE OR REPLACE FUNCTION public.create_free_trial_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  user_phone text;
  already_had_trial boolean := false;
BEGIN
  -- Buscar email e telefone do perfil
  SELECT email, telefone INTO user_email, user_phone
  FROM public.profiles
  WHERE id = NEW.id;
  
  -- Verificar se email já teve teste gratuito
  IF EXISTS (
    SELECT 1 FROM public.free_trial_history 
    WHERE email = user_email
  ) THEN
    already_had_trial := true;
  END IF;
  
  -- Verificar se telefone já teve teste (se fornecido)
  IF user_phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.free_trial_history 
    WHERE telefone = user_phone
  ) THEN
    already_had_trial := true;
  END IF;
  
  -- Se já teve teste, criar assinatura EXPIRADA
  IF already_had_trial THEN
    INSERT INTO public.user_subscriptions (
      user_id, email, subscription_type, plan_name,
      status, started_at, expires_at, amount, features
    ) VALUES (
      NEW.id, user_email, 'free_trial', 'Teste Gratuito - Expirado',
      'expired', now(), now(), 0,
      '{"max_dashboards": 1, "ai_requests_per_month": 0, "team_members": 1}'::jsonb
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Log de bloqueio
    INSERT INTO public.security_audit_logs (
      user_id, action, table_name, risk_level, 
      new_values
    ) VALUES (
      NEW.id, 'TRIAL_REUSE_BLOCKED', 'user_subscriptions', 'high',
      jsonb_build_object('email', user_email, 'phone', user_phone)
    );
  ELSE
    -- Criar teste gratuito normal
    INSERT INTO public.user_subscriptions (
      user_id, email, subscription_type, plan_name,
      status, started_at, expires_at, amount, features
    ) VALUES (
      NEW.id, user_email, 'free_trial', 'Teste Gratuito - 7 dias',
      'active', now(), now() + INTERVAL '7 days', 0,
      '{"max_dashboards": 1, "ai_requests_per_month": 50, "team_members": 1, "whatsapp_integration": true}'::jsonb
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Registrar no histórico
    INSERT INTO public.free_trial_history (email, telefone, user_id)
    VALUES (user_email, user_phone, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER create_trial_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_free_trial_subscription();

-- 1.3 Atualizar ensure_user_has_subscription para usar histórico
CREATE OR REPLACE FUNCTION public.ensure_user_has_subscription(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email text;
  user_created_at timestamp with time zone;
  user_phone text;
  already_had_trial boolean := false;
BEGIN
  -- Buscar dados do usuário
  SELECT email, created_at, telefone INTO user_email, user_created_at, user_phone
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Verificar se já existe assinatura
  IF EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = p_user_id) THEN
    RETURN true;
  END IF;
  
  -- Verificar se já teve teste gratuito
  IF EXISTS (SELECT 1 FROM public.free_trial_history WHERE email = user_email) THEN
    already_had_trial := true;
  END IF;
  
  IF user_phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.free_trial_history WHERE telefone = user_phone
  ) THEN
    already_had_trial := true;
  END IF;
  
  -- Criar assinatura apropriada
  IF already_had_trial THEN
    INSERT INTO public.user_subscriptions (
      user_id, email, subscription_type, plan_name,
      status, started_at, expires_at, amount, features
    ) VALUES (
      p_user_id, user_email, 'free_trial', 'Teste Gratuito - Expirado',
      'expired', COALESCE(user_created_at, now()), COALESCE(user_created_at, now()), 0,
      '{"max_dashboards": 1, "ai_requests_per_month": 0, "team_members": 1}'::jsonb
    );
  ELSE
    INSERT INTO public.user_subscriptions (
      user_id, email, subscription_type, plan_name,
      status, started_at, expires_at, amount, features
    ) VALUES (
      p_user_id, user_email, 'free_trial', 'Teste Gratuito - 7 dias',
      'active', COALESCE(user_created_at, now()), COALESCE(user_created_at, now()) + INTERVAL '7 days', 0,
      '{"max_dashboards": 1, "ai_requests_per_month": 50, "team_members": 1, "whatsapp_integration": true}'::jsonb
    );
    
    -- Registrar no histórico
    INSERT INTO public.free_trial_history (email, telefone, user_id)
    VALUES (user_email, user_phone, p_user_id);
  END IF;
  
  -- Log
  INSERT INTO public.security_audit_logs (
    user_id, action, table_name, risk_level, metadata
  ) VALUES (
    p_user_id, 'AUTO_CREATE_SUBSCRIPTION', 'user_subscriptions', 'low',
    jsonb_build_object('created_at', now(), 'had_previous_trial', already_had_trial)
  );
  
  RETURN true;
END;
$$;

-- 1.4 Adicionar constraint de unicidade no telefone
-- Primeiro verificar se há duplicados
DO $$
DECLARE
  duplicate_count integer;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT telefone, COUNT(*) as count
    FROM profiles
    WHERE telefone IS NOT NULL AND telefone != ''
    GROUP BY telefone
    HAVING COUNT(*) > 1
  ) dups;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Aviso: Existem % telefones duplicados. Será necessário limpeza manual.', duplicate_count;
  ELSE
    -- Se não há duplicados, criar constraint
    ALTER TABLE public.profiles
    ADD CONSTRAINT unique_telefone UNIQUE (telefone);
  END IF;
END $$;

-- FASE 4: Popular histórico com dados existentes
INSERT INTO public.free_trial_history (email, telefone, user_id, granted_at)
SELECT 
  us.email,
  p.telefone,
  us.user_id,
  us.started_at
FROM public.user_subscriptions us
LEFT JOIN public.profiles p ON p.id = us.user_id
WHERE us.subscription_type = 'free_trial'
ON CONFLICT DO NOTHING;