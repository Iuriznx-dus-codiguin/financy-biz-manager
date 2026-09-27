-- =============================================================================
-- Segurança das RPCs (AUDITORIA A-01, A-02, A-09, A-34)
-- =============================================================================
-- 1. Funções auxiliares para identificar o chamador.
-- 2. Revoga EXECUTE de anon/authenticated nas funções que o front não usa e que, sendo
--    SECURITY DEFINER, alteram ou leem dados de qualquer usuário (ex.: renew_subscription
--    ativava qualquer conta sem pagamento). service_role, pg_cron e conexões diretas
--    (n8n com credencial de banco) continuam executando.
-- 3. Guarda "o próprio usuário ou chamador privilegiado" nas RPCs que o front usa,
--    mantendo nome, argumentos e retorno (contrato com o n8n).
-- 4. Corrige ensure_user_has_subscription, que gravava a coluna inexistente
--    security_audit_logs.metadata e falhava.
-- 5. Logs do webhook da Cakto passam a exigir o papel admin (antes: tier developer).
--
-- Idempotente. Não apaga nem altera dados.
--
-- REVERSÃO (em ordem inversa):
--   -- 5
--   DROP POLICY IF EXISTS "Admins leem logs do webhook da Cakto" ON public.cakto_webhook_logs;
--   CREATE POLICY "Developers can read cakto webhook logs" ON public.cakto_webhook_logs FOR SELECT TO authenticated
--     USING (EXISTS (SELECT 1 FROM public.subscribers s WHERE (s.user_id = auth.uid() OR s.email = (auth.jwt() ->> 'email'))
--                    AND s.subscription_tier = 'developer' AND s.subscribed = true));
--   -- 2 (para cada função listada em v_restritas):
--   GRANT EXECUTE ON FUNCTION public.<funcao>(<args>) TO anon, authenticated;
--   -- 3 e 4: reaplicar as definições das migrações 20250918173633 (get_dashboard_data),
--   --        20250827214921 (get_user_profile_data), 20250925003707 (user_has_feature,
--   --        get_user_subscription_limits) e 20260131163149 (ensure_user_has_subscription).
--   -- 1
--   DROP FUNCTION IF EXISTS public.exigir_acesso_ao_usuario(uuid);
--   DROP FUNCTION IF EXISTS public.chamador_privilegiado();
-- =============================================================================

-- 1. Chamador ------------------------------------------------------------------

-- true para service_role (functions), pg_cron e conexões diretas ao banco (SQL editor, n8n com
-- credencial de banco). Requisições da API pública chegam como session_user = 'authenticator'.
CREATE OR REPLACE FUNCTION public.chamador_privilegiado()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(auth.role(), '') = 'service_role'
      OR session_user NOT IN ('authenticator', 'anon', 'authenticated');
$$;

COMMENT ON FUNCTION public.chamador_privilegiado() IS
  'true para service_role, pg_cron e conexões diretas; false para chamadas da API com JWT de usuário ou anon.';

-- Interrompe com 42501 se o chamador não for o próprio usuário nem privilegiado.
CREATE OR REPLACE FUNCTION public.exigir_acesso_ao_usuario(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR NOT (public.chamador_privilegiado() OR p_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- 2. Funções restritas ao backend ---------------------------------------------------

DO $$
DECLARE
  v_restritas text[] := ARRAY[
    'renew_subscription',
    'processar_receitas_recorrentes',
    'processar_despesas_recorrentes',
    'check_and_increment_rate_limit',
    'log_security_event',
    'log_financial_data_access',
    'log_bulk_financial_query',
    'check_user_exists',
    'check_auth_rate_limit',
    'check_financial_query_rate_limit',
    'check_sensitive_data_rate_limit',
    'cleanup_expired_ai_cache',
    'cleanup_expired_cache',
    'get_user_main_dashboard',
    'migrate_orphan_transactions_to_main_dashboard',
    'user_has_dashboard_access_secure',
    'validate_developer_key',
    'get_user_role',
    'encrypt_sensitive_data',
    'enviar_lembretes_financy',
    'verificar_usuarios_sem_transacao'
  ];
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS assinatura
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY (v_restritas)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.assinatura);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.assinatura);
  END LOOP;
END;
$$;

-- 3. Guardas nas RPCs usadas pelo front ------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_dashboard_data(
  p_user_id uuid,
  p_dashboard_id uuid,
  p_use_cache boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cache_key text;
  cached_result jsonb;
  result jsonb := '{}';
  receitas_data jsonb;
  despesas_data jsonb;
  impostos_data jsonb;
  metas_data jsonb;
BEGIN
  PERFORM public.exigir_acesso_ao_usuario(p_user_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.user_dashboards
    WHERE id = p_dashboard_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado ao dashboard';
  END IF;

  cache_key := 'dashboard_data_' || p_dashboard_id::text;
  IF p_use_cache THEN
    SELECT cached_data INTO cached_result
    FROM public.query_cache
    WHERE user_id = p_user_id AND query_key = cache_key AND expires_at > now();
    IF cached_result IS NOT NULL THEN
      RETURN cached_result;
    END IF;
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', r.id, 'data', r.data, 'descricao', r.descricao, 'categoria', r.categoria, 'valor', r.valor,
    'cliente', r.cliente, 'forma_pagamento', r.forma_pagamento, 'status', r.status))
  INTO receitas_data
  FROM (SELECT * FROM public.receitas r WHERE r.user_id = p_user_id AND r.dashboard_id = p_dashboard_id
        ORDER BY r.data DESC LIMIT 1000) r;

  SELECT jsonb_agg(jsonb_build_object(
    'id', d.id, 'data', d.data, 'descricao', d.descricao, 'categoria', d.categoria, 'valor', d.valor,
    'fornecedor', d.fornecedor, 'forma_pagamento', d.forma_pagamento, 'status', d.status))
  INTO despesas_data
  FROM (SELECT * FROM public.despesas d WHERE d.user_id = p_user_id AND d.dashboard_id = p_dashboard_id
        ORDER BY d.data DESC LIMIT 1000) d;

  SELECT jsonb_agg(jsonb_build_object(
    'id', i.id, 'descricao', i.descricao, 'tipo', i.tipo, 'valor', i.valor, 'vencimento', i.vencimento,
    'pago', i.pago, 'recorrente', i.recorrente))
  INTO impostos_data
  FROM (SELECT * FROM public.impostos i WHERE i.user_id = p_user_id AND i.dashboard_id = p_dashboard_id
        ORDER BY i.vencimento DESC LIMIT 500) i;

  SELECT jsonb_agg(jsonb_build_object(
    'id', m.id, 'titulo', m.titulo, 'valor_meta', m.valor_meta, 'valor_atual', m.valor_atual,
    'progresso', m.progresso, 'prazo', m.prazo, 'categoria', m.categoria, 'status', m.status, 'cor', m.cor))
  INTO metas_data
  FROM (SELECT * FROM public.metas m WHERE m.user_id = p_user_id AND m.dashboard_id = p_dashboard_id
        ORDER BY m.created_at DESC LIMIT 100) m;

  result := jsonb_build_object(
    'receitas', coalesce(receitas_data, '[]'::jsonb),
    'despesas', coalesce(despesas_data, '[]'::jsonb),
    'impostos', coalesce(impostos_data, '[]'::jsonb),
    'metas', coalesce(metas_data, '[]'::jsonb),
    'timestamp', extract(epoch FROM now())
  );

  INSERT INTO public.query_cache (user_id, query_key, cached_data)
  VALUES (p_user_id, cache_key, result)
  ON CONFLICT (user_id, query_key)
  DO UPDATE SET cached_data = EXCLUDED.cached_data, expires_at = now() + interval '10 minutes';

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_profile_data(user_id uuid)
RETURNS TABLE (user_type text, nome_preferido text, subscription_tier text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.exigir_acesso_ao_usuario(get_user_profile_data.user_id);
  RETURN QUERY
  SELECT
    coalesce(od.user_type, 'pessoal') AS user_type,
    coalesce(od.nome_preferido, p.nome_completo, split_part(p.email, '@', 1)) AS nome_preferido,
    coalesce(cs.plan_type, s.subscription_tier, 'free') AS subscription_tier
  FROM profiles p
  LEFT JOIN onboarding_data od ON p.id = od.user_id
  LEFT JOIN customer_subscriptions cs ON p.id = cs.user_id OR p.email = cs.email
  LEFT JOIN subscribers s ON p.id = s.user_id OR p.email = s.email
  WHERE p.id = get_user_profile_data.user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_feature(p_user_id uuid, p_feature text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor jsonb;
BEGIN
  PERFORM public.exigir_acesso_ao_usuario(p_user_id);

  SELECT us.features -> p_feature INTO v_valor
  FROM public.user_subscriptions us
  WHERE us.user_id = p_user_id
    AND us.status = 'active'
    AND (us.expires_at IS NULL OR us.expires_at > now());

  IF v_valor IS NULL THEN
    RETURN false;
  END IF;
  -- Booleano liga/desliga; número é limite (-1 = ilimitado, 0 = sem acesso).
  IF jsonb_typeof(v_valor) = 'boolean' THEN
    RETURN v_valor::text::boolean;
  END IF;
  IF jsonb_typeof(v_valor) = 'number' THEN
    RETURN (v_valor::text)::numeric > 0 OR (v_valor::text)::numeric = -1;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_subscription_limits(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_record record;
BEGIN
  PERFORM public.exigir_acesso_ao_usuario(p_user_id);

  SELECT * INTO subscription_record
  FROM public.user_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN '{"max_dashboards": 1, "ai_requests_per_month": 10, "team_members": 1}'::jsonb;
  END IF;

  RETURN subscription_record.features;
END;
$$;

-- 4. ensure_user_has_subscription sem a coluna inexistente -------------------------------

CREATE OR REPLACE FUNCTION public.ensure_user_has_subscription(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_criado_em timestamptz;
BEGIN
  PERFORM public.exigir_acesso_ao_usuario(p_user_id);

  IF EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = p_user_id) THEN
    RETURN true;
  END IF;

  SELECT email, created_at INTO v_email, v_criado_em FROM public.profiles WHERE id = p_user_id;
  IF v_email IS NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  END IF;

  -- Não existe plano gratuito: toda conta nasce aguardando pagamento.
  INSERT INTO public.user_subscriptions (
    user_id, email, subscription_type, plan_name, status, started_at, expires_at, amount, features
  ) VALUES (
    p_user_id, coalesce(v_email, ''), 'pending', 'Aguardando Pagamento', 'pending_payment',
    coalesce(v_criado_em, now()), coalesce(v_criado_em, now()), 0,
    '{"max_dashboards": 0, "ai_requests_per_month": 0, "team_members": 0}'::jsonb
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.security_audit_logs (user_id, action, table_name, risk_level, new_values)
  VALUES (p_user_id, 'AUTO_CREATE_PENDING_SUBSCRIPTION', 'user_subscriptions', 'low',
          jsonb_build_object('created_at', now()));

  RETURN true;
END;
$$;

-- Funções do front: só usuários autenticados (e o backend).
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS assinatura
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_dashboard_data', 'get_user_profile_data', 'user_has_feature',
                        'get_user_subscription_limits', 'ensure_user_has_subscription',
                        'exigir_acesso_ao_usuario')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.assinatura);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.assinatura);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chamador_privilegiado() TO anon, authenticated, service_role;

-- 5. Logs do webhook da Cakto: só administradores -----------------------------------------

DROP POLICY IF EXISTS "Developers can read cakto webhook logs" ON public.cakto_webhook_logs;
DROP POLICY IF EXISTS "Admins leem logs do webhook da Cakto" ON public.cakto_webhook_logs;
CREATE POLICY "Admins leem logs do webhook da Cakto"
  ON public.cakto_webhook_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
