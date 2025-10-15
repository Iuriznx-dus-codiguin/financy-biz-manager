-- Melhorar funções de processamento de transações recorrentes
-- Agora retornam o número de transações processadas e incluem logging

-- Drop e recriar função de processamento de receitas
DROP FUNCTION IF EXISTS public.processar_receitas_recorrentes();

CREATE OR REPLACE FUNCTION public.processar_receitas_recorrentes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  receita_rec RECORD;
  processed_count INTEGER := 0;
  main_dashboard_id UUID;
BEGIN
  -- Log início do processamento
  RAISE LOG 'Iniciando processamento de receitas recorrentes em %', now();
  
  -- Buscar receitas recorrentes que devem ser processadas hoje
  FOR receita_rec IN 
    SELECT * FROM receitas 
    WHERE recorrente = true 
    AND proxima_data <= CURRENT_DATE
    ORDER BY proxima_data ASC
  LOOP
    BEGIN
      -- Garantir que tem dashboard_id
      IF receita_rec.dashboard_id IS NULL THEN
        main_dashboard_id := public.get_user_main_dashboard(receita_rec.user_id);
      ELSE
        main_dashboard_id := receita_rec.dashboard_id;
      END IF;
      
      -- Inserir nova receita
      INSERT INTO receitas (
        user_id, data, valor, categoria, cliente, forma_pagamento, 
        descricao, dashboard_id, categoria_personalizada, status
      ) VALUES (
        receita_rec.user_id,
        receita_rec.proxima_data,
        receita_rec.valor,
        receita_rec.categoria,
        receita_rec.cliente,
        receita_rec.forma_pagamento,
        receita_rec.descricao || ' (Recorrente)',
        main_dashboard_id,
        receita_rec.categoria_personalizada,
        'paga'
      );
      
      -- Atualizar próxima data da receita original
      UPDATE receitas 
      SET proxima_data = public.calcular_proxima_data(proxima_data, tipo_recorrencia)
      WHERE id = receita_rec.id;
      
      processed_count := processed_count + 1;
      
      RAISE LOG 'Receita recorrente processada: ID % - Próxima data: %', 
        receita_rec.id, 
        public.calcular_proxima_data(receita_rec.proxima_data, receita_rec.tipo_recorrencia);
        
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao processar receita ID %: %', receita_rec.id, SQLERRM;
      CONTINUE;
    END;
  END LOOP;
  
  RAISE LOG 'Processamento de receitas concluído: % transações processadas', processed_count;
  RETURN processed_count;
END;
$function$;

-- Drop e recriar função de processamento de despesas
DROP FUNCTION IF EXISTS public.processar_despesas_recorrentes();

CREATE OR REPLACE FUNCTION public.processar_despesas_recorrentes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  despesa_rec RECORD;
  processed_count INTEGER := 0;
  main_dashboard_id UUID;
BEGIN
  -- Log início do processamento
  RAISE LOG 'Iniciando processamento de despesas recorrentes em %', now();
  
  -- Buscar despesas recorrentes que devem ser processadas hoje
  FOR despesa_rec IN 
    SELECT * FROM despesas 
    WHERE recorrente = true 
    AND proxima_data <= CURRENT_DATE
    ORDER BY proxima_data ASC
  LOOP
    BEGIN
      -- Garantir que tem dashboard_id
      IF despesa_rec.dashboard_id IS NULL THEN
        main_dashboard_id := public.get_user_main_dashboard(despesa_rec.user_id);
      ELSE
        main_dashboard_id := despesa_rec.dashboard_id;
      END IF;
      
      -- Inserir nova despesa
      INSERT INTO despesas (
        user_id, data, valor, categoria, fornecedor, forma_pagamento, 
        descricao, dashboard_id, categoria_personalizada, status
      ) VALUES (
        despesa_rec.user_id,
        despesa_rec.proxima_data,
        despesa_rec.valor,
        despesa_rec.categoria,
        despesa_rec.fornecedor,
        despesa_rec.forma_pagamento,
        despesa_rec.descricao || ' (Recorrente)',
        main_dashboard_id,
        despesa_rec.categoria_personalizada,
        'paga'
      );
      
      -- Atualizar próxima data da despesa original
      UPDATE despesas 
      SET proxima_data = public.calcular_proxima_data(proxima_data, tipo_recorrencia)
      WHERE id = despesa_rec.id;
      
      processed_count := processed_count + 1;
      
      RAISE LOG 'Despesa recorrente processada: ID % - Próxima data: %', 
        despesa_rec.id, 
        public.calcular_proxima_data(despesa_rec.proxima_data, despesa_rec.tipo_recorrencia);
        
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao processar despesa ID %: %', despesa_rec.id, SQLERRM;
      CONTINUE;
    END;
  END LOOP;
  
  RAISE LOG 'Processamento de despesas concluído: % transações processadas', processed_count;
  RETURN processed_count;
END;
$function$;