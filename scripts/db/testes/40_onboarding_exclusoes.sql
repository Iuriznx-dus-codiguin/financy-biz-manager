-- A-26/A-30: onboarding atômico e com o tipo de dashboard escolhido; A-28: exclusões transacionais.

-- A cadastra um telefone
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false),
       set_config('request.jwt.claim.role', 'authenticated', false);
UPDATE public.profiles SET telefone = '(11) 98888-7777' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- B (sem pagamento, dashboard padrão "Dashboard Principal" empresarial criado pelo app) conclui como PF
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', false);
DO $$
DECLARE v jsonb; v_dash record;
BEGIN
  -- telefone já usado por A: nada é gravado
  BEGIN
    PERFORM public.concluir_onboarding('{"user_type":"pessoal","nome_preferido":"Bia","whatsapp":"+5511988887777"}');
    RAISE EXCEPTION 'FALHA: aceitou telefone duplicado';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  IF EXISTS (SELECT 1 FROM public.onboarding_data WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'FALHA: onboarding gravado apesar do erro';
  END IF;

  v := public.concluir_onboarding('{
    "user_type": "pessoal", "nome_preferido": "Bia", "whatsapp": "11977776666", "termos_aceitos": true,
    "saldo_conta": 1500.5, "gastos_iniciais": [
      {"descricao": "Aluguel", "valor_mensal": 1200, "categoria": "moradia", "forma_pagamento": "boleto"},
      {"descricao": "Streaming", "valor_mensal": 39.9, "categoria": "lazer", "forma_pagamento": "cartao"},
      {"descricao": "", "valor_mensal": 10}
    ],
    "meta_financeira": "Reserva de emergência", "valor_meta": 10000, "prazo_meta": "1-ano"
  }');
  IF (v ->> 'ja_concluido')::boolean THEN RAISE EXCEPTION 'FALHA: primeira conclusão marcada como repetida'; END IF;

  SELECT * INTO v_dash FROM public.user_dashboards WHERE id = (v ->> 'dashboard_id')::uuid;
  IF v_dash.type <> 'personal' OR v_dash.name <> 'Bia' THEN
    RAISE EXCEPTION 'FALHA: dashboard padrão ficou % / %', v_dash.type, v_dash.name;
  END IF;
  IF (SELECT count(*) FROM public.despesas WHERE user_id = auth.uid()) <> 2 THEN RAISE EXCEPTION 'FALHA: gastos iniciais'; END IF;
  IF (SELECT count(*) FROM public.metas WHERE user_id = auth.uid()) <> 1 THEN RAISE EXCEPTION 'FALHA: meta inicial'; END IF;
  IF (SELECT telefone FROM public.profiles WHERE id = auth.uid()) <> '+5511977776666' THEN RAISE EXCEPTION 'FALHA: telefone'; END IF;

  -- repetir não duplica
  v := public.concluir_onboarding('{"user_type":"pessoal","gastos_iniciais":[{"descricao":"X","valor_mensal":1}]}');
  IF NOT (v ->> 'ja_concluido')::boolean OR (SELECT count(*) FROM public.despesas WHERE user_id = auth.uid()) <> 2 THEN
    RAISE EXCEPTION 'FALHA: onboarding repetido duplicou dados';
  END IF;

  -- continua sem poder lançar direto (paywall)
  BEGIN
    INSERT INTO public.despesas (user_id, data, descricao, categoria, valor, forma_pagamento)
    VALUES (auth.uid(), current_date, 'x', 'x', 1, 'pix');
    RAISE EXCEPTION 'FALHA: lançou sem assinatura depois do onboarding';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- C exclui a filial com tudo dentro; não exclui o principal nem o de outra pessoa
SELECT set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', false);
INSERT INTO public.user_dashboards (id, user_id, name, type) VALUES ('cccccccc-2222-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000003', 'Filial', 'business');
INSERT INTO public.despesas (user_id, dashboard_id, data, descricao, categoria, valor, forma_pagamento)
VALUES ('cccccccc-0000-0000-0000-000000000003', 'cccccccc-2222-0000-0000-000000000003', current_date, 'Luz', 'estrutura', 300, 'boleto');
INSERT INTO public.equipe_membros (user_id, dashboard_id, nome, email, cargo, salario)
VALUES ('cccccccc-0000-0000-0000-000000000003', 'cccccccc-2222-0000-0000-000000000003', 'Ana', 'ana@x.com', 'Caixa', 2000);
DO $$ BEGIN
  BEGIN
    PERFORM public.excluir_dashboard('cccccccc-1111-0000-0000-000000000003');
    RAISE EXCEPTION 'FALHA: excluiu o dashboard principal';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;
  BEGIN
    PERFORM public.excluir_dashboard('aaaaaaaa-1111-0000-0000-000000000001');
    RAISE EXCEPTION 'FALHA: excluiu dashboard de outro usuário';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM public.excluir_dashboard('cccccccc-2222-0000-0000-000000000003');
  IF EXISTS (SELECT 1 FROM public.despesas WHERE dashboard_id = 'cccccccc-2222-0000-0000-000000000003')
     OR EXISTS (SELECT 1 FROM public.equipe_membros WHERE dashboard_id = 'cccccccc-2222-0000-0000-000000000003')
     OR EXISTS (SELECT 1 FROM public.user_dashboards WHERE id = 'cccccccc-2222-0000-0000-000000000003') THEN
    RAISE EXCEPTION 'FALHA: sobrou dado do dashboard excluído';
  END IF;
END $$;

-- A apaga os próprios dados: lançamentos somem, assinatura fica
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);
DO $$ BEGIN
  PERFORM public.apagar_meus_dados();
  IF EXISTS (SELECT 1 FROM public.receitas WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM public.user_dashboards WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'FALHA: dados não apagados';
  END IF;
  IF NOT public.minha_assinatura_ativa() THEN RAISE EXCEPTION 'FALHA: assinatura apagada junto'; END IF;
END $$;
