-- Manter extensões no schema correto mas usar path de busca para acessá-las
-- Primeiro, limpar cron job anterior se existir
DO $$
BEGIN
    -- Tentar desagendar job anterior
    PERFORM cron.unschedule('process-recurring-transactions');
EXCEPTION
    WHEN others THEN
        -- Ignorar erro se job não existir
        NULL;
END $$;

-- Configurar search_path para incluir o schema extensions
SET search_path = extensions, public;

-- Recriar o cron job com search_path configurado
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