-- Correção completa do sistema de validação de desenvolvedor
-- Sincronizar user_subscriptions com subscribers para desenvolvedores

-- 1. Atualizar user_subscriptions para refletir acesso de desenvolvedor
UPDATE public.user_subscriptions 
SET 
  status = 'active',
  subscription_type = 'developer',
  plan_name = 'Acesso Desenvolvedor',
  expires_at = NULL,
  features = jsonb_build_object(
    'max_dashboards', -1,
    'ai_requests_per_month', -1,
    'team_members', -1,
    'whatsapp_integration', true,
    'advanced_analytics', true,
    'export_data', true
  ),
  updated_at = now()
WHERE user_id = '2744c886-7c9e-4404-916b-205592caa417';

-- 2. Criar função para sincronizar acesso de desenvolvedor automaticamente
CREATE OR REPLACE FUNCTION public.sync_developer_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se subscription_tier for 'developer' em subscribers
  -- Atualizar automaticamente user_subscriptions
  IF NEW.subscription_tier = 'developer' AND NEW.subscribed = true THEN
    INSERT INTO public.user_subscriptions (
      user_id, email, subscription_type, plan_name, 
      status, expires_at, amount, features, metadata
    ) VALUES (
      NEW.user_id, 
      NEW.email, 
      'developer', 
      'Acesso Desenvolvedor',
      'active', 
      NULL,
      0,
      jsonb_build_object(
        'max_dashboards', -1,
        'ai_requests_per_month', -1,
        'team_members', -1,
        'whatsapp_integration', true,
        'advanced_analytics', true,
        'export_data', true
      ),
      jsonb_build_object('synced_from_subscribers', true)
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      subscription_type = 'developer',
      plan_name = 'Acesso Desenvolvedor',
      status = 'active',
      expires_at = NULL,
      features = jsonb_build_object(
        'max_dashboards', -1,
        'ai_requests_per_month', -1,
        'team_members', -1,
        'whatsapp_integration', true,
        'advanced_analytics', true,
        'export_data', true
      ),
      metadata = jsonb_build_object('synced_from_subscribers', true),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS sync_developer_access_trigger ON public.subscribers;
CREATE TRIGGER sync_developer_access_trigger
  AFTER INSERT OR UPDATE ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_developer_access();

-- 4. Log da correção
INSERT INTO public.security_audit_logs (
  user_id,
  action,
  table_name,
  risk_level,
  new_values
) VALUES (
  '2744c886-7c9e-4404-916b-205592caa417',
  'DEVELOPER_ACCESS_SYNC_IMPLEMENTED',
  'user_subscriptions',
  'high',
  jsonb_build_object(
    'subscription_type', 'developer',
    'status', 'active',
    'auto_sync_enabled', true
  )
);