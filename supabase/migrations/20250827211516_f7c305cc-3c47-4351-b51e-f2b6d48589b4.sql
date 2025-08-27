-- Adicionar campos de recorrência nas tabelas existentes
ALTER TABLE receitas 
ADD COLUMN recorrente boolean DEFAULT false,
ADD COLUMN tipo_recorrencia text DEFAULT NULL,
ADD COLUMN proxima_data date DEFAULT NULL,
ADD COLUMN categoria_personalizada text DEFAULT NULL;

ALTER TABLE despesas 
ADD COLUMN recorrente boolean DEFAULT false,
ADD COLUMN tipo_recorrencia text DEFAULT NULL,
ADD COLUMN proxima_data date DEFAULT NULL,
ADD COLUMN categoria_personalizada text DEFAULT NULL;

-- Criar função para calcular próxima data de recorrência
CREATE OR REPLACE FUNCTION calcular_proxima_data(data_atual date, tipo text)
RETURNS date AS $$
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
$$ LANGUAGE plpgsql;

-- Função para processar receitas recorrentes
CREATE OR REPLACE FUNCTION processar_receitas_recorrentes()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql;

-- Função para processar despesas recorrentes
CREATE OR REPLACE FUNCTION processar_despesas_recorrentes()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql;