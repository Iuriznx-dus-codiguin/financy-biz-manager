-- O app processa só as recorrências do próprio usuário.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false),
       set_config('request.jwt.claim.role', 'authenticated', false);

INSERT INTO public.despesas (user_id, dashboard_id, data, descricao, categoria, valor, forma_pagamento,
                             recorrente, tipo_recorrencia, proxima_data)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', public.hoje_brasil() - 31,
        'Internet', 'moradia', 99.9, 'pix', true, 'mensal', public.proxima_ocorrencia(public.hoje_brasil() - 31, 'mensal'));

DO $$
DECLARE v jsonb;
BEGIN
  v := public.processar_transacoes_recorrentes_usuario('aaaaaaaa-0000-0000-0000-000000000001'::uuid);
  IF (v ->> 'despesas_processadas')::int <> 1 OR (v ->> 'total')::int <> 1 THEN
    RAISE EXCEPTION 'FALHA: resultado inesperado %', v;
  END IF;
  BEGIN
    PERFORM public.processar_despesas_recorrentes();
    RAISE EXCEPTION 'FALHA: usuário executou o processamento global';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
