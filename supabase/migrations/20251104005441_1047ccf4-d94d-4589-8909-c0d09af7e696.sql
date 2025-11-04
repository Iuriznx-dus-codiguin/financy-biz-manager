-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agendar execução diária do lembrete às 20:00 (horário de Brasília = UTC-3)
-- 20:00 BRT = 23:00 UTC
SELECT cron.schedule(
  'daily-transaction-reminder',
  '0 23 * * *', -- Todo dia às 23:00 UTC (20:00 BRT)
  $$
  SELECT
    net.http_post(
      url := 'https://hbyozfmpsgbxofcetdez.supabase.co/functions/v1/daily-transaction-reminder',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhieW96Zm1wc2dieG9mY2V0ZGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTM1OTgsImV4cCI6MjA2NjYyOTU5OH0.Ogr-M8tUAdiPP-AaK7oHtkLunSIc2xCdjKsiKeUiuRM"}'::jsonb,
      body := '{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);

-- Comentário explicativo sobre o cron job
COMMENT ON EXTENSION pg_cron IS 'Agendamento de tarefas periódicas no PostgreSQL';

-- Verificar cron jobs ativos (para log/debug)
-- SELECT * FROM cron.job;