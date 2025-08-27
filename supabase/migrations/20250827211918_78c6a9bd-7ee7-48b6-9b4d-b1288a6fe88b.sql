-- Mover extensões para schemas específicos para melhorar segurança
DROP EXTENSION IF EXISTS pg_cron;
DROP EXTENSION IF EXISTS pg_net;

-- Criar schema para extensões se não existir
CREATE SCHEMA IF NOT EXISTS extensions;

-- Instalar extensões no schema extensions ao invés do public
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Recriar o cron job usando o schema correto
SELECT extensions.cron.schedule(
  'process-recurring-transactions',
  '1 0 * * *', -- Todo dia às 00:01
  $$
  SELECT
    extensions.net.http_post(
        url:='https://hbyozfmpsgbxofcetdez.supabase.co/functions/v1/process-recurring-transactions',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhieW96Zm1wc2dieG9mY2V0ZGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTM1OTgsImV4cCI6MjA2NjYyOTU5OH0.Ogr-M8tUAdiPP-AaK7oHtkLunSIc2xCdjKsiKeUiuRM"}'::jsonb,
        body:=concat('{"scheduled_at": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);