-- Remove CRM related tables and data
DROP TABLE IF EXISTS public.crm_sync_logs CASCADE;
DROP TABLE IF EXISTS public.crm_integrations CASCADE;

-- Add security enhancements for sensitive data
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical'))
);

-- Enable RLS on security audit logs
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy for security audit logs (admin only access)
CREATE POLICY "Admin access to security logs" ON public.security_audit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (settings->>'role')::text = 'admin'
    )
  );

-- Add encryption function for sensitive data
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data TEXT, salt TEXT DEFAULT gen_random_uuid()::TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Simple encryption using built-in functions
  -- In production, use proper encryption libraries
  return encode(digest(data || salt, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID,
  p_action TEXT,
  p_table_name TEXT,
  p_record_id TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_risk_level TEXT DEFAULT 'low'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.security_audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    risk_level
  ) VALUES (
    p_user_id,
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values,
    p_risk_level
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add enhanced trigger for equipe_membros security logging
CREATE OR REPLACE FUNCTION public.log_team_member_security()
RETURNS TRIGGER AS $$
BEGIN
  -- Log high-risk operations on sensitive data
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.log_security_event(
      NEW.user_id,
      TG_OP || '_TEAM_MEMBER',
      'equipe_membros',
      NEW.id::TEXT,
      CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      to_jsonb(NEW),
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'medium'
        WHEN OLD.salario != NEW.salario THEN 'high'
        ELSE 'low'
      END
    );
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    PERFORM public.log_security_event(
      OLD.user_id,
      'DELETE_TEAM_MEMBER',
      'equipe_membros',
      OLD.id::TEXT,
      to_jsonb(OLD),
      NULL,
      'high'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for enhanced security logging
DROP TRIGGER IF EXISTS team_member_security_audit ON public.equipe_membros;
CREATE TRIGGER team_member_security_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.equipe_membros
  FOR EACH ROW EXECUTE FUNCTION public.log_team_member_security();

-- Add rate limiting table for auth attempts
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address or user identifier
  attempts INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on auth rate limits
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy for auth rate limits (system access only)
CREATE POLICY "System only access to rate limits" ON public.auth_rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- Function to check and update rate limits
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(
  p_identifier TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15,
  p_block_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  current_record RECORD;
  is_allowed BOOLEAN := TRUE;
BEGIN
  -- Clean up old records
  DELETE FROM public.auth_rate_limits 
  WHERE window_start < now() - (p_window_minutes || ' minutes')::INTERVAL
    AND (blocked_until IS NULL OR blocked_until < now());
  
  -- Check current rate limit
  SELECT * INTO current_record
  FROM public.auth_rate_limits
  WHERE identifier = p_identifier
    AND window_start > now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  IF current_record IS NOT NULL THEN
    -- Check if currently blocked
    IF current_record.blocked_until IS NOT NULL AND current_record.blocked_until > now() THEN
      RETURN FALSE;
    END IF;
    
    -- Update attempt count
    IF current_record.attempts >= p_max_attempts THEN
      -- Block the identifier
      UPDATE public.auth_rate_limits
      SET blocked_until = now() + (p_block_minutes || ' minutes')::INTERVAL
      WHERE id = current_record.id;
      RETURN FALSE;
    ELSE
      -- Increment attempts
      UPDATE public.auth_rate_limits
      SET attempts = attempts + 1
      WHERE id = current_record.id;
    END IF;
  ELSE
    -- Create new record
    INSERT INTO public.auth_rate_limits (identifier, attempts)
    VALUES (p_identifier, 1);
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;