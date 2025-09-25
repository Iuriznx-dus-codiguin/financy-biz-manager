-- Atualizar período de teste gratuito para 7 dias
CREATE OR REPLACE FUNCTION public.create_free_trial_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir assinatura de teste gratuito padrão (7 dias)
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
    'Teste Gratuito - 7 dias',
    'active',
    now(),
    now() + INTERVAL '7 days', -- 7 dias de teste gratuito
    0,
    '{"max_dashboards": 1, "ai_requests_per_month": 50, "team_members": 1, "whatsapp_integration": true}'::jsonb
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;