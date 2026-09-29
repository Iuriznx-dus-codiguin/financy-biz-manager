-- A-03: sem assinatura ativa não se grava nem altera dado financeiro; ler e apagar continua livre.
-- A-06: limite de dashboards do plano imposto no banco.

-- B (aguardando pagamento)
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', false),
       set_config('request.jwt.claim.role', 'authenticated', false);

DO $$ BEGIN
  IF public.minha_assinatura_ativa() THEN RAISE EXCEPTION 'FALHA: B aparece com assinatura ativa'; END IF;
  BEGIN
    INSERT INTO public.receitas (user_id, dashboard_id, data, descricao, categoria, valor, forma_pagamento)
    VALUES ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-1111-0000-0000-000000000002', current_date, 'x', 'vendas', 10, 'pix');
    RAISE EXCEPTION 'FALHA: B gravou receita sem assinatura';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.metas (user_id, dashboard_id, titulo, valor_meta, prazo, categoria)
    VALUES ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-1111-0000-0000-000000000002', 'x', 100, current_date, 'x');
    RAISE EXCEPTION 'FALHA: B gravou meta sem assinatura';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- B não consulta a assinatura de outra pessoa
  IF public.tem_assinatura_ativa('aaaaaaaa-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'FALHA: B consultou a assinatura de A';
  END IF;
  -- mas pode ler e apagar o que é dele
  PERFORM 1 FROM public.receitas;
  DELETE FROM public.receitas WHERE user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
END $$;

-- A (Plus Pessoal ativo) grava, altera e lê; não passa do limite de 1 dashboard
RESET ROLE; SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);
DO $$ BEGIN
  IF NOT public.minha_assinatura_ativa() THEN RAISE EXCEPTION 'FALHA: A sem assinatura ativa'; END IF;
  INSERT INTO public.despesas (user_id, dashboard_id, data, descricao, categoria, valor, forma_pagamento)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', current_date, 'Mercado', 'alimentacao', 120.5, 'pix');
  UPDATE public.despesas SET valor = 130 WHERE descricao = 'Mercado';
  IF NOT FOUND THEN RAISE EXCEPTION 'FALHA: A não alterou a própria despesa'; END IF;
  BEGIN
    INSERT INTO public.user_dashboards (user_id, name, type) VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Segundo', 'personal');
    RAISE EXCEPTION 'FALHA: Plus Pessoal criou o 2º dashboard';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Seu plano permite 1 perfil%' THEN RAISE; END IF;
  END;
END $$;

-- C (PRO Empresarial) cria até 2 dashboards
RESET ROLE; SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', false);
DO $$ BEGIN
  INSERT INTO public.user_dashboards (user_id, name, type) VALUES ('cccccccc-0000-0000-0000-000000000003', 'Filial', 'business');
  BEGIN
    INSERT INTO public.user_dashboards (user_id, name, type) VALUES ('cccccccc-0000-0000-0000-000000000003', 'Terceira', 'business');
    RAISE EXCEPTION 'FALHA: PRO Empresarial criou o 3º dashboard';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Seu plano permite 2%' THEN RAISE; END IF;
  END;
END $$;

-- D (desenvolvedor) não tem limite e grava sem assinatura paga
RESET ROLE; SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'dddddddd-0000-0000-0000-000000000004', false);
DO $$ BEGIN
  INSERT INTO public.user_dashboards (id, user_id, name, type, is_default)
  VALUES ('dddddddd-1111-0000-0000-000000000004', 'dddddddd-0000-0000-0000-000000000004', 'Dev 1', 'personal', true);
  INSERT INTO public.user_dashboards (user_id, name, type) VALUES ('dddddddd-0000-0000-0000-000000000004', 'Dev 2', 'business');
  INSERT INTO public.user_dashboards (user_id, name, type) VALUES ('dddddddd-0000-0000-0000-000000000004', 'Dev 3', 'business');
  INSERT INTO public.receitas (user_id, dashboard_id, data, descricao, categoria, valor, forma_pagamento)
  VALUES ('dddddddd-0000-0000-0000-000000000004', 'dddddddd-1111-0000-0000-000000000004', current_date, 'teste', 'vendas', 1, 'pix');
END $$;

-- B cria o primeiro dashboard (onboarding) mesmo sem pagar, mas não o segundo
RESET ROLE; SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', false);
DO $$ BEGIN
  BEGIN
    INSERT INTO public.user_dashboards (user_id, name, type) VALUES ('bbbbbbbb-0000-0000-0000-000000000002', 'Outro', 'personal');
    RAISE EXCEPTION 'FALHA: usuário sem assinatura criou o 2º dashboard';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Seu plano permite 0%' THEN RAISE; END IF;
  END;
END $$;
