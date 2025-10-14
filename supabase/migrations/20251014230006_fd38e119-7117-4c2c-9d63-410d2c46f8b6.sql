-- Melhorar função sync_developer_access com validação NULL
CREATE OR REPLACE FUNCTION sync_developer_access()
RETURNS TRIGGER AS $$
BEGIN
  -- ✅ VALIDAÇÃO CRÍTICA: Verificar se user_id está presente
  IF NEW.user_id IS NULL THEN
    RAISE WARNING 'sync_developer_access: user_id is NULL, skipping sync for email %', NEW.email;
    RETURN NEW;
  END IF;

  -- Se subscription_tier for 'developer' em subscribers
  -- Atualizar automaticamente user_subscriptions
  IF NEW.subscription_tier = 'developer' AND NEW.subscribed = true THEN
    RAISE LOG 'sync_developer_access: Syncing developer access for user_id: %, email: %', NEW.user_id, NEW.email;
    
    INSERT INTO public.user_subscriptions (
      user_id, 
      email, 
      subscription_type, 
      plan_name, 
      status, 
      expires_at, 
      amount, 
      features, 
      metadata
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
      
    RAISE LOG 'sync_developer_access: Successfully synced developer access for user %', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;