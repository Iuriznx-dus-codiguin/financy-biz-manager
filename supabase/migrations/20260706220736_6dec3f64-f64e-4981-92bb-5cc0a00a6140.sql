
CREATE TABLE public.cakto_webhook_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  event_type text,
  category text NOT NULL DEFAULT 'unknown',
  status text NOT NULL DEFAULT 'received',
  http_status integer,
  attempt_count integer NOT NULL DEFAULT 1,
  is_retry boolean NOT NULL DEFAULT false,
  email_masked text,
  user_id uuid,
  subscription_type text,
  plan_id text,
  plan_name text,
  transaction_id text,
  subscription_id text,
  amount numeric,
  payment_method text,
  duration_ms integer,
  error_code text,
  error_message text,
  payload jsonb,
  response jsonb
);

CREATE INDEX cakto_webhook_logs_created_at_idx ON public.cakto_webhook_logs (created_at DESC);
CREATE INDEX cakto_webhook_logs_transaction_idx ON public.cakto_webhook_logs (transaction_id);
CREATE INDEX cakto_webhook_logs_category_status_idx ON public.cakto_webhook_logs (category, status);
CREATE INDEX cakto_webhook_logs_subscription_type_idx ON public.cakto_webhook_logs (subscription_type);
CREATE INDEX cakto_webhook_logs_user_id_idx ON public.cakto_webhook_logs (user_id);

GRANT SELECT ON public.cakto_webhook_logs TO authenticated;
GRANT ALL ON public.cakto_webhook_logs TO service_role;

ALTER TABLE public.cakto_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only developer-tier users can read audit logs (via subscribers table)
CREATE POLICY "Developers can read cakto webhook logs"
ON public.cakto_webhook_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.subscribers s
    WHERE (s.user_id = auth.uid() OR s.email = (auth.jwt() ->> 'email'))
      AND s.subscription_tier = 'developer'
      AND s.subscribed = true
  )
);

CREATE TRIGGER cakto_webhook_logs_updated_at
BEFORE UPDATE ON public.cakto_webhook_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
