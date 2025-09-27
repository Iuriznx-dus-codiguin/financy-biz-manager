-- First, clean up duplicate default dashboards
DO $$
DECLARE
  user_record RECORD;
  oldest_dashboard_id uuid;
BEGIN
  -- For each user with multiple default dashboards
  FOR user_record IN 
    SELECT user_id
    FROM public.user_dashboards
    WHERE is_default = true
    GROUP BY user_id
    HAVING COUNT(*) > 1
  LOOP
    -- Get the oldest dashboard for this user
    SELECT id INTO oldest_dashboard_id
    FROM public.user_dashboards
    WHERE user_id = user_record.user_id AND is_default = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Set all others to false
    UPDATE public.user_dashboards
    SET is_default = false, updated_at = now()
    WHERE user_id = user_record.user_id AND is_default = true AND id != oldest_dashboard_id;
  END LOOP;
END;
$$;