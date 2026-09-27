-- =============================================================================
-- Recorrências confiáveis (AUDITORIA A-10, A-15)
-- =============================================================================
-- 1. Colunas: receitas/despesas.configuracao_recorrencia (já existe em produção, criada fora das
--    migrações) e impostos.valor_tipo/tipo_recorrencia/proxima_data (o percentual e a
--    periodicidade do imposto nunca eram gravados).
-- 2. public.hoje_brasil() e public.proxima_ocorrencia(data, tipo, dia_ancora), espelho de
--    supabase/functions/_shared/recorrencia.ts; calcular_proxima_data mantém a assinatura e ganha
--    quinzenal, bimestral, trimestral, semestral e anual (antes 'anual' devolvia NULL).
-- 3. Geração: todas as ocorrências vencidas até hoje (Brasília) — antes era uma por chamada —,
--    dia-âncora preservado (31/01 → 28/02 → 31/03) e linhas travadas (FOR UPDATE SKIP LOCKED)
--    para o cron e o app não gerarem em dobro. Mesmo formato de antes: cópia com " (Recorrente)",
--    status 'paga'. Impostos recorrentes geram a próxima obrigação (pago = false) com até um
--    período de antecedência.
-- 4. processar_transacoes_recorrentes_usuario só processa o próprio usuário (ou o backend).
-- 5. Job 'process-recurring-transactions' passa a chamar o SQL direto às 03:01 UTC (00:01 de
--    Brasília). Antes chamava a edge function com a chave anon, recebia 401 e foi desagendado
--    em 20260515014327.
--
-- Idempotente. Não apaga dados.
--
-- REVERSÃO:
--   SELECT cron.unschedule('process-recurring-transactions');
--   -- reaplicar calcular_proxima_data de 20250827211620 e processar_* de 20251015180503/20251211000507
--   DROP FUNCTION IF EXISTS public.processar_impostos_recorrentes();
--   DROP FUNCTION IF EXISTS public._gerar_recorrencias_impostos(uuid);
--   DROP FUNCTION IF EXISTS public._gerar_recorrencias_despesas(uuid);
--   DROP FUNCTION IF EXISTS public._gerar_recorrencias_receitas(uuid);
--   DROP FUNCTION IF EXISTS public.proxima_ocorrencia(date, text, integer);
--   DROP FUNCTION IF EXISTS public.hoje_brasil();
--   -- as colunas novas de impostos podem ficar (não são lidas pelo código antigo)
-- =============================================================================

-- 1. Colunas ----------------------------------------------------------------------------

ALTER TABLE public.receitas ADD COLUMN IF NOT EXISTS configuracao_recorrencia jsonb;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS configuracao_recorrencia jsonb;

ALTER TABLE public.impostos
  ADD COLUMN IF NOT EXISTS valor_tipo text NOT NULL DEFAULT 'fixo',
  ADD COLUMN IF NOT EXISTS tipo_recorrencia text,
  ADD COLUMN IF NOT EXISTS proxima_data date;

DO $$ BEGIN
  ALTER TABLE public.impostos
    ADD CONSTRAINT impostos_valor_tipo_check CHECK (valor_tipo IN ('fixo', 'porcentagem'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.impostos.valor_tipo IS 'fixo = valor em reais; porcentagem = alíquota sobre as receitas do período';

CREATE INDEX IF NOT EXISTS idx_receitas_recorrentes ON public.receitas (proxima_data) WHERE recorrente;
CREATE INDEX IF NOT EXISTS idx_despesas_recorrentes ON public.despesas (proxima_data) WHERE recorrente;
CREATE INDEX IF NOT EXISTS idx_impostos_recorrentes ON public.impostos (proxima_data) WHERE recorrente;

-- 2. Datas ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.hoje_brasil()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date;
$$;

CREATE OR REPLACE FUNCTION public.proxima_ocorrencia(p_data date, p_tipo text, p_dia_ancora integer DEFAULT NULL)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_meses integer;
  v_base date;
  v_ultimo_dia integer;
BEGIN
  IF p_data IS NULL THEN
    RETURN NULL;
  END IF;
  CASE p_tipo
    WHEN 'diaria' THEN RETURN p_data + 1;
    WHEN 'semanal' THEN RETURN p_data + 7;
    WHEN 'quinzenal' THEN RETURN p_data + 15;
    WHEN 'mensal' THEN v_meses := 1;
    WHEN 'bimestral' THEN v_meses := 2;
    WHEN 'trimestral' THEN v_meses := 3;
    WHEN 'semestral' THEN v_meses := 6;
    WHEN 'anual' THEN v_meses := 12;
    ELSE RETURN NULL;
  END CASE;
  v_base := (date_trunc('month', p_data) + make_interval(months => v_meses))::date;
  v_ultimo_dia := extract(day FROM (v_base + interval '1 month' - interval '1 day'))::integer;
  RETURN v_base + (least(coalesce(p_dia_ancora, extract(day FROM p_data)::integer), v_ultimo_dia) - 1);
END;
$$;

-- Mesma assinatura de antes (contrato); sem âncora equivale ao comportamento anterior.
CREATE OR REPLACE FUNCTION public.calcular_proxima_data(data_atual date, tipo text)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT public.proxima_ocorrencia(data_atual, tipo, NULL);
$$;

-- 3. Geração ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._gerar_recorrencias_receitas(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_hoje date := public.hoje_brasil();
  v_proxima date;
  v_ancora integer;
  v_dashboard uuid;
  v_total integer := 0;
  v_geradas integer;
BEGIN
  FOR r IN
    SELECT * FROM public.receitas
    WHERE recorrente = true
      AND proxima_data IS NOT NULL
      AND proxima_data <= v_hoje
      AND (p_user_id IS NULL OR user_id = p_user_id)
    ORDER BY proxima_data
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      v_ancora := coalesce((r.configuracao_recorrencia ->> 'dia_ancora')::integer, extract(day FROM r.proxima_data)::integer);
      v_dashboard := coalesce(r.dashboard_id, public.get_user_main_dashboard(r.user_id));
      v_proxima := r.proxima_data;
      v_geradas := 0;
      WHILE v_proxima IS NOT NULL AND v_proxima <= v_hoje AND v_geradas < 400 LOOP
        INSERT INTO public.receitas (
          user_id, data, valor, categoria, cliente, forma_pagamento, descricao, dashboard_id,
          categoria_personalizada, status
        ) VALUES (
          r.user_id, v_proxima, r.valor, r.categoria, r.cliente, r.forma_pagamento,
          r.descricao || ' (Recorrente)', v_dashboard, r.categoria_personalizada, 'paga'
        );
        v_geradas := v_geradas + 1;
        v_proxima := public.proxima_ocorrencia(v_proxima, r.tipo_recorrencia, v_ancora);
      END LOOP;
      UPDATE public.receitas
      SET proxima_data = v_proxima,
          configuracao_recorrencia = coalesce(configuracao_recorrencia, '{}'::jsonb) || jsonb_build_object('dia_ancora', v_ancora)
      WHERE id = r.id;
      v_total := v_total + v_geradas;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Recorrência de receita % não processada: %', r.id, SQLERRM;
    END;
  END LOOP;
  RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION public._gerar_recorrencias_despesas(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_hoje date := public.hoje_brasil();
  v_proxima date;
  v_ancora integer;
  v_dashboard uuid;
  v_total integer := 0;
  v_geradas integer;
BEGIN
  FOR r IN
    SELECT * FROM public.despesas
    WHERE recorrente = true
      AND proxima_data IS NOT NULL
      AND proxima_data <= v_hoje
      AND (p_user_id IS NULL OR user_id = p_user_id)
    ORDER BY proxima_data
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      v_ancora := coalesce((r.configuracao_recorrencia ->> 'dia_ancora')::integer, extract(day FROM r.proxima_data)::integer);
      v_dashboard := coalesce(r.dashboard_id, public.get_user_main_dashboard(r.user_id));
      v_proxima := r.proxima_data;
      v_geradas := 0;
      WHILE v_proxima IS NOT NULL AND v_proxima <= v_hoje AND v_geradas < 400 LOOP
        INSERT INTO public.despesas (
          user_id, data, valor, categoria, fornecedor, forma_pagamento, descricao, dashboard_id,
          categoria_personalizada, status
        ) VALUES (
          r.user_id, v_proxima, r.valor, r.categoria, r.fornecedor, r.forma_pagamento,
          r.descricao || ' (Recorrente)', v_dashboard, r.categoria_personalizada, 'paga'
        );
        v_geradas := v_geradas + 1;
        v_proxima := public.proxima_ocorrencia(v_proxima, r.tipo_recorrencia, v_ancora);
      END LOOP;
      UPDATE public.despesas
      SET proxima_data = v_proxima,
          configuracao_recorrencia = coalesce(configuracao_recorrencia, '{}'::jsonb) || jsonb_build_object('dia_ancora', v_ancora)
      WHERE id = r.id;
      v_total := v_total + v_geradas;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Recorrência de despesa % não processada: %', r.id, SQLERRM;
    END;
  END LOOP;
  RETURN v_total;
END;
$$;

-- Impostos/taxas recorrentes: a próxima obrigação aparece até um período antes do vencimento.
-- Registros antigos (sem tipo_recorrencia/proxima_data) não geram nada, como antes.
CREATE OR REPLACE FUNCTION public._gerar_recorrencias_impostos(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_hoje date := public.hoje_brasil();
  v_proxima date;
  v_ancora integer;
  v_limite date;
  v_total integer := 0;
  v_geradas integer;
BEGIN
  FOR r IN
    SELECT * FROM public.impostos
    WHERE recorrente = true
      AND proxima_data IS NOT NULL
      AND tipo_recorrencia IS NOT NULL
      AND (p_user_id IS NULL OR user_id = p_user_id)
    ORDER BY proxima_data
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      v_ancora := extract(day FROM r.vencimento)::integer;
      v_limite := public.proxima_ocorrencia(v_hoje, r.tipo_recorrencia, v_ancora);
      v_proxima := r.proxima_data;
      v_geradas := 0;
      WHILE v_proxima IS NOT NULL AND v_limite IS NOT NULL AND v_proxima <= v_limite AND v_geradas < 400 LOOP
        INSERT INTO public.impostos (
          user_id, dashboard_id, tipo, descricao, valor, valor_tipo, vencimento, pago, recorrente
        ) VALUES (
          r.user_id, r.dashboard_id, r.tipo, r.descricao, r.valor, r.valor_tipo, v_proxima, false, false
        );
        v_geradas := v_geradas + 1;
        v_proxima := public.proxima_ocorrencia(v_proxima, r.tipo_recorrencia, v_ancora);
      END LOOP;
      IF v_geradas > 0 THEN
        UPDATE public.impostos SET proxima_data = v_proxima WHERE id = r.id;
      END IF;
      v_total := v_total + v_geradas;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Recorrência de imposto % não processada: %', r.id, SQLERRM;
    END;
  END LOOP;
  RETURN v_total;
END;
$$;

-- Mesmas assinaturas de antes (cron, n8n): processam todos os usuários.
CREATE OR REPLACE FUNCTION public.processar_receitas_recorrentes()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public._gerar_recorrencias_receitas(NULL);
$$;

CREATE OR REPLACE FUNCTION public.processar_despesas_recorrentes()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public._gerar_recorrencias_despesas(NULL);
$$;

CREATE OR REPLACE FUNCTION public.processar_impostos_recorrentes()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public._gerar_recorrencias_impostos(NULL);
$$;

-- 4. Processamento sob demanda (app) --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.processar_transacoes_recorrentes_usuario(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receitas integer;
  v_despesas integer;
  v_impostos integer;
BEGIN
  PERFORM public.exigir_acesso_ao_usuario(p_user_id);
  v_receitas := public._gerar_recorrencias_receitas(p_user_id);
  v_despesas := public._gerar_recorrencias_despesas(p_user_id);
  v_impostos := public._gerar_recorrencias_impostos(p_user_id);
  RETURN jsonb_build_object(
    'receitas_processadas', v_receitas,
    'despesas_processadas', v_despesas,
    'impostos_processados', v_impostos,
    'total', v_receitas + v_despesas + v_impostos
  );
END;
$$;

DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS assinatura, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('_gerar_recorrencias_receitas', '_gerar_recorrencias_despesas', '_gerar_recorrencias_impostos',
                        'processar_receitas_recorrentes', 'processar_despesas_recorrentes', 'processar_impostos_recorrentes',
                        'processar_transacoes_recorrentes_usuario')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.assinatura);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.assinatura);
    IF f.proname = 'processar_transacoes_recorrentes_usuario' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.assinatura);
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hoje_brasil() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.proxima_ocorrencia(date, text, integer) TO anon, authenticated, service_role;

-- 5. Cron -------------------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regnamespace('cron') IS NULL THEN
    RAISE NOTICE 'pg_cron indisponível: job de recorrências não agendado';
    RETURN;
  END IF;
  PERFORM cron.unschedule(jobname) FROM cron.job WHERE jobname = 'process-recurring-transactions';
  PERFORM cron.schedule(
    'process-recurring-transactions',
    '1 3 * * *',
    'SELECT public.processar_receitas_recorrentes(), public.processar_despesas_recorrentes(), public.processar_impostos_recorrentes();'
  );
END;
$$;
