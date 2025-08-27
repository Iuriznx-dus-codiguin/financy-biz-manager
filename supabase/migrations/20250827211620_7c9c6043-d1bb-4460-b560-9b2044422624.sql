-- Corrigir funções para definir search_path e melhorar segurança
DROP FUNCTION IF EXISTS calcular_proxima_data(date, text);
DROP FUNCTION IF EXISTS processar_receitas_recorrentes();
DROP FUNCTION IF EXISTS processar_despesas_recorrentes();

-- Recriar função para calcular próxima data com search_path definido
CREATE OR REPLACE FUNCTION calcular_proxima_data(data_atual date, tipo text)
RETURNS date 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE tipo
    WHEN 'diaria' THEN
      RETURN data_atual + INTERVAL '1 day';
    WHEN 'semanal' THEN
      RETURN data_atual + INTERVAL '1 week';
    WHEN 'mensal' THEN
      RETURN data_atual + INTERVAL '1 month';
    ELSE
      RETURN NULL;
  END CASE;
END;
$$;

-- Recriar função para processar receitas recorrentes com search_path definido
CREATE OR REPLACE FUNCTION processar_receitas_recorrentes()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  receita_rec RECORD;
BEGIN
  -- Buscar receitas recorrentes que devem ser processadas hoje
  FOR receita_rec IN 
    SELECT * FROM receitas 
    WHERE recorrente = true 
    AND proxima_data <= CURRENT_DATE
  LOOP
    -- Inserir nova receita
    INSERT INTO receitas (
      user_id, data, valor, categoria, cliente, forma_pagamento, 
      descricao, dashboard_id, categoria_personalizada
    ) VALUES (
      receita_rec.user_id,
      receita_rec.proxima_data,
      receita_rec.valor,
      receita_rec.categoria,
      receita_rec.cliente,
      receita_rec.forma_pagamento,
      receita_rec.descricao || ' (Recorrente)',
      receita_rec.dashboard_id,
      receita_rec.categoria_personalizada
    );
    
    -- Atualizar próxima data da receita original
    UPDATE receitas 
    SET proxima_data = calcular_proxima_data(proxima_data, tipo_recorrencia)
    WHERE id = receita_rec.id;
  END LOOP;
END;
$$;

-- Recriar função para processar despesas recorrentes com search_path definido
CREATE OR REPLACE FUNCTION processar_despesas_recorrentes()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  despesa_rec RECORD;
BEGIN
  -- Buscar despesas recorrentes que devem ser processadas hoje
  FOR despesa_rec IN 
    SELECT * FROM despesas 
    WHERE recorrente = true 
    AND proxima_data <= CURRENT_DATE
  LOOP
    -- Inserir nova despesa
    INSERT INTO despesas (
      user_id, data, valor, categoria, fornecedor, forma_pagamento, 
      descricao, dashboard_id, categoria_personalizada
    ) VALUES (
      despesa_rec.user_id,
      despesa_rec.proxima_data,
      despesa_rec.valor,
      despesa_rec.categoria,
      despesa_rec.fornecedor,
      despesa_rec.forma_pagamento,
      despesa_rec.descricao || ' (Recorrente)',
      despesa_rec.dashboard_id,
      despesa_rec.categoria_personalizada
    );
    
    -- Atualizar próxima data da despesa original
    UPDATE despesas 
    SET proxima_data = calcular_proxima_data(proxima_data, tipo_recorrencia)
    WHERE id = despesa_rec.id;
  END LOOP;
END;
$$;