-- Desativa o cron job 'process-recurring-transactions' que falha diariamente
-- por falta de CRON_SECRET_TOKEN. O processamento real é feito pela função
-- processar_transacoes_recorrentes_usuario() invocada pelo front-end on-demand.
SELECT cron.unschedule('process-recurring-transactions')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-recurring-transactions');