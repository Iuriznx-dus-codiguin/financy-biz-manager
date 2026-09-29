-- pg_cron e o SQL editor conectam direto (session_user = postgres) e continuam executando tudo.
DO $$ BEGIN
  IF NOT public.chamador_privilegiado() THEN RAISE EXCEPTION 'FALHA: conexão direta não é privilegiada'; END IF;
  PERFORM public.processar_receitas_recorrentes();
  PERFORM public.processar_despesas_recorrentes();
  PERFORM public.processar_transacoes_recorrentes_usuario('aaaaaaaa-0000-0000-0000-000000000001'::uuid);
END $$;
