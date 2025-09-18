-- =============================================
-- CORREÇÕES DE SEGURANÇA E OTIMIZAÇÕES (Parte 1)
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

-- 2. SISTEMA DE CACHE INTELIGENTE
CREATE TABLE IF NOT EXISTS public.query_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  query_key text NOT NULL,
  cached_data jsonb NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamp with time zone DEFAULT now(),
  
  UNIQUE(user_id, query_key)
);

-- Enable RLS no cache
ALTER TABLE public.query_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies para cache
CREATE POLICY "Users can manage their own cache" ON public.query_cache
FOR ALL USING (auth.uid() = user_id);

-- 3. FUNÇÃO OTIMIZADA PARA BUSCA DE DADOS DO DASHBOARD
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

  -- Buscar dados otimizados com LIMIT para performance
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
  FROM (
    SELECT * FROM public.receitas r
    WHERE r.user_id = p_user_id AND r.dashboard_id = p_dashboard_id
    ORDER BY r.data DESC
    LIMIT 1000
  ) r;

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
  FROM (
    SELECT * FROM public.despesas d
    WHERE d.user_id = p_user_id AND d.dashboard_id = p_dashboard_id
    ORDER BY d.data DESC
    LIMIT 1000
  ) d;

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
  FROM (
    SELECT * FROM public.impostos i
    WHERE i.user_id = p_user_id AND i.dashboard_id = p_dashboard_id
    ORDER BY i.vencimento DESC
    LIMIT 500
  ) i;

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
  FROM (
    SELECT * FROM public.metas m
    WHERE m.user_id = p_user_id AND m.dashboard_id = p_dashboard_id
    ORDER BY m.created_at DESC
    LIMIT 100
  ) m;

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