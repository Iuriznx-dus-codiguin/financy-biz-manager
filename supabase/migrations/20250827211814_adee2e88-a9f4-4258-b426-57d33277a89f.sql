-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar cron job para processar transações recorrentes diariamente às 00:01
SELECT cron.schedule(
  'process-recurring-transactions',
  '1 0 * * *', -- Todo dia às 00:01
  $$
  SELECT
    net.http_post(
        url:='https://hbyozfmpsgbxofcetdez.supabase.co/functions/v1/process-recurring-transactions',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhieW96Zm1wc2dieG9mY2V0ZGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTM1OTgsImV4cCI6MjA2NjYyOTU5OH0.Ogr-M8tUAdiPP-AaK7oHtkLunSIc2xCdjKsiKeUiuRM"}'::jsonb,
        body:=concat('{"scheduled_at": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);