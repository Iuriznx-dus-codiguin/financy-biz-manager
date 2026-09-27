-- =============================================================================
-- Financy — inspeção do banco de produção (SOMENTE LEITURA)
-- =============================================================================
-- Rode no SQL Editor do Supabase (projeto hbyozfmpsgbxofcetdez) e me envie o
-- resultado de cada bloco. Nenhuma consulta altera dados nem expõe dados pessoais:
-- tudo é metadado ou agregado. Os blocos são independentes; se um falhar
-- (tabela/extensão inexistente), siga para o próximo e me avise qual falhou.
-- =============================================================================

-- 1. Tabelas: RLS ligada/forçada, linhas estimadas e quantidade de policies
SELECT c.relname AS tabela,
       c.relrowsecurity AS rls,
       c.relforcerowsecurity AS rls_forcada,
       c.reltuples::bigint AS linhas_estimadas,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
ORDER BY c.relrowsecurity, c.relname;

-- 2. Todas as policies (atenção às tabelas sem CREATE TABLE versionado:
--    validacao_n8n, usuarios_assinatura, equipe_membros, equipe_membros_audit,
--    notificacoes, security_audit_logs, user_tour_progress, auth_rate_limits)
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- 3. Privilégios de tabela concedidos a anon/authenticated
SELECT table_name, grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privilegios
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;

-- 4. Funções: SECURITY DEFINER e quem pode executar
SELECT p.proname AS funcao,
       pg_get_function_identity_arguments(p.oid) AS argumentos,
       p.prosecdef AS security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_executa,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_executa
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.prosecdef DESC, p.proname;

-- 5. Colunas das tabelas criadas fora das migrações
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('validacao_n8n', 'usuarios_assinatura', 'equipe_membros', 'equipe_membros_audit',
                     'notificacoes', 'security_audit_logs', 'user_tour_progress', 'auth_rate_limits')
ORDER BY table_name, ordinal_position;

-- 6. Triggers de todas as tabelas públicas (e de auth.users)
SELECT event_object_schema AS schema, event_object_table AS tabela, trigger_name,
       action_timing AS momento, string_agg(event_manipulation, ',') AS eventos, action_statement
FROM information_schema.triggers
WHERE event_object_schema IN ('public', 'auth')
GROUP BY 1, 2, 3, 4, 6
ORDER BY 1, 2, 3;

-- 7. Definição das funções sem versão no repositório e das que podem ter falhado
SELECT p.proname, pg_get_functiondef(p.oid) AS definicao
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('log_security_event', 'check_auth_rate_limit', 'encrypt_sensitive_data',
                    'validate_developer_key', 'get_dashboard_stats', 'cleanup_expired_cache',
                    'deactivate_old_phone_numbers', 'sync_phone_to_validacao_n8n');

-- 8. Jobs do cron e as 20 últimas execuções de cada um
SELECT jobid, jobname, schedule, active, command FROM cron.job ORDER BY jobid;

SELECT j.jobname, d.status, d.start_time, left(d.return_message, 200) AS mensagem
FROM cron.job_run_details d
JOIN cron.job j ON j.jobid = d.jobid
WHERE d.start_time > now() - interval '20 days'
ORDER BY d.start_time DESC
LIMIT 60;

-- 9. Respostas HTTP que o pg_net recebeu das functions chamadas pelo cron
--    (confirma se process-recurring-transactions respondia 401)
SELECT id, status_code, left(content::text, 160) AS corpo, created
FROM net._http_response
ORDER BY created DESC
LIMIT 30;

-- 10. Unidade do valor enviado pela Cakto (sem dados pessoais: só valores e ids de oferta)
SELECT created_at::date AS dia, event_type, plan_id, amount AS valor_gravado,
       payload #>> '{data,amount}'        AS data_amount,
       payload #>> '{data,baseAmount}'    AS data_base_amount,
       payload #>> '{data,offer,price}'   AS offer_price,
       payload #>> '{data,offer,id}'      AS offer_id,
       payload #>> '{data,offer,name}'    AS offer_name,
       payload #>> '{data,product,name}'  AS product_name,
       payload #>> '{data,paymentMethod}' AS payment_method,
       payload #>> '{data,subscription,id}' AS subscription_id
FROM public.cakto_webhook_logs
WHERE category = 'approved'
ORDER BY created_at DESC
LIMIT 30;

-- 10b. Chaves presentes no payload (para mapear o contrato real da Cakto)
SELECT k1 AS chave_nivel_1, k2 AS chave_em_data, count(*)
FROM public.cakto_webhook_logs l
CROSS JOIN LATERAL jsonb_object_keys(coalesce(l.payload, '{}'::jsonb)) k1
LEFT JOIN LATERAL jsonb_object_keys(CASE WHEN jsonb_typeof(l.payload -> 'data') = 'object' THEN l.payload -> 'data' ELSE '{}'::jsonb END) k2 ON k1 = 'data'
GROUP BY 1, 2
ORDER BY 1, 2;

-- 11. Situação das assinaturas (agregado)
SELECT subscription_type, plan_id, status,
       count(*) AS usuarios,
       count(*) FILTER (WHERE expires_at IS NULL) AS sem_expiracao,
       count(*) FILTER (WHERE expires_at < now()) AS expiradas_pela_data
FROM public.user_subscriptions
GROUP BY 1, 2, 3
ORDER BY 4 DESC;

-- 12. Contas ativas que NÃO vieram de pagamento (possível uso de renew_subscription)
SELECT count(*) AS ativas_sem_plano_pago
FROM public.user_subscriptions
WHERE status = 'active'
  AND subscription_type NOT IN ('personal', 'business', 'developer');

-- 13. Quem tem mais dashboards do que o plano gravado permite
SELECT us.plan_id, (us.features ->> 'max_dashboards')::int AS limite, count(d.id) AS dashboards, count(DISTINCT us.user_id) AS usuarios
FROM public.user_subscriptions us
JOIN public.user_dashboards d ON d.user_id = us.user_id
GROUP BY us.user_id, us.plan_id, us.features
HAVING count(d.id) > coalesce((us.features ->> 'max_dashboards')::int, 1)
   AND coalesce((us.features ->> 'max_dashboards')::int, 1) <> -1;

-- 14. WhatsApp: telefones ativos na validacao_n8n sem assinatura ativa (agregado)
SELECT (v.ativo IS TRUE) AS telefone_ativo,
       coalesce(us.status, 'sem_assinatura') AS status_assinatura,
       count(*) AS registros
FROM public.validacao_n8n v
LEFT JOIN public.user_subscriptions us ON us.user_id = v.user_id
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;

-- 15. Receitas de assinatura gravadas no dashboard do próprio comprador
SELECT count(*) AS receitas_de_assinatura, count(DISTINCT user_id) AS usuarios, sum(valor) AS total
FROM public.receitas
WHERE cakto_transaction_id IS NOT NULL;

-- 16. Recorrências: tipos usados, datas vencidas e recorrências "mortas" (proxima_data nula)
SELECT 'receitas' AS tabela, tipo_recorrencia, count(*) AS total,
       count(*) FILTER (WHERE proxima_data IS NULL) AS sem_proxima_data,
       count(*) FILTER (WHERE proxima_data < current_date) AS atrasadas
FROM public.receitas WHERE recorrente GROUP BY 2
UNION ALL
SELECT 'despesas', tipo_recorrencia, count(*),
       count(*) FILTER (WHERE proxima_data IS NULL),
       count(*) FILTER (WHERE proxima_data < current_date)
FROM public.despesas WHERE recorrente GROUP BY 2;

-- 17. Restrição de agent_type em ai_conversations (o ai-agent grava 'financy_assistant')
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'public.ai_conversations'::regclass AND contype = 'c';

SELECT agent_type, count(*) FROM public.ai_conversations GROUP BY 1;

-- 18. Índices existentes nas tabelas financeiras
SELECT tablename, indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN ('receitas', 'despesas', 'impostos', 'metas', 'user_dashboards', 'user_subscriptions')
ORDER BY 1, 2;

-- 19. Papéis de administrador cadastrados (apenas contagem)
SELECT role, count(*) FROM public.user_roles GROUP BY 1;

-- 20. Segredos do Vault já criados (só nomes)
SELECT name, created_at FROM vault.secrets ORDER BY created_at;
