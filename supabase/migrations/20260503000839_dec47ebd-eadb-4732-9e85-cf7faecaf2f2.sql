
-- 1. payment_notifications: only service_role can insert
DROP POLICY IF EXISTS "System can insert payment notifications" ON public.payment_notifications;
CREATE POLICY "Service role can insert payment notifications"
ON public.payment_notifications
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');

-- 2. user_subscriptions: only service_role can insert/update
DROP POLICY IF EXISTS "System can insert subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;

CREATE POLICY "Service role can insert subscriptions"
ON public.user_subscriptions
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update subscriptions"
ON public.user_subscriptions
FOR UPDATE
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 3. profiles: prevent users from escalating their role via settings.role
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow service_role to change anything
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- For regular users: preserve the previous 'role' key inside settings
  IF NEW.settings IS DISTINCT FROM OLD.settings THEN
    NEW.settings := COALESCE(NEW.settings, '{}'::jsonb)
      - 'role'
      || jsonb_build_object('role', COALESCE(OLD.settings ->> 'role', 'user'));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_role_escalation_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_escalation();

-- 4. subscribers: remove from realtime publication to stop broadcasting changes
ALTER PUBLICATION supabase_realtime DROP TABLE public.subscribers;
