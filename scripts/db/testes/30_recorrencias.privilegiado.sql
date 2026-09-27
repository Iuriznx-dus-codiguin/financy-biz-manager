-- A-10: recorrências geradas pelo cron (conexão direta), com recuperação, âncora e sem duplicar.
DO $$
DECLARE
  v_hoje date := public.hoje_brasil();
  v_semanal integer;
  v_anual integer;
  v_qtd integer;
  v_proxima date;
BEGIN
  -- calcular_proxima_data mantém o comportamento antigo e ganha 'anual'
  IF public.calcular_proxima_data('2026-01-31', 'mensal') <> '2026-02-28' THEN RAISE EXCEPTION 'FALHA: mensal'; END IF;
  IF public.calcular_proxima_data('2026-05-10', 'anual') <> '2027-05-10' THEN RAISE EXCEPTION 'FALHA: anual'; END IF;
  IF public.proxima_ocorrencia('2026-02-28', 'mensal', 31) <> '2026-03-31' THEN RAISE EXCEPTION 'FALHA: âncora'; END IF;
  IF public.proxima_ocorrencia('2026-02-28', 'desconhecido') IS NOT NULL THEN RAISE EXCEPTION 'FALHA: tipo inválido'; END IF;

  -- despesa semanal parada há 65 dias: gera as 10 ocorrências perdidas de uma vez
  INSERT INTO public.despesas (user_id, dashboard_id, data, descricao, categoria, valor, forma_pagamento,
                               recorrente, tipo_recorrencia, proxima_data)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', v_hoje - 72, 'Diarista',
          'casa', 150, 'pix', true, 'semanal', v_hoje - 65);
  -- receita anual parada há 400 dias: 2 ocorrências (antes 'anual' matava a recorrência)
  INSERT INTO public.receitas (user_id, dashboard_id, data, descricao, categoria, valor, forma_pagamento,
                               recorrente, tipo_recorrencia, proxima_data)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', v_hoje - 765, '13º',
          'salario', 3000, 'pix', true, 'anual', v_hoje - 400);
  -- mensal ancorada no dia 31
  INSERT INTO public.despesas (user_id, dashboard_id, data, descricao, categoria, valor, forma_pagamento,
                               recorrente, tipo_recorrencia, proxima_data)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', '2025-01-31', 'Aluguel',
          'moradia', 1800, 'boleto', true, 'mensal', '2025-02-28');
  UPDATE public.despesas SET configuracao_recorrencia = '{"dia_ancora": 31}' WHERE descricao = 'Aluguel';

  v_semanal := public.processar_despesas_recorrentes();
  v_anual := public.processar_receitas_recorrentes();

  SELECT count(*) INTO v_qtd FROM public.despesas WHERE descricao = 'Diarista (Recorrente)';
  IF v_qtd <> 10 THEN RAISE EXCEPTION 'FALHA: esperadas 10 ocorrências semanais, geradas %', v_qtd; END IF;
  SELECT proxima_data INTO v_proxima FROM public.despesas WHERE descricao = 'Diarista';
  IF v_proxima <> v_hoje + 5 THEN RAISE EXCEPTION 'FALHA: próxima semanal %', v_proxima; END IF;

  SELECT count(*) INTO v_qtd FROM public.receitas WHERE descricao = '13º (Recorrente)';
  IF v_qtd <> 2 THEN RAISE EXCEPTION 'FALHA: esperadas 2 ocorrências anuais, geradas %', v_qtd; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.despesas WHERE descricao = 'Aluguel (Recorrente)' AND data = '2025-03-31') THEN
    RAISE EXCEPTION 'FALHA: âncora do dia 31 não preservada (esperado 31/03/2025)';
  END IF;
  IF EXISTS (SELECT 1 FROM public.despesas WHERE descricao LIKE '% (Recorrente)' AND (status <> 'paga' OR recorrente)) THEN
    RAISE EXCEPTION 'FALHA: cópia deveria ser paga e não recorrente';
  END IF;
  IF EXISTS (SELECT 1 FROM public.despesas WHERE descricao LIKE '% (Recorrente)' AND data > v_hoje) THEN
    RAISE EXCEPTION 'FALHA: gerou ocorrência futura';
  END IF;

  -- rodar de novo não duplica
  IF public.processar_despesas_recorrentes() <> 0 OR public.processar_receitas_recorrentes() <> 0 THEN
    RAISE EXCEPTION 'FALHA: segunda execução gerou duplicatas';
  END IF;

  -- imposto mensal: próxima obrigação aparece com um período de antecedência, em aberto
  INSERT INTO public.impostos (user_id, dashboard_id, tipo, descricao, valor, valor_tipo, vencimento, recorrente,
                               tipo_recorrencia, proxima_data)
  VALUES ('cccccccc-0000-0000-0000-000000000003', 'cccccccc-1111-0000-0000-000000000003', 'imposto', 'DAS', 6,
          'porcentagem', v_hoje - 10, true, 'mensal', public.proxima_ocorrencia(v_hoje - 10, 'mensal'));
  -- imposto antigo (sem periodicidade gravada) não gera nada
  INSERT INTO public.impostos (user_id, dashboard_id, tipo, descricao, valor, vencimento, recorrente)
  VALUES ('cccccccc-0000-0000-0000-000000000003', 'cccccccc-1111-0000-0000-000000000003', 'taxa', 'Alvará', 300, v_hoje - 40, true);

  IF public.processar_impostos_recorrentes() <> 1 THEN RAISE EXCEPTION 'FALHA: imposto recorrente'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.impostos WHERE descricao = 'DAS' AND NOT pago AND NOT recorrente
                 AND valor_tipo = 'porcentagem' AND vencimento = public.proxima_ocorrencia(v_hoje - 10, 'mensal')) THEN
    RAISE EXCEPTION 'FALHA: obrigação gerada com dados errados';
  END IF;
  IF (SELECT count(*) FROM public.impostos WHERE descricao = 'Alvará') <> 1 THEN RAISE EXCEPTION 'FALHA: imposto antigo gerou cópia'; END IF;
  IF public.processar_impostos_recorrentes() <> 0 THEN RAISE EXCEPTION 'FALHA: imposto duplicado'; END IF;

  -- o job do cron chama o SQL direto
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-recurring-transactions'
                 AND schedule = '1 3 * * *' AND command LIKE '%processar_receitas_recorrentes%') THEN
    RAISE EXCEPTION 'FALHA: cron de recorrências não agendado';
  END IF;
END $$;
