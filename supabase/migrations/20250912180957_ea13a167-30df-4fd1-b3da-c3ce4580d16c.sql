-- Fix search_path issues for functions
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data TEXT, salt TEXT DEFAULT gen_random_uuid()::TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Simple encryption using built-in functions
  return encode(digest(data || salt, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;