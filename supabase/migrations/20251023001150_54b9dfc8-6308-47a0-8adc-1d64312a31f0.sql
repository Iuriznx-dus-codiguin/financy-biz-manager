-- Criar trigger para auto-completar dashboard_id em impostos
CREATE OR REPLACE FUNCTION public.ensure_imposto_has_dashboard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
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
      VALUES (NEW.user_id, 'Perfil Principal', 'business', true)
      RETURNING id INTO NEW.dashboard_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para auto-completar dashboard_id em metas
CREATE OR REPLACE FUNCTION public.ensure_meta_has_dashboard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
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
      VALUES (NEW.user_id, 'Perfil Principal', 'business', true)
      RETURNING id INTO NEW.dashboard_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Aplicar triggers nas tabelas de despesas, receitas, impostos e metas
DROP TRIGGER IF EXISTS ensure_despesa_dashboard_trigger ON public.despesas;
CREATE TRIGGER ensure_despesa_dashboard_trigger
  BEFORE INSERT ON public.despesas
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_despesa_has_dashboard();

DROP TRIGGER IF EXISTS ensure_receita_dashboard_trigger ON public.receitas;
CREATE TRIGGER ensure_receita_dashboard_trigger
  BEFORE INSERT ON public.receitas
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_receita_has_dashboard();

DROP TRIGGER IF EXISTS ensure_imposto_dashboard_trigger ON public.impostos;
CREATE TRIGGER ensure_imposto_dashboard_trigger
  BEFORE INSERT ON public.impostos
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_imposto_has_dashboard();

DROP TRIGGER IF EXISTS ensure_meta_dashboard_trigger ON public.metas;
CREATE TRIGGER ensure_meta_dashboard_trigger
  BEFORE INSERT ON public.metas
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_meta_has_dashboard();

-- Migrar transações órfãs existentes para o dashboard principal
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT DISTINCT user_id FROM public.receitas WHERE dashboard_id IS NULL
  LOOP
    PERFORM public.migrate_orphan_transactions_to_main_dashboard(user_record.user_id);
  END LOOP;
  
  FOR user_record IN SELECT DISTINCT user_id FROM public.despesas WHERE dashboard_id IS NULL
  LOOP
    PERFORM public.migrate_orphan_transactions_to_main_dashboard(user_record.user_id);
  END LOOP;
END $$;