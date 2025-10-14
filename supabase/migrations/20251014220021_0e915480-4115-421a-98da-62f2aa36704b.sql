-- Reativar trigger automático de teste gratuito na tabela profiles
-- Isso garante que todo novo usuário receba automaticamente 7 dias de teste

-- Primeiro, remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_trial_on_profile_insert ON public.profiles;

-- Criar trigger na tabela profiles (que é acionado após insert de novo usuário)
CREATE TRIGGER create_trial_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_free_trial_subscription();

-- Adicionar função auxiliar para verificar e criar assinatura se não existir
CREATE OR REPLACE FUNCTION public.ensure_user_has_subscription(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  user_created_at timestamp with time zone;
BEGIN
  -- Buscar email e data de criação do usuário
  SELECT email, created_at INTO user_email, user_created_at
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Verificar se já existe assinatura
  IF EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = p_user_id) THEN
    RETURN true;
  END IF;
  
  -- Se não existe, criar teste gratuito
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
    p_user_id,
    user_email,
    'free_trial',
    'Teste Gratuito - 7 dias',
    'active',
    COALESCE(user_created_at, now()),
    COALESCE(user_created_at, now()) + INTERVAL '7 days',
    0,
    '{"max_dashboards": 1, "ai_requests_per_month": 50, "team_members": 1, "whatsapp_integration": true}'::jsonb
  );
  
  -- Log da criação
  INSERT INTO public.security_audit_logs (
    user_id, action, table_name, risk_level, metadata
  ) VALUES (
    p_user_id, 'AUTO_CREATE_FREE_TRIAL', 'user_subscriptions', 'low',
    jsonb_build_object('created_at', now(), 'auto_created', true)
  );
  
  RETURN true;
END;
$$;

-- Corrigir usuários existentes sem assinatura (migração de dados)
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN 
    SELECT p.id, p.email, p.created_at
    FROM public.profiles p
    LEFT JOIN public.user_subscriptions us ON p.id = us.user_id
    WHERE us.id IS NULL
  LOOP
    -- Criar assinatura de teste gratuito para usuários sem assinatura
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
      profile_record.id,
      profile_record.email,
      'free_trial',
      'Teste Gratuito - 7 dias',
      CASE 
        WHEN profile_record.created_at + INTERVAL '7 days' > now() THEN 'active'
        ELSE 'expired'
      END,
      profile_record.created_at,
      profile_record.created_at + INTERVAL '7 days',
      0,
      '{"max_dashboards": 1, "ai_requests_per_month": 50, "team_members": 1, "whatsapp_integration": true}'::jsonb
    )
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;