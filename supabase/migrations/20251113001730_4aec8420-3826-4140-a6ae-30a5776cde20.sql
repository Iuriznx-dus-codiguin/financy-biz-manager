-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Criar cron job para processar webhooks agendados todos os dias às 10h UTC
SELECT cron.schedule(
  'process-scheduled-webhooks-daily',
  '0 10 * * *', -- Todo dia às 10h UTC
  $$
  SELECT
    net.http_post(
      url:='https://hbyozfmpsgbxofcetdez.supabase.co/functions/v1/process-scheduled-webhooks',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhieW96Zm1wc2dieG9mY2V0ZGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTM1OTgsImV4cCI6MjA2NjYyOTU5OH0.Ogr-M8tUAdiPP-AaK7oHtkLunSIc2xCdjKsiKeUiuRM"}'::jsonb,
      body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Comentário para documentação
COMMENT ON EXTENSION pg_cron IS 'Extensão para agendar tarefas recorrentes no PostgreSQL';