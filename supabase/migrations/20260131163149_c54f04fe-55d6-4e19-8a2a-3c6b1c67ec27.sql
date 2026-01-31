-- =====================================================
-- MIGRAÇÃO: Remover modelo de 7 dias grátis
-- Implementar acesso condicionado a pagamento
-- =====================================================

-- 1. Alterar a função create_free_trial_subscription para criar assinatura pendente
CREATE OR REPLACE FUNCTION public.create_free_trial_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_email text;
  user_phone text;
  already_had_trial boolean := false;
BEGIN
  -- Get email directly from NEW (auth.users) instead of profiles
  user_email := NEW.email;
  
  -- Try to get phone from profiles if it exists
  SELECT telefone INTO user_phone
  FROM public.profiles
  WHERE id = NEW.id;
  
  -- Verificar se email já teve teste gratuito anteriormente (usuários antigos)
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
  
  -- NOVO COMPORTAMENTO: Criar assinatura com status pending_payment
  -- Novos usuários precisam pagar para ter acesso
  INSERT INTO public.user_subscriptions (
    user_id, email, subscription_type, plan_name,
    status, started_at, expires_at, amount, features
  ) VALUES (
    NEW.id, user_email, 'pending', 'Aguardando Pagamento',
    'pending_payment', now(), now(), 0,
    '{"max_dashboards": 0, "ai_requests_per_month": 0, "team_members": 0}'::jsonb
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Log de criação
  INSERT INTO public.security_audit_logs (
    user_id, action, table_name, risk_level, 
    new_values
  ) VALUES (
    NEW.id, 'USER_CREATED_PENDING_PAYMENT', 'user_subscriptions', 'low',
    jsonb_build_object('email', user_email, 'phone', user_phone, 'had_previous_trial', already_had_trial)
  );
  
  RETURN NEW;
END;
$function$;

-- 2. Alterar a função ensure_user_has_subscription para criar assinatura pendente
CREATE OR REPLACE FUNCTION public.ensure_user_has_subscription(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_email text;
  user_created_at timestamp with time zone;
  user_phone text;
  existing_sub record;
BEGIN
  -- Buscar dados do usuário
  SELECT email, created_at, telefone INTO user_email, user_created_at, user_phone
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Verificar se já existe assinatura
  SELECT * INTO existing_sub FROM public.user_subscriptions WHERE user_id = p_user_id;
  
  IF existing_sub IS NOT NULL THEN
    -- Se já existe assinatura ativa ou de desenvolvedor, retornar true
    IF existing_sub.status = 'active' OR existing_sub.subscription_type = 'developer' THEN
      RETURN true;
    END IF;
    -- Se já existe mas é pending_payment, retornar true (já está configurado)
    IF existing_sub.status = 'pending_payment' THEN
      RETURN true;
    END IF;
  END IF;
  
  -- NOVO COMPORTAMENTO: Criar assinatura com status pending_payment
  IF existing_sub IS NULL THEN
    INSERT INTO public.user_subscriptions (
      user_id, email, subscription_type, plan_name,
      status, started_at, expires_at, amount, features
    ) VALUES (
      p_user_id, user_email, 'pending', 'Aguardando Pagamento',
      'pending_payment', COALESCE(user_created_at, now()), COALESCE(user_created_at, now()), 0,
      '{"max_dashboards": 0, "ai_requests_per_month": 0, "team_members": 0}'::jsonb
    );
  END IF;
  
  -- Log
  INSERT INTO public.security_audit_logs (
    user_id, action, table_name, risk_level, metadata
  ) VALUES (
    p_user_id, 'AUTO_CREATE_PENDING_SUBSCRIPTION', 'user_subscriptions', 'low',
    jsonb_build_object('created_at', now())
  );
  
  RETURN true;
END;
$function$;