-- =============================================================================
-- Paywall garantido pelo banco (AUDITORIA A-03, A-06)
-- =============================================================================
-- 1. public.tem_assinatura_ativa(uuid): a mesma regra do front
--    (supabase/functions/_shared/assinatura.ts → assinaturaAtiva). O n8n pode chamá-la com a
--    chave service_role para decidir se atende um telefone.
-- 2. Policies RESTRITIVAS de INSERT e UPDATE nas tabelas financeiras: sem assinatura ativa
--    o usuário não grava nem altera. SELECT e DELETE continuam livres para o dono (ler,
--    exportar e apagar os próprios dados — LGPD). service_role ignora RLS (functions, n8n).
-- 3. public.limite_de_dashboards(uuid) + trigger em user_dashboards: o primeiro dashboard é
--    sempre permitido; os demais respeitam features.max_dashboards gravado pelo webhook.
--    Dashboards que já existem acima do limite são preservados.
--
-- Idempotente. Não apaga nem altera dados.
--
-- REVERSÃO:
--   DROP TRIGGER IF EXISTS validar_limite_de_dashboards ON public.user_dashboards;
--   DROP FUNCTION IF EXISTS public.validar_limite_de_dashboards();
--   DROP FUNCTION IF EXISTS public.limite_de_dashboards(uuid);
--   -- para cada tabela em (receitas, despesas, impostos, metas, equipe_membros, categorias_personalizadas):
--   DROP POLICY IF EXISTS "Assinatura ativa para inserir" ON public.<tabela>;
--   DROP POLICY IF EXISTS "Assinatura ativa para alterar" ON public.<tabela>;
--   DROP FUNCTION IF EXISTS public.minha_assinatura_ativa();
--   DROP FUNCTION IF EXISTS public.tem_assinatura_ativa(uuid);
-- =============================================================================

-- 1. Assinatura ativa -----------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON public.subscribers (user_id);

CREATE OR REPLACE FUNCTION public.tem_assinatura_ativa(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_user_id IS NOT NULL
     AND (public.chamador_privilegiado() OR p_user_id = auth.uid())
     AND (
       EXISTS (
         SELECT 1 FROM public.subscribers s
         WHERE s.user_id = p_user_id AND s.subscription_tier = 'developer' AND s.subscribed
       )
       OR EXISTS (
         SELECT 1 FROM public.user_subscriptions us
         WHERE us.user_id = p_user_id
           AND us.status = 'active'
           AND (
             us.subscription_type = 'developer'
             OR (nullif(us.subscription_type, '') IS NOT NULL AND (us.expires_at IS NULL OR us.expires_at > now()))
           )
       )
     );
$$;

COMMENT ON FUNCTION public.tem_assinatura_ativa(uuid) IS
  'Assinatura ativa (mesma regra do front). Usuários só consultam a própria; service_role consulta qualquer uma.';

CREATE OR REPLACE FUNCTION public.minha_assinatura_ativa()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.tem_assinatura_ativa(auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.tem_assinatura_ativa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tem_assinatura_ativa(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.minha_assinatura_ativa() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.minha_assinatura_ativa() TO authenticated, service_role;

-- 2. Escrita financeira só com assinatura ativa -------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['receitas', 'despesas', 'impostos', 'metas', 'equipe_membros', 'categorias_personalizadas']
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Assinatura ativa para inserir', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated
         WITH CHECK ((SELECT public.minha_assinatura_ativa()))',
      'Assinatura ativa para inserir', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Assinatura ativa para alterar', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated
         USING ((SELECT public.minha_assinatura_ativa()))
         WITH CHECK ((SELECT public.minha_assinatura_ativa()))',
      'Assinatura ativa para alterar', t);
  END LOOP;
END;
$$;

-- 3. Limite de dashboards do plano ----------------------------------------------------------

-- Espelha supabase/functions/_shared/assinatura.ts → limiteDeDashboards (-1 = ilimitado).
CREATE OR REPLACE FUNCTION public.limite_de_dashboards(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assinatura record;
  v_gravado integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.subscribers s
             WHERE s.user_id = p_user_id AND s.subscription_tier = 'developer' AND s.subscribed) THEN
    RETURN -1;
  END IF;

  SELECT * INTO v_assinatura FROM public.user_subscriptions WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  IF v_assinatura.subscription_type = 'developer' AND v_assinatura.status = 'active' THEN
    RETURN -1;
  END IF;
  IF v_assinatura.status <> 'active'
     OR nullif(v_assinatura.subscription_type, '') IS NULL
     OR (v_assinatura.expires_at IS NOT NULL AND v_assinatura.expires_at <= now()) THEN
    RETURN 0;
  END IF;

  IF jsonb_typeof(v_assinatura.features -> 'max_dashboards') = 'number' THEN
    v_gravado := (v_assinatura.features ->> 'max_dashboards')::numeric::integer;
    IF v_gravado <> 0 THEN
      RETURN v_gravado;
    END IF;
  END IF;

  -- Registros sem features: limites do catálogo (supabase/functions/_shared/planos.ts).
  RETURN CASE
    WHEN v_assinatura.plan_id LIKE 'personal_pro_%' OR v_assinatura.plan_name ILIKE 'Pro Pessoal%' THEN 3
    WHEN v_assinatura.plan_id LIKE 'business_pro_%' OR v_assinatura.plan_name ILIKE 'PRO Empresarial%' THEN 2
    WHEN v_assinatura.plan_id LIKE 'business_enterprise_%' OR v_assinatura.plan_name ILIKE 'Super Company%' THEN 10
    ELSE 1
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.limite_de_dashboards(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.limite_de_dashboards(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.validar_limite_de_dashboards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quantidade integer;
  v_limite integer;
BEGIN
  -- Serializa criações simultâneas do mesmo usuário.
  PERFORM pg_advisory_xact_lock(hashtext('user_dashboards:' || NEW.user_id::text));

  SELECT count(*) INTO v_quantidade FROM public.user_dashboards WHERE user_id = NEW.user_id;
  -- O primeiro dashboard é sempre permitido (triggers de lançamento e onboarding dependem disso).
  IF v_quantidade = 0 OR public.chamador_privilegiado() THEN
    RETURN NEW;
  END IF;

  v_limite := public.limite_de_dashboards(NEW.user_id);
  IF v_limite <> -1 AND v_quantidade >= v_limite THEN
    RAISE EXCEPTION 'Seu plano permite % perfil(is)/empresa(s).', greatest(v_limite, 0)
      USING ERRCODE = 'P0001', HINT = 'LIMITE_DASHBOARDS';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_limite_de_dashboards ON public.user_dashboards;
CREATE TRIGGER validar_limite_de_dashboards
  BEFORE INSERT ON public.user_dashboards
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_limite_de_dashboards();
