-- Adicionar campo telefone na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN telefone TEXT;

-- Criar tabela para configurações de CRM
CREATE TABLE public.crm_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  crm_type TEXT NOT NULL DEFAULT 'hubspot',
  api_key TEXT,
  access_token TEXT,
  refresh_token TEXT,
  portal_id TEXT,
  is_active BOOLEAN DEFAULT false,
  last_sync TIMESTAMPTZ,
  sync_errors JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_integrations ENABLE ROW LEVEL SECURITY;

-- RLS policies for CRM integrations
CREATE POLICY "Users can view their own CRM integrations" 
ON public.crm_integrations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CRM integrations" 
ON public.crm_integrations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CRM integrations" 
ON public.crm_integrations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CRM integrations" 
ON public.crm_integrations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Criar tabela para logs de sincronização
CREATE TABLE public.crm_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  crm_integration_id UUID REFERENCES public.crm_integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'create', 'update', 'subscription_change', 'cancellation'
  hubspot_contact_id TEXT,
  data_synced JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for sync logs
CREATE POLICY "Users can view their own sync logs" 
ON public.crm_sync_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_crm_integrations_updated_at
BEFORE UPDATE ON public.crm_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();