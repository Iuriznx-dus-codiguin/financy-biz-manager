-- Migração para corrigir despesas e receitas órfãs (sem dashboard_id)

-- Primeiro, garantir que todos os usuários tenham um dashboard principal
INSERT INTO public.user_dashboards (user_id, name, type, is_default)
SELECT DISTINCT p.id, 'Dashboard Principal', 'business', true
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_dashboards ud 
  WHERE ud.user_id = p.id AND ud.is_default = true
)
ON CONFLICT DO NOTHING;

-- Migrar despesas órfãs para o dashboard principal
UPDATE public.despesas d
SET dashboard_id = (
  SELECT id FROM public.user_dashboards 
  WHERE user_id = d.user_id 
  AND is_default = true
  LIMIT 1
)
WHERE dashboard_id IS NULL;

-- Migrar receitas órfãs para o dashboard principal
UPDATE public.receitas r
SET dashboard_id = (
  SELECT id FROM public.user_dashboards 
  WHERE user_id = r.user_id 
  AND is_default = true
  LIMIT 1
)
WHERE dashboard_id IS NULL;

-- Criar função de validação para garantir dashboard_id em despesas
CREATE OR REPLACE FUNCTION public.ensure_despesa_has_dashboard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.dashboard_id IS NULL THEN
    -- Buscar dashboard principal do usuário
    SELECT id INTO NEW.dashboard_id
    FROM public.user_dashboards 
    WHERE user_id = NEW.user_id 
    AND is_default = true
    LIMIT 1;
    
    -- Se ainda não existir, criar um
    IF NEW.dashboard_id IS NULL THEN
      INSERT INTO public.user_dashboards (user_id, name, type, is_default)
      VALUES (NEW.user_id, 'Dashboard Principal', 'business', true)
      RETURNING id INTO NEW.dashboard_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar função de validação para garantir dashboard_id em receitas
CREATE OR REPLACE FUNCTION public.ensure_receita_has_dashboard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.dashboard_id IS NULL THEN
    -- Buscar dashboard principal do usuário
    SELECT id INTO NEW.dashboard_id
    FROM public.user_dashboards 
    WHERE user_id = NEW.user_id 
    AND is_default = true
    LIMIT 1;
    
    -- Se ainda não existir, criar um
    IF NEW.dashboard_id IS NULL THEN
      INSERT INTO public.user_dashboards (user_id, name, type, is_default)
      VALUES (NEW.user_id, 'Dashboard Principal', 'business', true)
      RETURNING id INTO NEW.dashboard_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar triggers para validação automática
DROP TRIGGER IF EXISTS ensure_despesa_dashboard_trigger ON public.despesas;
CREATE TRIGGER ensure_despesa_dashboard_trigger
  BEFORE INSERT OR UPDATE ON public.despesas
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_despesa_has_dashboard();

DROP TRIGGER IF EXISTS ensure_receita_dashboard_trigger ON public.receitas;
CREATE TRIGGER ensure_receita_dashboard_trigger
  BEFORE INSERT OR UPDATE ON public.receitas
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_receita_has_dashboard();