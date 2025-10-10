-- Add active status column to validacao_n8n if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'validacao_n8n' 
    AND column_name = 'ativo'
  ) THEN
    ALTER TABLE public.validacao_n8n ADD COLUMN ativo boolean DEFAULT true;
  END IF;
END $$;

-- Create function to deactivate old phone numbers when a new one is added
CREATE OR REPLACE FUNCTION public.deactivate_old_phone_numbers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deactivate all previous phone numbers for this user/email
  UPDATE public.validacao_n8n
  SET ativo = false
  WHERE (user_id = NEW.user_id OR email = NEW.email)
    AND telefone != NEW.telefone
    AND id != NEW.id;
  
  -- Ensure the new record is active
  NEW.ativo := true;
  
  RETURN NEW;
END;
$$;

-- Create trigger to deactivate old phone numbers on insert or update
DROP TRIGGER IF EXISTS trigger_deactivate_old_phones ON public.validacao_n8n;
CREATE TRIGGER trigger_deactivate_old_phones
  BEFORE INSERT OR UPDATE OF telefone ON public.validacao_n8n
  FOR EACH ROW
  EXECUTE FUNCTION public.deactivate_old_phone_numbers();

-- Create function to sync phone updates from profiles to validacao_n8n
CREATE OR REPLACE FUNCTION public.sync_phone_to_validacao_n8n()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If phone number changed, deactivate old entries in validacao_n8n
  IF (TG_OP = 'UPDATE' AND OLD.telefone IS DISTINCT FROM NEW.telefone) OR
     (TG_OP = 'INSERT' AND NEW.telefone IS NOT NULL) THEN
    
    -- Deactivate all old phone numbers for this user
    UPDATE public.validacao_n8n
    SET ativo = false
    WHERE user_id = NEW.id AND telefone != NEW.telefone;
    
    -- Update or insert the current phone in validacao_n8n
    INSERT INTO public.validacao_n8n (user_id, email, telefone, ativo)
    VALUES (NEW.id, NEW.email, NEW.telefone, true)
    ON CONFLICT (id)
    DO UPDATE SET 
      telefone = NEW.telefone,
      ativo = true,
      email = NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync phone from profiles to validacao_n8n
DROP TRIGGER IF EXISTS trigger_sync_phone_to_validacao ON public.profiles;
CREATE TRIGGER trigger_sync_phone_to_validacao
  AFTER INSERT OR UPDATE OF telefone ON public.profiles
  FOR EACH ROW
  WHEN (NEW.telefone IS NOT NULL)
  EXECUTE FUNCTION public.sync_phone_to_validacao_n8n();

-- Create index for better performance on phone validation queries
CREATE INDEX IF NOT EXISTS idx_validacao_n8n_ativo_telefone 
ON public.validacao_n8n(ativo, telefone) 
WHERE ativo = true;