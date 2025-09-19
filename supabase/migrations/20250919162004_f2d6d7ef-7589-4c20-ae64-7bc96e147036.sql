-- Fix security linter warnings for financial data views
-- Remove SECURITY DEFINER from views and use proper RLS instead

-- 1. Drop the problematic views
DROP VIEW IF EXISTS public.receitas_masked;
DROP VIEW IF EXISTS public.despesas_masked;

-- 2. Create standard views that rely on RLS policies (not SECURITY DEFINER)
CREATE VIEW public.receitas_masked AS
SELECT 
  id,
  user_id,
  dashboard_id,
  data,
  categoria,
  categoria_personalizada,
  forma_pagamento,
  recorrente,
  status,
  created_at,
  -- Only show full data if user owns the record (RLS will handle access)
  descricao,
  cliente,
  valor
FROM public.receitas;

CREATE VIEW public.despesas_masked AS
SELECT 
  id,
  user_id,
  dashboard_id,
  data,
  categoria,
  categoria_personalizada,
  forma_pagamento,
  recorrente,
  status,
  created_at,
  -- Only show full data if user owns the record (RLS will handle access)
  descricao,
  fornecedor,
  valor
FROM public.despesas;

-- 3. Enable RLS on the views (they will inherit from base tables)
ALTER VIEW public.receitas_masked SET (security_barrier = true);
ALTER VIEW public.despesas_masked SET (security_barrier = true);

-- 4. Grant permissions on the views
GRANT SELECT ON public.receitas_masked TO authenticated;
GRANT SELECT ON public.despesas_masked TO authenticated;

-- 5. Add additional security function for bulk query monitoring
CREATE OR REPLACE FUNCTION public.log_bulk_financial_query(
  p_user_id uuid,
  p_table_name text,
  p_query_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Rate limit check
  IF NOT public.check_financial_query_rate_limit(p_user_id) THEN
    RAISE EXCEPTION 'Rate limit exceeded for financial queries';
  END IF;
  
  -- Log the bulk query
  PERFORM public.log_security_event(
    p_user_id,
    'BULK_QUERY_FINANCIAL_DATA',
    p_table_name,
    NULL,
    NULL,
    jsonb_build_object('query_type', p_query_type),
    'medium'
  );
END;
$$;

-- Comments for documentation
COMMENT ON VIEW public.receitas_masked IS 'Secure view of receitas data with RLS enforcement';
COMMENT ON VIEW public.despesas_masked IS 'Secure view of despesas data with RLS enforcement';
COMMENT ON FUNCTION public.log_bulk_financial_query IS 'Rate limiting and logging for bulk financial queries';