-- Criar tabela para dashboards dos usuários
CREATE TABLE public.user_dashboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('personal', 'business')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_dashboards ENABLE ROW LEVEL SECURITY;

-- Create policies for user dashboards
CREATE POLICY "Users can view their own dashboards" 
ON public.user_dashboards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own dashboards" 
ON public.user_dashboards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboards" 
ON public.user_dashboards 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dashboards" 
ON public.user_dashboards 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_dashboards_updated_at
BEFORE UPDATE ON public.user_dashboards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add dashboard_id column to existing tables to associate data with specific dashboards
ALTER TABLE public.receitas ADD COLUMN dashboard_id UUID;
ALTER TABLE public.despesas ADD COLUMN dashboard_id UUID;
ALTER TABLE public.impostos ADD COLUMN dashboard_id UUID;
ALTER TABLE public.metas ADD COLUMN dashboard_id UUID;