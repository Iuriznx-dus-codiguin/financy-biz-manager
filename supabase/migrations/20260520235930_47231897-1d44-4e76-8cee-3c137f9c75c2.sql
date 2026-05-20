-- Defensive: if any duplicate defaults exist, keep the oldest as default
WITH ranked AS (
  SELECT id, user_id, is_default,
         ROW_NUMBER() OVER (PARTITION BY user_id, is_default ORDER BY created_at ASC) AS rn
  FROM public.user_dashboards
  WHERE is_default = true
)
UPDATE public.user_dashboards d
SET is_default = false
FROM ranked r
WHERE d.id = r.id AND r.rn > 1;

-- Defensive: collapse duplicate (user_id, name) by suffixing
WITH ranked AS (
  SELECT id, user_id, name,
         ROW_NUMBER() OVER (PARTITION BY user_id, name ORDER BY created_at ASC) AS rn
  FROM public.user_dashboards
)
UPDATE public.user_dashboards d
SET name = d.name || ' (' || r.rn || ')'
FROM ranked r
WHERE d.id = r.id AND r.rn > 1;

-- Partial unique index: at most one default dashboard per user
CREATE UNIQUE INDEX IF NOT EXISTS user_dashboards_one_default_per_user
  ON public.user_dashboards (user_id)
  WHERE is_default = true;

-- Unique (user_id, name) to prevent duplicate dashboard names per user
CREATE UNIQUE INDEX IF NOT EXISTS user_dashboards_unique_user_name
  ON public.user_dashboards (user_id, name);

-- Helpful lookup index
CREATE INDEX IF NOT EXISTS user_dashboards_user_id_idx
  ON public.user_dashboards (user_id);