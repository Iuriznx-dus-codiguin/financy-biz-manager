-- Create audit log table for team member operations
CREATE TABLE IF NOT EXISTS public.equipe_membros_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  member_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.equipe_membros_audit ENABLE ROW LEVEL SECURITY;

-- Create policy for audit table - only users can see their own audit logs
CREATE POLICY "Users can view their own audit logs"
ON public.equipe_membros_audit
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to log team member operations
CREATE OR REPLACE FUNCTION public.log_team_member_operation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the operation
  INSERT INTO public.equipe_membros_audit (
    user_id,
    action,
    member_id,
    old_data,
    new_data
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for audit logging
CREATE TRIGGER equipe_membros_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.equipe_membros
  FOR EACH ROW EXECUTE FUNCTION public.log_team_member_operation();

-- Add additional RLS policy for enhanced security - prevent cross-dashboard access
CREATE POLICY "Prevent cross-dashboard access"
ON public.equipe_membros
FOR ALL
USING (
  auth.uid() = user_id AND 
  (dashboard_id IS NULL OR 
   dashboard_id IN (
     SELECT id FROM public.user_dashboards 
     WHERE user_id = auth.uid()
   ))
);

-- Create index for performance on audit table
CREATE INDEX idx_equipe_membros_audit_user_id ON public.equipe_membros_audit(user_id);
CREATE INDEX idx_equipe_membros_audit_created_at ON public.equipe_membros_audit(created_at);