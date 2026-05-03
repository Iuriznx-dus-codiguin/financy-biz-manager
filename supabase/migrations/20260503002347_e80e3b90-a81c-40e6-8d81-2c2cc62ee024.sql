-- Ensure each user has at most one default dashboard
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_dashboards_default
  ON public.user_dashboards (user_id)
  WHERE is_default = true;