-- Restaurar acesso de desenvolvedor para o usuário
-- Email: iuri.ads.money.gm@gmail.com

-- Atualizar tabela subscribers
UPDATE public.subscribers 
SET 
  subscription_tier = 'developer',
  subscribed = true,
  subscription_end = NULL,
  updated_at = now()
WHERE email = 'iuri.ads.money.gm@gmail.com';

-- Garantir que existe registro na tabela subscribers
INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier, subscription_end)
SELECT 
  id,
  email,
  true,
  'developer',
  NULL
FROM public.profiles
WHERE email = 'iuri.ads.money.gm@gmail.com'
ON CONFLICT (email) 
DO UPDATE SET
  subscription_tier = 'developer',
  subscribed = true,
  subscription_end = NULL,
  updated_at = now();

-- Log da operação
INSERT INTO public.security_audit_logs (
  user_id,
  action,
  table_name,
  risk_level,
  new_values
)
SELECT 
  id,
  'MANUAL_DEVELOPER_ACCESS_RESTORE',
  'subscribers',
  'high',
  jsonb_build_object(
    'email', 'iuri.ads.money.gm@gmail.com',
    'subscription_tier', 'developer',
    'reason', 'Edge Function deployment pending'
  )
FROM public.profiles
WHERE email = 'iuri.ads.money.gm@gmail.com';