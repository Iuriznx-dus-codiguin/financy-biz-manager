-- Create functions and constraints after cleanup

-- Function to get or create the user's main dashboard
CREATE OR REPLACE FUNCTION public.get_user_main_dashboard(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  main_dashboard_id uuid;
  oldest_dashboard_id uuid;
BEGIN
  -- First, check if user has exactly one default dashboard
  SELECT id INTO main_dashboard_id
  FROM public.user_dashboards
  WHERE user_id = p_user_id AND is_default = true
  LIMIT 1;
  
  IF main_dashboard_id IS NOT NULL THEN
    RETURN main_dashboard_id;
  ELSE
    -- No default dashboard exists, get the oldest one and make it default
    SELECT id INTO oldest_dashboard_id
    FROM public.user_dashboards
    WHERE user_id = p_user_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF oldest_dashboard_id IS NOT NULL THEN
      UPDATE public.user_dashboards
      SET is_default = true, updated_at = now()
      WHERE id = oldest_dashboard_id;
      
      main_dashboard_id := oldest_dashboard_id;
    ELSE
      -- User has no dashboards, create a default one
      INSERT INTO public.user_dashboards (user_id, name, type, is_default)
      VALUES (p_user_id, 'Dashboard Principal', 'business', true)
      RETURNING id INTO main_dashboard_id;
    END IF;
  END IF;
  
  RETURN main_dashboard_id;
END;
$$;

-- Function to migrate orphan transactions to main dashboard
CREATE OR REPLACE FUNCTION public.migrate_orphan_transactions_to_main_dashboard(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  main_dashboard_id uuid;
BEGIN
  -- Get the user's main dashboard
  main_dashboard_id := public.get_user_main_dashboard(p_user_id);
  
  -- Migrate orphan receitas
  UPDATE public.receitas
  SET dashboard_id = main_dashboard_id
  WHERE user_id = p_user_id AND dashboard_id IS NULL;
  
  -- Migrate orphan despesas
  UPDATE public.despesas
  SET dashboard_id = main_dashboard_id
  WHERE user_id = p_user_id AND dashboard_id IS NULL;
  
  -- Migrate orphan impostos
  UPDATE public.impostos
  SET dashboard_id = main_dashboard_id
  WHERE user_id = p_user_id AND dashboard_id IS NULL;
  
  -- Migrate orphan metas
  UPDATE public.metas
  SET dashboard_id = main_dashboard_id
  WHERE user_id = p_user_id AND dashboard_id IS NULL;
END;
$$;

-- Create partial unique index for default dashboards (one per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_default_dashboard 
ON public.user_dashboards (user_id) 
WHERE is_default = true;

-- Migrate all existing orphan transactions
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- For each user that has orphan transactions, migrate them
  FOR user_record IN 
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM public.receitas WHERE dashboard_id IS NULL
      UNION
      SELECT user_id FROM public.despesas WHERE dashboard_id IS NULL
      UNION
      SELECT user_id FROM public.impostos WHERE dashboard_id IS NULL
      UNION
      SELECT user_id FROM public.metas WHERE dashboard_id IS NULL
    ) AS users_with_orphans
  LOOP
    PERFORM public.migrate_orphan_transactions_to_main_dashboard(user_record.user_id);
  END LOOP;
END;
$$;