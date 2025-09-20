-- Fix critical security issues with masked tables
-- Enable RLS on masked tables that currently have no protection
ALTER TABLE public.receitas_masked ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas_masked ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for receitas_masked
CREATE POLICY "Users can view their own masked receitas" 
ON public.receitas_masked 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create RLS policies for despesas_masked  
CREATE POLICY "Users can view their own masked despesas" 
ON public.despesas_masked 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create edge function for secure developer key validation
CREATE OR REPLACE FUNCTION public.validate_developer_key(key_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  valid_keys text[] := ARRAY[
    'DEV_2024_7K9mQ3xW8vN5',
    'FINCY_DEV_3M8kL2pR9wY', 
    'ACCESS_2024_5P7nF4vX9k'
  ];
BEGIN
  -- Rate limit developer key attempts
  IF NOT public.check_auth_rate_limit(
    'dev_key_' || auth.uid()::text,
    3, -- max 3 attempts
    60, -- per 60 minutes  
    1440 -- block for 24 hours if exceeded
  ) THEN
    RAISE EXCEPTION 'Too many developer key attempts. Try again later.';
  END IF;
  
  -- Log the attempt for security monitoring
  PERFORM public.log_security_event(
    auth.uid(),
    'DEVELOPER_KEY_ATTEMPT',
    'developer_access',
    null,
    null,
    jsonb_build_object('key_prefix', left(key_input, 3)),
    'high'
  );
  
  -- Check if key is valid
  RETURN key_input = ANY(valid_keys);
END;
$$;