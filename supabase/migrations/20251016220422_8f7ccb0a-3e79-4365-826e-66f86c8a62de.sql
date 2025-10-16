-- Fix create_free_trial_subscription to use email from auth.users directly
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
$function$;