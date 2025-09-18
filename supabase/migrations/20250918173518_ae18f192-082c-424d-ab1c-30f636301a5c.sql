-- =============================================
-- CORREÇÕES DE SEGURANÇA E OTIMIZAÇÕES
-- =============================================

-- 1. CRIAR SISTEMA DE MASCARAMENTO DE DADOS SENSÍVEIS
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(input_text text, mask_type text DEFAULT 'partial')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE mask_type
    WHEN 'email' THEN
      RETURN CASE 
        WHEN input_text IS NULL THEN NULL
        WHEN length(input_text) <= 3 THEN '***'
        ELSE substring(input_text, 1, 2) || '***@' || split_part(input_text, '@', 2)
      END;
    WHEN 'phone' THEN
      RETURN CASE 
        WHEN input_text IS NULL THEN NULL
        WHEN length(input_text) <= 4 THEN '***'
        ELSE '***-***-' || right(input_text, 4)
      END;
    WHEN 'salary' THEN
      RETURN CASE 
        WHEN input_text IS NULL THEN NULL
        ELSE 'R$ ***'
      END;
    ELSE
      RETURN CASE 
        WHEN input_text IS NULL THEN NULL
        WHEN length(input_text) <= 3 THEN '***'
        ELSE left(input_text, 2) || '***'
      END;
  END CASE;
END;
$$;

-- 2. MELHORAR PERFORMANCE COM ÍNDICES ESTRATÉGICOS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_receitas_user_dashboard_data 
  ON public.receitas (user_id, dashboard_id, data DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_despesas_user_dashboard_data 
  ON public.despesas (user_id, dashboard_id, data DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_impostos_user_dashboard_vencimento 
  ON public.impostos (user_id, dashboard_id, vencimento DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metas_user_dashboard_status 
  ON public.metas (user_id, dashboard_id, status);

-- 3. SISTEMA DE AUDITORIA APRIMORADO
CREATE OR REPLACE FUNCTION public.enhanced_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  risk_level text := 'low';
  change_summary jsonb := '{}';
BEGIN
  -- Determinar nível de risco baseado na operação e valores
  IF TG_OP = 'DELETE' THEN
    risk_level := 'high';
    change_summary := jsonb_build_object('action', 'DELETE', 'deleted_record', to_jsonb(OLD));
  ELSIF TG_OP = 'INSERT' THEN
    risk_level := 'medium';
    change_summary := jsonb_build_object('action', 'INSERT', 'new_record', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    -- Verificar mudanças sensíveis (salário, dados financeiros)
    IF TG_TABLE_NAME = 'equipe_membros' AND (OLD.salario IS DISTINCT FROM NEW.salario) THEN
      risk_level := 'high';
    END IF;
    
    change_summary := jsonb_build_object(
      'action', 'UPDATE',
      'old_values', to_jsonb(OLD),
      'new_values', to_jsonb(NEW)
    );
  END IF;

  -- Log da auditoria
  PERFORM public.log_security_event(
    COALESCE(NEW.user_id, OLD.user_id),
    TG_OP || '_' || upper(TG_TABLE_NAME),
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    risk_level
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. APLICAR TRIGGERS DE AUDITORIA NAS TABELAS CRÍTICAS
DROP TRIGGER IF EXISTS enhanced_audit_receitas ON public.receitas;
CREATE TRIGGER enhanced_audit_receitas
  AFTER INSERT OR UPDATE OR DELETE ON public.receitas
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger();

DROP TRIGGER IF EXISTS enhanced_audit_despesas ON public.despesas;
CREATE TRIGGER enhanced_audit_despesas
  AFTER INSERT OR UPDATE OR DELETE ON public.despesas
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger();

DROP TRIGGER IF EXISTS enhanced_audit_impostos ON public.impostos;
CREATE TRIGGER enhanced_audit_impostos
  AFTER INSERT OR UPDATE OR DELETE ON public.impostos
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger();

DROP TRIGGER IF EXISTS enhanced_audit_metas ON public.metas;
CREATE TRIGGER enhanced_audit_metas
  AFTER INSERT OR UPDATE OR DELETE ON public.metas
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger();

-- 5. SISTEMA DE CACHE INTELIGENTE
CREATE TABLE IF NOT EXISTS public.query_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  query_key text NOT NULL,
  cached_data jsonb NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamp with time zone DEFAULT now(),
  
  UNIQUE(user_id, query_key)
);

-- Enable RLS
ALTER TABLE public.query_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies for cache
CREATE POLICY "Users can manage their own cache" ON public.query_cache
FOR ALL USING (auth.uid() = user_id);

-- Cleanup function for expired cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.query_cache WHERE expires_at < now();
$$;

-- 6. FUNÇÃO OTIMIZADA PARA BUSCA DE DADOS DO DASHBOARD
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
  -- Verificar autorização
  IF NOT EXISTS (
    SELECT 1 FROM public.user_dashboards 
    WHERE id = p_dashboard_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado ao dashboard';
  END IF;

  -- Tentar cache primeiro
  IF p_use_cache THEN
    cache_key := 'dashboard_data_' || p_dashboard_id::text;
    
    SELECT cached_data INTO cached_result
    FROM public.query_cache
    WHERE user_id = p_user_id AND query_key = cache_key AND expires_at > now();
    
    IF cached_result IS NOT NULL THEN
      RETURN cached_result;
    END IF;
  END IF;

  -- Buscar dados otimizados
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'data', r.data,
      'descricao', r.descricao,
      'categoria', r.categoria,
      'valor', r.valor,
      'cliente', r.cliente,
      'forma_pagamento', r.forma_pagamento,
      'status', r.status
    )
  ) INTO receitas_data
  FROM public.receitas r
  WHERE r.user_id = p_user_id AND r.dashboard_id = p_dashboard_id
  ORDER BY r.data DESC
  LIMIT 1000;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', d.id,
      'data', d.data,
      'descricao', d.descricao,
      'categoria', d.categoria,
      'valor', d.valor,
      'fornecedor', d.fornecedor,
      'forma_pagamento', d.forma_pagamento,
      'status', d.status
    )
  ) INTO despesas_data
  FROM public.despesas d
  WHERE d.user_id = p_user_id AND d.dashboard_id = p_dashboard_id
  ORDER BY d.data DESC
  LIMIT 1000;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'descricao', i.descricao,
      'tipo', i.tipo,
      'valor', i.valor,
      'vencimento', i.vencimento,
      'pago', i.pago,
      'recorrente', i.recorrente
    )
  ) INTO impostos_data
  FROM public.impostos i
  WHERE i.user_id = p_user_id AND i.dashboard_id = p_dashboard_id
  ORDER BY i.vencimento DESC
  LIMIT 500;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'titulo', m.titulo,
      'valor_meta', m.valor_meta,
      'valor_atual', m.valor_atual,
      'progresso', m.progresso,
      'prazo', m.prazo,
      'categoria', m.categoria,
      'status', m.status,
      'cor', m.cor
    )
  ) INTO metas_data
  FROM public.metas m
  WHERE m.user_id = p_user_id AND m.dashboard_id = p_dashboard_id
  ORDER BY m.created_at DESC
  LIMIT 100;

  -- Construir resultado
  result := jsonb_build_object(
    'receitas', COALESCE(receitas_data, '[]'::jsonb),
    'despesas', COALESCE(despesas_data, '[]'::jsonb),
    'impostos', COALESCE(impostos_data, '[]'::jsonb),
    'metas', COALESCE(metas_data, '[]'::jsonb),
    'timestamp', extract(epoch from now())
  );

  -- Salvar no cache
  INSERT INTO public.query_cache (user_id, query_key, cached_data)
  VALUES (p_user_id, cache_key, result)
  ON CONFLICT (user_id, query_key) 
  DO UPDATE SET 
    cached_data = EXCLUDED.cached_data,
    expires_at = now() + interval '10 minutes';

  RETURN result;
END;
$$;

-- 7. FUNÇÃO PARA ESTATÍSTICAS DO DASHBOARD
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_user_id uuid,
  p_dashboard_id uuid,
  p_period_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stats jsonb;
  total_receitas numeric := 0;
  total_despesas numeric := 0;
  total_impostos_pagos numeric := 0;
  total_metas_concluidas integer := 0;
  total_metas integer := 0;
  period_start date;
BEGIN
  -- Verificar autorização
  IF NOT EXISTS (
    SELECT 1 FROM public.user_dashboards 
    WHERE id = p_dashboard_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado ao dashboard';
  END IF;

  period_start := CURRENT_DATE - p_period_days;

  -- Calcular estatísticas
  SELECT COALESCE(SUM(valor), 0) INTO total_receitas
  FROM public.receitas
  WHERE user_id = p_user_id 
    AND dashboard_id = p_dashboard_id 
    AND data >= period_start;

  SELECT COALESCE(SUM(valor), 0) INTO total_despesas
  FROM public.despesas
  WHERE user_id = p_user_id 
    AND dashboard_id = p_dashboard_id 
    AND data >= period_start;

  SELECT COALESCE(SUM(valor), 0) INTO total_impostos_pagos
  FROM public.impostos
  WHERE user_id = p_user_id 
    AND dashboard_id = p_dashboard_id 
    AND pago = true
    AND vencimento >= period_start;

  SELECT 
    COUNT(*) FILTER (WHERE status = 'concluida'),
    COUNT(*)
  INTO total_metas_concluidas, total_metas
  FROM public.metas
  WHERE user_id = p_user_id AND dashboard_id = p_dashboard_id;

  -- Construir resultado
  stats := jsonb_build_object(
    'period_days', p_period_days,
    'total_receitas', total_receitas,
    'total_despesas', total_despesas,
    'total_impostos_pagos', total_impostos_pagos,
    'lucro_liquido', total_receitas - total_despesas - total_impostos_pagos,
    'margem_lucro', CASE 
      WHEN total_receitas > 0 THEN 
        ROUND(((total_receitas - total_despesas - total_impostos_pagos) / total_receitas * 100)::numeric, 2)
      ELSE 0 
    END,
    'total_metas', total_metas,
    'metas_concluidas', total_metas_concluidas,
    'taxa_conclusao_metas', CASE 
      WHEN total_metas > 0 THEN 
        ROUND((total_metas_concluidas::numeric / total_metas * 100), 2)
      ELSE 0 
    END,
    'generated_at', now()
  );

  RETURN stats;
END;
$$;