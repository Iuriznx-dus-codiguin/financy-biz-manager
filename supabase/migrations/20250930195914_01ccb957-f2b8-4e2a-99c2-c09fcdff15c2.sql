-- Enable Row Level Security on validacao_n8n table
ALTER TABLE public.validacao_n8n ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscription data
CREATE POLICY "Users can view their own n8n validation data"
ON public.validacao_n8n
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  auth.email() = email
);

-- Policy: Service role has full access (for N8N automations and edge functions)
CREATE POLICY "Service role has full access to n8n validation data"
ON public.validacao_n8n
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add indexes for better performance on RLS queries
CREATE INDEX IF NOT EXISTS idx_validacao_n8n_user_id ON public.validacao_n8n(user_id);
CREATE INDEX IF NOT EXISTS idx_validacao_n8n_email ON public.validacao_n8n(email);

-- Add table comment for documentation
COMMENT ON TABLE public.validacao_n8n IS 'N8N validation data with RLS enabled. Protected customer data requiring proper access controls.';