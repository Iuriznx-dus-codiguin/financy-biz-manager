-- A-04: os jobs que chamam functions enviam x-cron-secret lido do Vault; o de recorrências chama SQL.
SELECT vault.create_secret('segredo-de-teste', 'cron_secret');

DO $$
DECLARE
  j record;
  r record;
BEGIN
  FOR j IN SELECT * FROM cron.job WHERE jobname IN ('daily-transaction-reminder', 'process-scheduled-webhooks-daily') LOOP
    EXECUTE j.command;
  END LOOP;

  IF (SELECT count(*) FROM net.requisicoes) <> 2 THEN RAISE EXCEPTION 'FALHA: jobs não chamaram as functions'; END IF;
  FOR r IN SELECT * FROM net.requisicoes LOOP
    IF r.headers ->> 'x-cron-secret' <> 'segredo-de-teste' THEN
      RAISE EXCEPTION 'FALHA: % sem x-cron-secret', r.url;
    END IF;
    IF r.headers ->> 'Authorization' NOT LIKE 'Bearer eyJ%' THEN
      RAISE EXCEPTION 'FALHA: % sem a chave do gateway', r.url;
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM net.requisicoes WHERE url LIKE '%/daily-transaction-reminder')
     OR NOT EXISTS (SELECT 1 FROM net.requisicoes WHERE url LIKE '%/process-scheduled-webhooks') THEN
    RAISE EXCEPTION 'FALHA: URLs dos jobs mudaram';
  END IF;
  IF (SELECT schedule FROM cron.job WHERE jobname = 'daily-transaction-reminder') <> '0 23 * * *'
     OR (SELECT schedule FROM cron.job WHERE jobname = 'process-scheduled-webhooks-daily') <> '0 10 * * *' THEN
    RAISE EXCEPTION 'FALHA: horários dos jobs mudaram';
  END IF;

  -- recorrências: executa o comando do job de verdade
  EXECUTE (SELECT command FROM cron.job WHERE jobname = 'process-recurring-transactions');
END $$;
