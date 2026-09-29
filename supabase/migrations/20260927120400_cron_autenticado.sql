-- =============================================================================
-- Cron autenticado para as functions que disparam o n8n (AUDITORIA A-04)
-- =============================================================================
-- daily-transaction-reminder e process-scheduled-webhooks passaram a exigir o header
-- x-cron-secret igual ao secret CRON_SECRET_TOKEN das functions. O segredo é lido do Vault
-- na hora da execução (nada sensível fica no job). Sem o segredo no Vault, o header vai vazio
-- e a function responde 401 (falha fechada): lembrete e avisos param, nada vaza.
--
-- Mesmos nomes, horários e URLs dos jobs anteriores; só os headers mudam.
--
-- PRÉ-REQUISITO (uma vez, no SQL editor, com o MESMO valor do secret CRON_SECRET_TOKEN):
--   SELECT vault.create_secret('<valor do CRON_SECRET_TOKEN>', 'cron_secret');
--
-- REVERSÃO: reaplicar os jobs de 20251104005441 (daily-transaction-reminder) e
-- 20251113001730 (process-scheduled-webhooks-daily), que enviavam só a chave anon.
-- =============================================================================

DO $$
DECLARE
  v_base constant text := 'https://hbyozfmpsgbxofcetdez.supabase.co/functions/v1/';
  -- Chave anon (pública, a mesma do .env do front): passa pelo verify_jwt do gateway.
  v_anon constant text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhieW96Zm1wc2dieG9mY2V0ZGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTM1OTgsImV4cCI6MjA2NjYyOTU5OH0.Ogr-M8tUAdiPP-AaK7oHtkLunSIc2xCdjKsiKeUiuRM';
  v_headers text;
BEGIN
  IF to_regnamespace('cron') IS NULL THEN
    RAISE NOTICE 'pg_cron indisponível: jobs não reagendados';
    RETURN;
  END IF;

  v_headers := format(
    $h$jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer %s',
      'x-cron-secret', coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1), '')
    )$h$, v_anon);

  PERFORM cron.unschedule(jobname) FROM cron.job WHERE jobname = 'daily-transaction-reminder';
  PERFORM cron.schedule(
    'daily-transaction-reminder',
    '0 23 * * *',
    format($c$SELECT net.http_post(url := %L, headers := %s, body := '{"trigger": "cron"}'::jsonb) AS request_id;$c$,
           v_base || 'daily-transaction-reminder', v_headers)
  );

  PERFORM cron.unschedule(jobname) FROM cron.job WHERE jobname = 'process-scheduled-webhooks-daily';
  PERFORM cron.schedule(
    'process-scheduled-webhooks-daily',
    '0 10 * * *',
    format($c$SELECT net.http_post(url := %L, headers := %s, body := jsonb_build_object('time', now())) AS request_id;$c$,
           v_base || 'process-scheduled-webhooks', v_headers)
  );
END;
$$;
