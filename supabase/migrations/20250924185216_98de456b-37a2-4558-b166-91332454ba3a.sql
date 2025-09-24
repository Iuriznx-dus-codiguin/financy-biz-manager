-- CORREÇÕES CRÍTICAS DE SEGURANÇA (Corrigido)

-- 1. Habilitar RLS na tabela usuarios_assinatura (CRÍTICO)
ALTER TABLE public.usuarios_assinatura ENABLE ROW LEVEL SECURITY;

-- 2. Criar política para usuarios_assinatura (apenas sistema pode acessar)
CREATE POLICY "System only access to usuarios_assinatura"
ON public.usuarios_assinatura
FOR ALL
TO authenticated
USING (false); -- Nenhum usuário comum pode acessar

-- 3. Remover views mascaradas inseguras e recriar como funções seguras
DROP VIEW IF EXISTS public.receitas_masked;
DROP VIEW IF EXISTS public.despesas_masked;

-- 4. Função segura para verificar role do usuário (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((settings ->> 'role')::text, 'user') 
  FROM public.profiles 
  WHERE id = p_user_id;
$$;

-- 5. Função segura para dados mascarados de receitas (apenas admin)
CREATE OR REPLACE FUNCTION public.get_receitas_masked()
RETURNS TABLE (
  id integer,
  user_id uuid,
  data date,
  valor_mascarado text,
  categoria text,
  cliente_mascarado text,
  forma_pagamento text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se é admin
  IF public.get_user_role(auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Log da operação
  INSERT INTO public.security_audit_logs (
    user_id, action, table_name, risk_level
  ) VALUES (
    auth.uid(), 'ADMIN_VIEW_MASKED_RECEITAS', 'receitas', 'high'
  );

  RETURN QUERY
  SELECT 
    r.id,
    r.user_id,
    r.data,
    public.mask_sensitive_data(r.valor::text, 'salary') as valor_mascarado,
    r.categoria,
    public.mask_sensitive_data(COALESCE(r.cliente, 'N/A'), 'partial') as cliente_mascarado,
    r.forma_pagamento,
    r.status
  FROM public.receitas r;
END;
$$;

-- 6. Função segura para dados mascarados de despesas (apenas admin)
CREATE OR REPLACE FUNCTION public.get_despesas_masked()
RETURNS TABLE (
  id integer,
  user_id uuid,
  data date,
  valor_mascarado text,
  categoria text,
  fornecedor_mascarado text,
  forma_pagamento text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se é admin
  IF public.get_user_role(auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Log da operação
  INSERT INTO public.security_audit_logs (
    user_id, action, table_name, risk_level
  ) VALUES (
    auth.uid(), 'ADMIN_VIEW_MASKED_DESPESAS', 'despesas', 'high'
  );

  RETURN QUERY
  SELECT 
    d.id,
    d.user_id,
    d.data,
    public.mask_sensitive_data(d.valor::text, 'salary') as valor_mascarado,
    d.categoria,
    public.mask_sensitive_data(COALESCE(d.fornecedor, 'N/A'), 'partial') as fornecedor_mascarado,
    d.forma_pagamento,
    d.status
  FROM public.despesas d;
END;
$$;

-- 7. Auditoria de segurança para tabelas sensíveis
CREATE OR REPLACE FUNCTION public.audit_sensitive_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log acesso a dados sensíveis
  INSERT INTO public.security_audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    risk_level,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    'high',
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 8. Aplicar trigger de auditoria na tabela usuarios_assinatura
CREATE TRIGGER audit_usuarios_assinatura_access
  AFTER INSERT OR UPDATE OR DELETE ON public.usuarios_assinatura
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_access();

-- 9. Rate limiting mais rigoroso para consultas sensíveis
CREATE OR REPLACE FUNCTION public.check_sensitive_data_rate_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.check_auth_rate_limit(
    'sensitive_data_' || p_user_id::text,
    5,   -- máximo 5 consultas
    60,  -- por 60 minutos  
    240  -- bloqueio por 240 minutos se exceder
  );
END;
$$;

-- 10. Função para verificar se email/telefone já existem (prevenção de enumeration)
CREATE OR REPLACE FUNCTION public.check_user_exists(p_email text, p_telefone text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exists_count integer := 0;
BEGIN
  -- Rate limit para prevenção de ataques de enumeração
  IF NOT public.check_auth_rate_limit(
    'user_enumeration_' || coalesce(p_email, p_telefone),
    3,   -- máximo 3 tentativas
    15,  -- por 15 minutos
    60   -- bloqueio por 60 minutos
  ) THEN
    RAISE EXCEPTION 'Rate limit exceeded for user enumeration protection';
  END IF;

  -- Verificar se já existe (sem retornar detalhes específicos)
  SELECT COUNT(*) INTO exists_count
  FROM public.profiles 
  WHERE email = p_email 
     OR (p_telefone IS NOT NULL AND telefone = p_telefone);
     
  -- Log tentativa de verificação
  INSERT INTO public.security_audit_logs (
    user_id, action, table_name, risk_level, metadata
  ) VALUES (
    auth.uid(), 'USER_EXISTENCE_CHECK', 'profiles', 'medium',
    jsonb_build_object('email_checked', p_email IS NOT NULL, 'phone_checked', p_telefone IS NOT NULL)
  );

  RETURN exists_count > 0;
END;
$$;

-- 11. Melhorar segurança da função de verificação de dashboard
CREATE OR REPLACE FUNCTION public.user_has_dashboard_access_secure(p_user_id uuid, p_dashboard_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  has_access boolean := false;
BEGIN
  -- Verificar se o usuário tem acesso ao dashboard
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_dashboards 
    WHERE id = p_dashboard_id 
    AND user_id = p_user_id
  ) INTO has_access;
  
  -- Se não tem acesso, log de tentativa não autorizada
  IF NOT has_access THEN
    INSERT INTO public.security_audit_logs (
      user_id, action, table_name, record_id, risk_level
    ) VALUES (
      p_user_id, 'UNAUTHORIZED_DASHBOARD_ACCESS_ATTEMPT', 'user_dashboards', p_dashboard_id::text, 'high'
    );
  END IF;
  
  RETURN has_access;
END;
$$;

-- 12. Mascaramento melhorado para dados PII
CREATE OR REPLACE FUNCTION public.mask_financial_data(
  input_value numeric,
  mask_type text DEFAULT 'partial'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE mask_type
    WHEN 'full' THEN
      RETURN 'R$ ***.**';
    WHEN 'partial' THEN
      RETURN CASE 
        WHEN input_value IS NULL THEN 'R$ 0,00'
        WHEN input_value > 999999 THEN 'R$ ******'
        ELSE 'R$ ' || left(input_value::text, 2) || '***'
      END;
    ELSE
      RETURN COALESCE(input_value::text, '0');
  END CASE;
END;
$$;