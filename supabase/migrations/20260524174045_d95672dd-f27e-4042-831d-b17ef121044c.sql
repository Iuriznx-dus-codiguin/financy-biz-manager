-- Consolidated subscription status view: single source of truth
CREATE OR REPLACE VIEW public.subscription_status AS
SELECT
  COALESCE(us.user_id, cs.user_id, sub.user_id) AS user_id,
  COALESCE(us.email, cs.email, sub.email) AS email,
  COALESCE(us.status, cs.status, CASE WHEN sub.subscribed THEN 'active' ELSE 'inactive' END, 'free') AS status,
  COALESCE(us.subscription_type, cs.plan_type, sub.subscription_tier, 'free') AS tier,
  COALESCE(us.plan_name, cs.plan_name, sub.subscription_tier) AS plan_name,
  COALESCE(us.expires_at, cs.expires_at, sub.subscription_end) AS expires_at,
  us.features AS features,
  GREATEST(
    COALESCE(us.updated_at, 'epoch'::timestamptz),
    COALESCE(cs.updated_at, 'epoch'::timestamptz),
    COALESCE(sub.updated_at, 'epoch'::timestamptz)
  ) AS updated_at
FROM public.user_subscriptions us
FULL OUTER JOIN public.customer_subscriptions cs ON cs.user_id = us.user_id
FULL OUTER JOIN public.subscribers sub
  ON sub.user_id = COALESCE(us.user_id, cs.user_id);

-- Restrict to caller's own row via underlying-table RLS (view inherits from base tables).
GRANT SELECT ON public.subscription_status TO authenticated;
