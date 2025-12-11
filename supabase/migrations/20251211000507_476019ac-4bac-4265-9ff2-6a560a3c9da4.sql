-- Corrigir funções SQL sem search_path definido

-- 1. Corrigir sync_developer_access
CREATE OR REPLACE FUNCTION public.sync_developer_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NULL THEN
    RAISE WARNING 'sync_developer_access: user_id is NULL, skipping sync for email %', NEW.email;
    RETURN NEW;
  END IF;

  IF NEW.subscription_tier = 'developer' AND NEW.subscribed = true THEN
    RAISE LOG 'sync_developer_access: Syncing developer access for user_id: %, email: %', NEW.user_id, NEW.email;
    
    INSERT INTO public.user_subscriptions (
      user_id, email, subscription_type, plan_name, status, expires_at, amount, features, metadata
    ) VALUES (
      NEW.user_id, NEW.email, 'developer', 'Acesso Desenvolvedor', 'active', NULL, 0,
      jsonb_build_object('max_dashboards', -1, 'ai_requests_per_month', -1, 'team_members', -1, 'whatsapp_integration', true, 'advanced_analytics', true, 'export_data', true),
      jsonb_build_object('synced_from_subscribers', true)
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET subscription_type = 'developer', plan_name = 'Acesso Desenvolvedor', status = 'active', expires_at = NULL,
      features = jsonb_build_object('max_dashboards', -1, 'ai_requests_per_month', -1, 'team_members', -1, 'whatsapp_integration', true, 'advanced_analytics', true, 'export_data', true),
      metadata = jsonb_build_object('synced_from_subscribers', true), updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Corrigir normalize_phone_br
CREATE OR REPLACE FUNCTION public.normalize_phone_br(phone_input text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  cleaned text;
  digits_only text;
BEGIN
  IF phone_input IS NULL OR TRIM(phone_input) = '' THEN RETURN NULL; END IF;
  cleaned := REGEXP_REPLACE(phone_input, '[^0-9+]', '', 'g');
  IF cleaned LIKE '+55%' THEN RETURN cleaned; END IF;
  digits_only := REGEXP_REPLACE(cleaned, '[^0-9]', '', 'g');
  IF digits_only LIKE '55%' AND LENGTH(digits_only) >= 12 THEN RETURN '+' || digits_only; END IF;
  IF LENGTH(digits_only) = 11 THEN RETURN '+55' || digits_only; END IF;
  IF LENGTH(digits_only) = 10 AND digits_only ~ '^[1-9][1-9][0-9]{8}$' THEN
    RETURN '+55' || SUBSTRING(digits_only FROM 1 FOR 2) || '9' || SUBSTRING(digits_only FROM 3);
  END IF;
  RETURN NULL;
END;
$function$;

-- 3. Corrigir trigger_normalize_phone_before_save
CREATE OR REPLACE FUNCTION public.trigger_normalize_phone_before_save()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.telefone IS NOT NULL AND NEW.telefone != '' THEN
    NEW.telefone := normalize_phone_br(NEW.telefone);
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Corrigir verificar_usuarios_sem_transacao
CREATE OR REPLACE FUNCTION public.verificar_usuarios_sem_transacao()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Function body kept for compatibility but not actively used
  RAISE LOG 'verificar_usuarios_sem_transacao: This function is deprecated';
END;
$function$;

-- 5. Corrigir enviar_lembretes_financy
CREATE OR REPLACE FUNCTION public.enviar_lembretes_financy()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Function body kept for compatibility but handled by Edge Function
  RAISE LOG 'enviar_lembretes_financy: This function is deprecated, use daily-transaction-reminder Edge Function';
END;
$function$;

-- 6. Criar função para processar transações recorrentes de um usuário específico (para uso no frontend)
CREATE OR REPLACE FUNCTION public.processar_transacoes_recorrentes_usuario(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  receita_rec RECORD;
  despesa_rec RECORD;
  receitas_count INTEGER := 0;
  despesas_count INTEGER := 0;
  main_dashboard_id UUID;
BEGIN
  -- Processar receitas recorrentes do usuário
  FOR receita_rec IN 
    SELECT * FROM receitas 
    WHERE user_id = p_user_id
    AND recorrente = true 
    AND proxima_data <= CURRENT_DATE
    ORDER BY proxima_data ASC
  LOOP
    BEGIN
      IF receita_rec.dashboard_id IS NULL THEN
        main_dashboard_id := public.get_user_main_dashboard(p_user_id);
      ELSE
        main_dashboard_id := receita_rec.dashboard_id;
      END IF;
      
      INSERT INTO receitas (
        user_id, data, valor, categoria, cliente, forma_pagamento, 
        descricao, dashboard_id, categoria_personalizada, status
      ) VALUES (
        p_user_id, receita_rec.proxima_data, receita_rec.valor, receita_rec.categoria,
        receita_rec.cliente, receita_rec.forma_pagamento,
        receita_rec.descricao || ' (Recorrente)', main_dashboard_id,
        receita_rec.categoria_personalizada, 'paga'
      );
      
      UPDATE receitas 
      SET proxima_data = public.calcular_proxima_data(proxima_data, tipo_recorrencia)
      WHERE id = receita_rec.id;
      
      receitas_count := receitas_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao processar receita ID %: %', receita_rec.id, SQLERRM;
    END;
  END LOOP;

  -- Processar despesas recorrentes do usuário
  FOR despesa_rec IN 
    SELECT * FROM despesas 
    WHERE user_id = p_user_id
    AND recorrente = true 
    AND proxima_data <= CURRENT_DATE
    ORDER BY proxima_data ASC
  LOOP
    BEGIN
      IF despesa_rec.dashboard_id IS NULL THEN
        main_dashboard_id := public.get_user_main_dashboard(p_user_id);
      ELSE
        main_dashboard_id := despesa_rec.dashboard_id;
      END IF;
      
      INSERT INTO despesas (
        user_id, data, valor, categoria, fornecedor, forma_pagamento, 
        descricao, dashboard_id, categoria_personalizada, status
      ) VALUES (
        p_user_id, despesa_rec.proxima_data, despesa_rec.valor, despesa_rec.categoria,
        despesa_rec.fornecedor, despesa_rec.forma_pagamento,
        despesa_rec.descricao || ' (Recorrente)', main_dashboard_id,
        despesa_rec.categoria_personalizada, 'paga'
      );
      
      UPDATE despesas 
      SET proxima_data = public.calcular_proxima_data(proxima_data, tipo_recorrencia)
      WHERE id = despesa_rec.id;
      
      despesas_count := despesas_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao processar despesa ID %: %', despesa_rec.id, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'receitas_processadas', receitas_count,
    'despesas_processadas', despesas_count,
    'total', receitas_count + despesas_count
  );
END;
$function$;