CREATE TABLE IF NOT EXISTS public.ai_context_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dashboard_id text NOT NULL DEFAULT 'default',
  context_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  UNIQUE(user_id, dashboard_id)
);

ALTER TABLE public.ai_context_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_ai_cache"
ON public.ai_context_cache
FOR ALL
USING (false)
WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_ai_context_cache_expires ON public.ai_context_cache(expires_at);

CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.ai_context_cache WHERE expires_at < now();
$$;