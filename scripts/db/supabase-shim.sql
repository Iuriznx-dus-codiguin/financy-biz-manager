-- Shim mínimo do ambiente Supabase para validar migrações num PostgreSQL local.
-- NÃO é aplicado em produção. Reproduz apenas o que as migrações do projeto usam:
-- roles, schema auth, extensões agendadoras (pg_cron/pg_net simuladas) e as
-- tabelas/funções que existem no banco real mas nunca foram versionadas.

DO $$ BEGIN
  CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- O PostgREST conecta como `authenticator` e faz SET ROLE para anon/authenticated/service_role.
DO $$ BEGIN
  CREATE ROLE authenticator LOGIN NOINHERIT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT anon, authenticated, service_role TO authenticator;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
ALTER DATABASE postgres SET search_path = public, extensions;
SET search_path = public, extensions;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Claims da requisição simulados via GUC, como o PostgREST faz.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;
CREATE OR REPLACE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.email', true), '')
$$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object('sub', auth.uid(), 'role', auth.role(), 'email', auth.email())
$$;

GRANT USAGE ON SCHEMA public, auth, extensions TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

-- pg_cron e pg_net simulados (as migrações só agendam/desagendam jobs).
CREATE SCHEMA IF NOT EXISTS cron;
CREATE TABLE IF NOT EXISTS cron.job (jobid serial PRIMARY KEY, jobname text UNIQUE, schedule text, command text, active boolean NOT NULL DEFAULT true);
CREATE OR REPLACE FUNCTION cron.schedule(p_name text, p_schedule text, p_command text) RETURNS bigint
LANGUAGE sql AS $$
  INSERT INTO cron.job (jobname, schedule, command) VALUES (p_name, p_schedule, p_command)
  ON CONFLICT (jobname) DO UPDATE SET schedule = EXCLUDED.schedule, command = EXCLUDED.command
  RETURNING jobid::bigint
$$;
CREATE OR REPLACE FUNCTION cron.unschedule(p_name text) RETURNS boolean
LANGUAGE sql AS $$ DELETE FROM cron.job WHERE jobname = p_name RETURNING true $$;
CREATE SCHEMA IF NOT EXISTS net;
CREATE TABLE IF NOT EXISTS net.requisicoes (id bigserial PRIMARY KEY, url text, headers jsonb, body jsonb);
CREATE OR REPLACE FUNCTION net.http_post(url text, headers jsonb DEFAULT '{}'::jsonb, body jsonb DEFAULT '{}'::jsonb)
RETURNS bigint LANGUAGE sql AS $$ INSERT INTO net.requisicoes (url, headers, body) VALUES (url, headers, body) RETURNING id $$;

DO $$ BEGIN
  CREATE PUBLICATION supabase_realtime; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabelas que existem no banco real (src/integrations/supabase/types.ts) sem CREATE TABLE versionado.
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, action text NOT NULL, table_name text NOT NULL,
  record_id text, old_values jsonb, new_values jsonb, risk_level text, ip_address inet, user_agent text,
  "timestamp" timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), identifier text NOT NULL UNIQUE, attempts integer DEFAULT 0,
  window_start timestamptz DEFAULT now(), blocked_until timestamptz, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.usuarios_assinatura (
  id serial PRIMARY KEY, email text, nome_cliente text, telefone_cliente text, data_assinatura timestamptz,
  data_renovacao timestamptz, data_finalizacao_teste timestamptz, criado_em timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.validacao_n8n (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, email text, telefone text, nome_cliente text,
  plano text, data_cadastro timestamptz DEFAULT now(), data_inicio_assinatura timestamptz,
  data_finalizacao_teste timestamptz, proxima_cobranca timestamptz
);
CREATE TABLE IF NOT EXISTS public.equipe_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, dashboard_id uuid, nome text NOT NULL,
  email text NOT NULL, telefone text, cargo text NOT NULL, salario numeric NOT NULL, status text NOT NULL DEFAULT 'ativo',
  periodicidade text NOT NULL DEFAULT 'mensal', data_admissao date NOT NULL DEFAULT current_date, permissoes jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.equipe_membros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipe_membros_owner" ON public.equipe_membros FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TABLE IF NOT EXISTS public.equipe_membros_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, member_id uuid, action text NOT NULL,
  old_data jsonb, new_data jsonb, ip_address text, user_agent text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, tipo text NOT NULL, titulo text NOT NULL,
  mensagem text NOT NULL, lida boolean DEFAULT false, data_vencimento date, metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.user_tour_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, tour_name text NOT NULL,
  step_completed integer DEFAULT 0, completed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

-- Funções que existem no banco real sem definição versionada (assinaturas de types.ts).
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid, p_action text, p_table_name text, p_record_id text DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL, p_new_values jsonb DEFAULT NULL, p_risk_level text DEFAULT 'low'
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.security_audit_logs (user_id, action, table_name, record_id, old_values, new_values, risk_level)
  VALUES (p_user_id, p_action, p_table_name, p_record_id, p_old_values, p_new_values, p_risk_level)
$$;
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(
  p_identifier text, p_max_attempts integer DEFAULT 5, p_window_minutes integer DEFAULT 15, p_block_minutes integer DEFAULT 30
) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT true $$;
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(p_data text) RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT p_data $$;

-- Vault simulado (Supabase Vault): segredos lidos pelos jobs do cron.
CREATE SCHEMA IF NOT EXISTS vault;
CREATE TABLE IF NOT EXISTS vault.secrets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text UNIQUE, secret text, created_at timestamptz DEFAULT now());
CREATE OR REPLACE VIEW vault.decrypted_secrets AS SELECT id, name, secret AS decrypted_secret, created_at FROM vault.secrets;
CREATE OR REPLACE FUNCTION vault.create_secret(p_secret text, p_name text) RETURNS uuid
LANGUAGE sql AS $$ INSERT INTO vault.secrets (name, secret) VALUES (p_name, p_secret) RETURNING id $$;
