-- =============================================================================
-- Onboarding atômico, exclusões transacionais e índices (AUDITORIA A-26, A-28, A-30, A-35)
-- =============================================================================
-- 1. public.concluir_onboarding(jsonb): conclui o onboarding numa única transação (dashboard padrão
--    com o tipo escolhido, telefone, onboarding_data, gastos iniciais e meta). É a única escrita
--    financeira permitida antes do pagamento (o paywall bloqueia inserts diretos) e só roda uma vez.
-- 2. public.excluir_dashboard(uuid): apaga um dashboard não padrão e tudo que pertence a ele
--    (lançamentos, impostos, metas, equipe e categorias do dashboard) numa transação.
-- 3. public.apagar_meus_dados(): mesma lista que a tela de Configurações já apagava, agora numa
--    transação, incluindo as sessões do assistente de IA. Assinatura e logs de auditoria ficam.
-- 4. Índices compostos que a migração 20250918173518 nunca criou (CONCURRENTLY em transação).
--
-- Idempotente. Não altera dados existentes.
--
-- REVERSÃO:
--   DROP FUNCTION IF EXISTS public.apagar_meus_dados();
--   DROP FUNCTION IF EXISTS public.excluir_dashboard(uuid);
--   DROP FUNCTION IF EXISTS public.concluir_onboarding(jsonb);
--   DROP INDEX IF EXISTS public.idx_receitas_user_dashboard_data, public.idx_despesas_user_dashboard_data,
--     public.idx_impostos_user_dashboard_vencimento, public.idx_metas_user_dashboard,
--     public.idx_categorias_personalizadas_user, public.idx_ai_chat_sessions_dashboard;
-- =============================================================================

-- 1. Onboarding ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.concluir_onboarding(p_dados jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tipo_usuario text := coalesce(nullif(p_dados ->> 'user_type', ''), 'pessoal');
  v_tipo_dashboard text;
  v_nome_preferido text := left(nullif(trim(p_dados ->> 'nome_preferido'), ''), 120);
  v_nome_empresa text := left(nullif(trim(p_dados ->> 'nome_empresa'), ''), 120);
  v_nome_dashboard text;
  v_telefone text := nullif(trim(p_dados ->> 'whatsapp'), '');
  v_dashboard uuid;
  v_dashboard_vazio boolean;
  v_gasto jsonb;
  v_valor numeric;
  v_meses integer;
  v_valor_meta numeric;
  v_hoje date := public.hoje_brasil();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;
  IF v_tipo_usuario NOT IN ('pessoal', 'empresarial') THEN
    RAISE EXCEPTION 'Tipo de usuário inválido' USING ERRCODE = '22023';
  END IF;

  -- Idempotente: concluir de novo não duplica gastos nem metas.
  IF EXISTS (SELECT 1 FROM public.onboarding_data WHERE user_id = v_uid) THEN
    SELECT id INTO v_dashboard FROM public.user_dashboards WHERE user_id = v_uid AND is_default LIMIT 1;
    RETURN jsonb_build_object('dashboard_id', v_dashboard, 'ja_concluido', true);
  END IF;

  v_tipo_dashboard := CASE WHEN v_tipo_usuario = 'empresarial' THEN 'business' ELSE 'personal' END;
  v_nome_dashboard := coalesce(CASE WHEN v_tipo_usuario = 'empresarial' THEN v_nome_empresa END,
                               v_nome_preferido, 'Perfil Principal');

  PERFORM pg_advisory_xact_lock(hashtext('user_dashboards:' || v_uid::text));
  SELECT id INTO v_dashboard FROM public.user_dashboards WHERE user_id = v_uid AND is_default LIMIT 1;

  IF v_dashboard IS NULL THEN
    INSERT INTO public.user_dashboards (user_id, name, type, is_default)
    VALUES (v_uid, v_nome_dashboard, v_tipo_dashboard, true)
    RETURNING id INTO v_dashboard;
  ELSE
    -- O app cria um dashboard padrão ao entrar, antes do onboarding. Enquanto ele está vazio,
    -- assume o tipo e o nome escolhidos aqui (antes todo usuário PF ficava com dashboard PJ).
    v_dashboard_vazio := NOT EXISTS (SELECT 1 FROM public.receitas WHERE dashboard_id = v_dashboard)
      AND NOT EXISTS (SELECT 1 FROM public.despesas WHERE dashboard_id = v_dashboard)
      AND NOT EXISTS (SELECT 1 FROM public.impostos WHERE dashboard_id = v_dashboard)
      AND NOT EXISTS (SELECT 1 FROM public.metas WHERE dashboard_id = v_dashboard)
      AND NOT EXISTS (SELECT 1 FROM public.equipe_membros WHERE dashboard_id = v_dashboard);
    IF v_dashboard_vazio THEN
      UPDATE public.user_dashboards
      SET type = v_tipo_dashboard,
          name = CASE WHEN EXISTS (SELECT 1 FROM public.user_dashboards
                                   WHERE user_id = v_uid AND name = v_nome_dashboard AND id <> v_dashboard)
                      THEN name ELSE v_nome_dashboard END
      WHERE id = v_dashboard;
    ELSIF v_tipo_usuario = 'empresarial' AND v_nome_empresa IS NOT NULL THEN
      UPDATE public.user_dashboards SET name = v_nome_empresa
      WHERE id = v_dashboard
        AND NOT EXISTS (SELECT 1 FROM public.user_dashboards WHERE user_id = v_uid AND name = v_nome_empresa AND id <> v_dashboard);
    END IF;
  END IF;

  IF v_telefone IS NOT NULL THEN
    BEGIN
      UPDATE public.profiles
      SET telefone = v_telefone,
          nome_completo = coalesce(v_nome_preferido, nome_completo)
      WHERE id = v_uid;
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'Este número de telefone já está cadastrado' USING ERRCODE = '23505';
    END;
  END IF;

  INSERT INTO public.onboarding_data (
    user_id, user_type, how_did_you_know, salary_range, revenue_range, nome_preferido, termos_aceitos,
    saldo_conta, saldo_carteira, dividas_atuais, receita_extra
  ) VALUES (
    v_uid, v_tipo_usuario, nullif(p_dados ->> 'how_did_you_know', ''), nullif(p_dados ->> 'salary_range', ''),
    nullif(p_dados ->> 'revenue_range', ''), v_nome_preferido, coalesce((p_dados ->> 'termos_aceitos')::boolean, false),
    (p_dados ->> 'saldo_conta')::numeric, (p_dados ->> 'saldo_carteira')::numeric,
    (p_dados ->> 'dividas_atuais')::numeric, (p_dados ->> 'receita_mensal')::numeric
  );

  IF jsonb_typeof(p_dados -> 'gastos_iniciais') = 'array' THEN
    FOR v_gasto IN SELECT value FROM jsonb_array_elements(p_dados -> 'gastos_iniciais') LIMIT 50 LOOP
      v_valor := nullif(v_gasto ->> 'valor_mensal', '')::numeric;
      CONTINUE WHEN v_valor IS NULL OR v_valor <= 0 OR v_valor > 99999999
                 OR nullif(trim(v_gasto ->> 'descricao'), '') IS NULL;
      INSERT INTO public.despesas (user_id, dashboard_id, data, valor, descricao, categoria, forma_pagamento, fornecedor)
      VALUES (v_uid, v_dashboard, v_hoje, round(v_valor, 2), left(trim(v_gasto ->> 'descricao'), 200),
              coalesce(nullif(v_gasto ->> 'categoria', ''), 'outros'),
              coalesce(nullif(v_gasto ->> 'forma_pagamento', ''), 'pix'), '');
    END LOOP;
  END IF;

  v_valor_meta := nullif(p_dados ->> 'valor_meta', '')::numeric;
  IF nullif(trim(p_dados ->> 'meta_financeira'), '') IS NOT NULL AND v_valor_meta > 0 THEN
    v_meses := CASE p_dados ->> 'prazo_meta'
      WHEN '3-meses' THEN 3 WHEN '6-meses' THEN 6 WHEN '1-ano' THEN 12 WHEN '2-anos' THEN 24 WHEN '5-anos' THEN 60
      ELSE 12 END;
    INSERT INTO public.metas (user_id, dashboard_id, titulo, categoria, valor_meta, valor_atual, prazo, progresso, status)
    VALUES (v_uid, v_dashboard, left(trim(p_dados ->> 'meta_financeira'), 200), 'Financeira', round(v_valor_meta, 2), 0,
            (v_hoje + make_interval(months => v_meses))::date, 0, 'em_andamento');
  END IF;

  RETURN jsonb_build_object('dashboard_id', v_dashboard, 'ja_concluido', false);
END;
$$;

-- 2. Excluir dashboard -----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.excluir_dashboard(p_dashboard_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dashboard record;
BEGIN
  SELECT * INTO v_dashboard FROM public.user_dashboards WHERE id = p_dashboard_id;
  IF NOT FOUND OR v_dashboard.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Dashboard não encontrado' USING ERRCODE = '42501';
  END IF;
  IF v_dashboard.is_default THEN
    RAISE EXCEPTION 'O dashboard principal não pode ser excluído' USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.receitas WHERE dashboard_id = p_dashboard_id AND user_id = v_dashboard.user_id;
  DELETE FROM public.despesas WHERE dashboard_id = p_dashboard_id AND user_id = v_dashboard.user_id;
  DELETE FROM public.impostos WHERE dashboard_id = p_dashboard_id AND user_id = v_dashboard.user_id;
  DELETE FROM public.metas WHERE dashboard_id = p_dashboard_id AND user_id = v_dashboard.user_id;
  DELETE FROM public.equipe_membros WHERE dashboard_id = p_dashboard_id AND user_id = v_dashboard.user_id;
  DELETE FROM public.categorias_personalizadas WHERE dashboard_id = p_dashboard_id AND user_id = v_dashboard.user_id;
  DELETE FROM public.user_dashboards WHERE id = p_dashboard_id;
END;
$$;

-- 3. Apagar meus dados ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.apagar_meus_dados()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  t text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  -- Mantidos: profiles (registro), user_subscriptions/subscribers/customer_subscriptions (cobrança),
  -- security_audit_logs, cakto_webhook_logs e conversas de suporte (atendimento).
  FOREACH t IN ARRAY ARRAY[
    'receitas', 'despesas', 'impostos', 'metas', 'equipe_membros', 'equipe_membros_audit',
    'categorias_personalizadas', 'ai_recognized_transactions', 'ai_conversations', 'ai_chat_sessions',
    'ai_context_cache', 'notificacoes', 'section_tutorials', 'user_tour_progress', 'onboarding_data',
    'query_cache', 'validacao_n8n', 'user_dashboards'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I WHERE user_id = $1', t) USING v_uid;
    END IF;
  END LOOP;

  UPDATE public.profiles SET settings = NULL, telefone = NULL, nome_completo = NULL WHERE id = v_uid;
END;
$$;

DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS assinatura
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('concluir_onboarding', 'excluir_dashboard', 'apagar_meus_dados')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.assinatura);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.assinatura);
  END LOOP;
END;
$$;

-- 4. Índices -----------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_receitas_user_dashboard_data ON public.receitas (user_id, dashboard_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_despesas_user_dashboard_data ON public.despesas (user_id, dashboard_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_impostos_user_dashboard_vencimento ON public.impostos (user_id, dashboard_id, vencimento);
CREATE INDEX IF NOT EXISTS idx_metas_user_dashboard ON public.metas (user_id, dashboard_id);
CREATE INDEX IF NOT EXISTS idx_categorias_personalizadas_user ON public.categorias_personalizadas (user_id, ativo);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_dashboard ON public.ai_chat_sessions (dashboard_id);
