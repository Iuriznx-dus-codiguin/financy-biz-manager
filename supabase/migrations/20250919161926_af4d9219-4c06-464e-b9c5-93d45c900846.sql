-- Enhanced Security for Financial Data (receitas and despesas tables)
-- This migration implements defense-in-depth security measures

-- 1. Create security definer function to check dashboard access (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.user_has_dashboard_access(p_user_id uuid, p_dashboard_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_dashboards 
    WHERE id = p_dashboard_id 
    AND user_id = p_user_id
  );
$$;

-- 2. Create audit logging function for financial data access
CREATE OR REPLACE FUNCTION public.log_financial_data_access(
  p_user_id uuid,
  p_table_name text,
  p_record_id text,
  p_action text,
  p_sensitive_fields jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log high-risk financial data access
  PERFORM public.log_security_event(
    p_user_id,
    p_action || '_FINANCIAL_DATA',
    p_table_name,
    p_record_id,
    NULL,
    p_sensitive_fields,
    CASE 
      WHEN p_action IN ('SELECT_BULK', 'EXPORT') THEN 'high'
      WHEN p_action = 'UPDATE' THEN 'medium'
      ELSE 'low'
    END
  );
END;
$$;

-- 3. Create trigger function for financial data audit
CREATE OR REPLACE FUNCTION public.audit_financial_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log all operations on financial data
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.log_financial_data_access(
      NEW.user_id,
      TG_TABLE_NAME,
      COALESCE(NEW.id::text, 'unknown'),
      TG_OP,
      to_jsonb(NEW)
    );
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    PERFORM public.log_financial_data_access(
      OLD.user_id,
      TG_TABLE_NAME,
      OLD.id::text,
      'DELETE',
      to_jsonb(OLD)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Drop existing RLS policies for receitas table
DROP POLICY IF EXISTS "Users can create their own receitas" ON public.receitas;
DROP POLICY IF EXISTS "Users can view their own receitas" ON public.receitas;
DROP POLICY IF EXISTS "Users can update their own receitas" ON public.receitas;
DROP POLICY IF EXISTS "Users can delete their own receitas" ON public.receitas;

-- 5. Create enhanced RLS policies for receitas table
CREATE POLICY "Enhanced receitas select policy"
ON public.receitas
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND (
    dashboard_id IS NULL 
    OR public.user_has_dashboard_access(auth.uid(), dashboard_id)
  )
);

CREATE POLICY "Enhanced receitas insert policy"
ON public.receitas
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND (
    dashboard_id IS NULL 
    OR public.user_has_dashboard_access(auth.uid(), dashboard_id)
  )
);

CREATE POLICY "Enhanced receitas update policy"
ON public.receitas
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  AND (
    dashboard_id IS NULL 
    OR public.user_has_dashboard_access(auth.uid(), dashboard_id)
  )
)
WITH CHECK (
  auth.uid() = user_id 
  AND (
    dashboard_id IS NULL 
    OR public.user_has_dashboard_access(auth.uid(), dashboard_id)
  )
);

CREATE POLICY "Enhanced receitas delete policy"
ON public.receitas
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  AND (
    dashboard_id IS NULL 
    OR public.user_has_dashboard_access(auth.uid(), dashboard_id)
  )
);

-- 6. Drop existing RLS policies for despesas table
DROP POLICY IF EXISTS "Users can create their own despesas" ON public.despesas;
DROP POLICY IF EXISTS "Users can view their own despesas" ON public.despesas;
DROP POLICY IF EXISTS "Users can update their own despesas" ON public.despesas;
DROP POLICY IF EXISTS "Users can delete their own despesas" ON public.despesas;

-- 7. Create enhanced RLS policies for despesas table
CREATE POLICY "Enhanced despesas select policy"
ON public.despesas
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND (
    dashboard_id IS NULL 
    OR public.user_has_dashboard_access(auth.uid(), dashboard_id)
  )
);

CREATE POLICY "Enhanced despesas insert policy"
ON public.despesas
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND (
    dashboard_id IS NULL 
    OR public.user_has_dashboard_access(auth.uid(), dashboard_id)
  )
);

CREATE POLICY "Enhanced despesas update policy"
ON public.despesas
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  AND (
    dashboard_id IS NULL 
    OR public.user_has_dashboard_access(auth.uid(), dashboard_id)
  )
)
WITH CHECK (
  auth.uid() = user_id 
  AND (
    dashboard_id IS NULL 
    OR public.user_has_dashboard_access(auth.uid(), dashboard_id)
  )
);

CREATE POLICY "Enhanced despesas delete policy"
ON public.despesas
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  AND (
    dashboard_id IS NULL 
    OR public.user_has_dashboard_access(auth.uid(), dashboard_id)
  )
);

-- 8. Create audit triggers for financial tables
CREATE TRIGGER receitas_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE
  ON public.receitas
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_financial_operations();

CREATE TRIGGER despesas_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE
  ON public.despesas
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_financial_operations();

-- 9. Create a secure view for masked financial data (for reporting purposes)
CREATE OR REPLACE VIEW public.receitas_masked AS
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
  -- Mask sensitive data
  CASE 
    WHEN auth.uid() = user_id THEN descricao
    ELSE public.mask_sensitive_data(descricao, 'partial')
  END as descricao,
  CASE 
    WHEN auth.uid() = user_id THEN cliente
    ELSE public.mask_sensitive_data(cliente, 'partial')
  END as cliente,
  CASE 
    WHEN auth.uid() = user_id THEN valor
    ELSE NULL
  END as valor
FROM public.receitas;

CREATE OR REPLACE VIEW public.despesas_masked AS
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
  -- Mask sensitive data
  CASE 
    WHEN auth.uid() = user_id THEN descricao
    ELSE public.mask_sensitive_data(descricao, 'partial')
  END as descricao,
  CASE 
    WHEN auth.uid() = user_id THEN fornecedor
    ELSE public.mask_sensitive_data(fornecedor, 'partial')
  END as fornecedor,
  CASE 
    WHEN auth.uid() = user_id THEN valor
    ELSE NULL
  END as valor
FROM public.despesas;

-- 10. Grant appropriate permissions
GRANT SELECT ON public.receitas_masked TO authenticated;
GRANT SELECT ON public.despesas_masked TO authenticated;

-- 11. Create rate limiting for financial data queries
CREATE OR REPLACE FUNCTION public.check_financial_query_rate_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.check_auth_rate_limit(
    'financial_query_' || p_user_id::text,
    50, -- max 50 queries
    60, -- per 60 minutes
    120 -- block for 120 minutes if exceeded
  );
END;
$$;

-- Comments for documentation
COMMENT ON FUNCTION public.user_has_dashboard_access IS 'Security definer function to check dashboard access without RLS recursion';
COMMENT ON FUNCTION public.log_financial_data_access IS 'Audit logging for financial data operations';
COMMENT ON VIEW public.receitas_masked IS 'Masked view of receitas for secure reporting';
COMMENT ON VIEW public.despesas_masked IS 'Masked view of despesas for secure reporting';