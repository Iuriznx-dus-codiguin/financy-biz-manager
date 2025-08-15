-- Fix RLS policies for customer_subscriptions table
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "insert_subscription" ON public.customer_subscriptions;
DROP POLICY IF EXISTS "update_own_subscription" ON public.customer_subscriptions;

-- Create secure policies that only allow system operations
-- Only edge functions with service role can insert subscription data
CREATE POLICY "system_only_insert_subscription" ON public.customer_subscriptions
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Only edge functions with service role can update subscription data
CREATE POLICY "system_only_update_subscription" ON public.customer_subscriptions
FOR UPDATE 
USING (auth.role() = 'service_role');

-- Fix RLS policies for subscribers table
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

-- Create secure policies that only allow system operations
-- Only edge functions with service role can insert subscriber data
CREATE POLICY "system_only_insert_subscriber" ON public.subscribers
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Only edge functions with service role can update subscriber data
CREATE POLICY "system_only_update_subscriber" ON public.subscribers
FOR UPDATE 
USING (auth.role() = 'service_role');