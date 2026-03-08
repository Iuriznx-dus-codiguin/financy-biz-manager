
-- Update default values for user_subscriptions table to remove free_trial references
ALTER TABLE public.user_subscriptions 
  ALTER COLUMN plan_name SET DEFAULT 'Aguardando Pagamento',
  ALTER COLUMN subscription_type SET DEFAULT 'pending',
  ALTER COLUMN features SET DEFAULT '{"max_dashboards": 0, "ai_requests_per_month": 0, "team_members": 0}'::jsonb;
