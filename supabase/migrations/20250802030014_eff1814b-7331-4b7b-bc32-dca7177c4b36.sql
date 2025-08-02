-- Criar uma tabela para armazenar as assinaturas dos clientes com informações do Cakto
CREATE TABLE IF NOT EXISTS public.customer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  plan_type TEXT NOT NULL, -- 'personal' ou 'business'
  billing_period TEXT NOT NULL, -- 'monthly' ou 'annual'
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired'
  payment_method TEXT,
  cakto_subscription_id TEXT UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for customer_subscriptions
CREATE POLICY "select_own_subscription" ON public.customer_subscriptions
FOR SELECT
USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "insert_subscription" ON public.customer_subscriptions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "update_own_subscription" ON public.customer_subscriptions
FOR UPDATE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_customer_subscriptions_updated_at
BEFORE UPDATE ON public.customer_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();