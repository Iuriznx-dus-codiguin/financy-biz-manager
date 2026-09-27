-- A-01 / A-02: RPCs SECURITY DEFINER não podem ser usadas contra outros usuários.

-- anon (chave pública) não ativa assinatura de ninguém
SET ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'anon', false);
DO $$ BEGIN
  BEGIN
    PERFORM public.renew_subscription('bbbbbbbb-0000-0000-0000-000000000002'::uuid, now() + interval '10 years');
    RAISE EXCEPTION 'FALHA: anon executou renew_subscription';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- usuário B (sem pagamento) não se ativa sozinho
RESET ROLE; SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', false),
       set_config('request.jwt.claim.role', 'authenticated', false);
DO $$ BEGIN
  BEGIN
    PERFORM public.renew_subscription('bbbbbbbb-0000-0000-0000-000000000002'::uuid);
    RAISE EXCEPTION 'FALHA: usuário executou renew_subscription';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- B não lê os dados financeiros de A
DO $$ BEGIN
  BEGIN
    PERFORM public.get_dashboard_data('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-1111-0000-0000-000000000001'::uuid, false);
    RAISE EXCEPTION 'FALHA: get_dashboard_data devolveu dados de outro usuário';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- B não processa recorrências de A, não lê o perfil de A nem esgota a cota de IA de A
DO $$ BEGIN
  BEGIN
    PERFORM public.processar_transacoes_recorrentes_usuario('aaaaaaaa-0000-0000-0000-000000000001'::uuid);
    RAISE EXCEPTION 'FALHA: processou recorrências de outro usuário';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM * FROM public.get_user_profile_data('aaaaaaaa-0000-0000-0000-000000000001'::uuid);
    RAISE EXCEPTION 'FALHA: leu perfil de outro usuário';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.check_and_increment_rate_limit('aaaaaaaa-0000-0000-0000-000000000001', 'ai_message', 1, 1440);
    RAISE EXCEPTION 'FALHA: manipulou o limite de IA de outro usuário';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.get_user_main_dashboard('aaaaaaaa-0000-0000-0000-000000000001'::uuid);
    RAISE EXCEPTION 'FALHA: criou/leu dashboard de outro usuário';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- ...mas usa as mesmas RPCs para si mesmo
DO $$
DECLARE v jsonb; perfil record;
BEGIN
  v := public.processar_transacoes_recorrentes_usuario('bbbbbbbb-0000-0000-0000-000000000002'::uuid);
  IF v IS NULL THEN RAISE EXCEPTION 'FALHA: recorrências do próprio usuário'; END IF;
  SELECT * INTO perfil FROM public.get_user_profile_data('bbbbbbbb-0000-0000-0000-000000000002'::uuid);
  IF perfil IS NULL THEN RAISE EXCEPTION 'FALHA: perfil do próprio usuário (antes falhava com user_id ambíguo)'; END IF;
  IF NOT public.ensure_user_has_subscription('bbbbbbbb-0000-0000-0000-000000000002'::uuid) THEN
    RAISE EXCEPTION 'FALHA: ensure_user_has_subscription';
  END IF;
END $$;

-- service_role (functions) continua podendo tudo
RESET ROLE; SET ROLE service_role;
SELECT set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'service_role', false);
DO $$ BEGIN
  IF public.get_user_main_dashboard('aaaaaaaa-0000-0000-0000-000000000001'::uuid) IS NULL THEN
    RAISE EXCEPTION 'FALHA: service_role sem acesso a get_user_main_dashboard';
  END IF;
  PERFORM public.get_dashboard_data('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-1111-0000-0000-000000000001'::uuid, false);
  PERFORM public.check_and_increment_rate_limit('aaaaaaaa-0000-0000-0000-000000000001', 'teste', 5, 10);
END $$;

-- A-09: logs da Cakto só para admin (tier developer não basta)
RESET ROLE; SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'dddddddd-0000-0000-0000-000000000004', false),
       set_config('request.jwt.claim.role', 'authenticated', false),
       set_config('request.jwt.claim.email', 'd@teste.com', false);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cakto_webhook_logs' AND policyname = 'Developers can read cakto webhook logs') THEN
    RAISE EXCEPTION 'FALHA: policy por tier developer ainda existe';
  END IF;
END $$;
