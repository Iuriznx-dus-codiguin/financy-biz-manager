
-- ============================================================
-- 1. SECURE ROLE SYSTEM (padrão user-roles do projeto)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Migrar admins existentes que estavam em profiles.settings->>role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM public.profiles
WHERE (settings->>'role') = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================
-- 2. ERROR CATALOG (taxonomia versionada)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.error_catalog (
  code text PRIMARY KEY,
  title text NOT NULL,
  tech_description text NOT NULL,
  user_description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','low','info')),
  module text NOT NULL,
  flow text,
  probable_causes jsonb NOT NULL DEFAULT '[]'::jsonb,
  resolution_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_resolvable boolean NOT NULL DEFAULT true,
  related_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  version integer NOT NULL DEFAULT 1,
  changelog jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.error_catalog TO authenticated;
GRANT ALL ON public.error_catalog TO service_role;

ALTER TABLE public.error_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read catalog" ON public.error_catalog;
CREATE POLICY "Authenticated users can read catalog"
  ON public.error_catalog FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage catalog" ON public.error_catalog;
CREATE POLICY "Admins can manage catalog"
  ON public.error_catalog FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS error_catalog_updated_at ON public.error_catalog;
CREATE TRIGGER error_catalog_updated_at
  BEFORE UPDATE ON public.error_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_error_catalog_module ON public.error_catalog(module);
CREATE INDEX IF NOT EXISTS idx_error_catalog_severity ON public.error_catalog(severity);

-- ============================================================
-- 3. ERROR OCCURRENCES (histórico real de falhas)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.error_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  conversation_id uuid,
  ticket_id text,
  error_code text REFERENCES public.error_catalog(code) ON DELETE SET NULL,
  route text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  stack_hash text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','reopened')),
  uncatalogued boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.error_occurrences TO authenticated;
GRANT ALL ON public.error_occurrences TO service_role;

ALTER TABLE public.error_occurrences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view their own occurrences" ON public.error_occurrences;
CREATE POLICY "Users view their own occurrences"
  ON public.error_occurrences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users insert their own occurrences" ON public.error_occurrences;
CREATE POLICY "Users insert their own occurrences"
  ON public.error_occurrences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Admins update occurrences" ON public.error_occurrences;
CREATE POLICY "Admins update occurrences"
  ON public.error_occurrences FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS error_occurrences_updated_at ON public.error_occurrences;
CREATE TRIGGER error_occurrences_updated_at
  BEFORE UPDATE ON public.error_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_err_occ_user ON public.error_occurrences(user_id);
CREATE INDEX IF NOT EXISTS idx_err_occ_code ON public.error_occurrences(error_code);
CREATE INDEX IF NOT EXISTS idx_err_occ_created ON public.error_occurrences(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_err_occ_uncatalogued ON public.error_occurrences(uncatalogued) WHERE uncatalogued = true;

-- ============================================================
-- 4. SEED — Catálogo inicial (baseado na auditoria da plataforma)
-- ============================================================

INSERT INTO public.error_catalog (code, title, tech_description, user_description, severity, module, flow, probable_causes, resolution_steps, ai_resolvable) VALUES

-- AUTH
('AUTH-001','Refresh token inválido','Supabase retorna refresh_token_not_found durante _recoverAndRefresh na inicialização.','Sua sessão expirou. Basta entrar novamente para continuar.','low','AUTH','session_recovery','["Sessão antiga em cache","Logout em outro dispositivo","Token expirado por inatividade"]','["Faça login novamente na tela inicial","Se o problema persistir, limpe o cache do navegador","Verifique se o horário do dispositivo está correto"]',true),
('AUTH-002','Credenciais inválidas','signInWithPassword retornou invalid_login_credentials.','Email ou senha incorretos.','low','AUTH','login','["Senha digitada errada","Email digitado errado","Conta ainda não confirmada"]','["Confira o email digitado","Use \"Esqueci minha senha\" para redefinir","Verifique sua caixa de entrada por um email de confirmação"]',true),
('AUTH-003','Email não confirmado','Login bloqueado até que o email seja verificado.','Confirme seu email antes de acessar.','low','AUTH','email_verification','["Email de confirmação não aberto","Link expirado"]','["Abra o email enviado pela Financy e clique no link","Solicite um novo email de confirmação na tela de login"]',true),
('AUTH-004','Rate limit excedido no login','check_auth_rate_limit bloqueou tentativas por exceder o limite.','Muitas tentativas em pouco tempo. Aguarde alguns minutos.','medium','AUTH','rate_limit','["Várias tentativas seguidas de senha errada","Ataque de força bruta detectado"]','["Aguarde 15 minutos e tente de novo","Use \"Esqueci minha senha\" se realmente esqueceu"]',true),
('AUTH-005','Falha ao enviar email de recuperação','resetPasswordForEmail retornou erro do provedor.','Não conseguimos enviar o email de recuperação agora.','medium','AUTH','password_reset','["Provedor de email fora do ar","Email inexistente","Rate limit"]','["Confira se o email está correto","Aguarde 5 minutos e tente novamente","Contate o suporte se persistir"]',false),

-- SUB (assinatura)
('SUB-001','Assinatura pendente de pagamento','user_subscriptions.status = pending_payment bloqueando funcionalidades.','Sua assinatura ainda não foi ativada. Finalize o pagamento para liberar o acesso.','high','SUB','access_gate','["Pagamento não processado","Webhook do Cakto não recebido","Método de pagamento recusado"]','["Vá em Assinatura e escolha um plano","Complete o checkout","Se já pagou, aguarde alguns minutos ou fale com o suporte"]',true),
('SUB-002','Recurso indisponível no plano atual','useFeatureAccess bloqueou uma funcionalidade fora do plano contratado.','Esse recurso está disponível em planos superiores.','info','SUB','feature_gate','["Plano Plus tentando usar recurso Pro","Limite de dashboards atingido","Equipe indisponível no plano pessoal"]','["Confira os planos disponíveis em Assinatura","Faça upgrade para desbloquear o recurso"]',true),
('SUB-003','Limite de dashboards atingido','max_dashboards do plano atingido ao criar novo dashboard.','Você atingiu o limite de perfis do seu plano.','low','SUB','dashboard_limit','["Todos os slots do plano preenchidos"]','["Exclua um dashboard que não use mais","Faça upgrade para um plano com mais slots"]',true),
('SUB-004','Assinatura em atraso (past_due)','Cobrança recorrente falhou, subscription em past_due.','Sua cobrança recorrente falhou. Atualize o pagamento.','high','SUB','renewal','["Cartão expirado","Saldo insuficiente","Banco recusou a cobrança"]','["Atualize os dados de pagamento na Cakto","Aguarde a nova tentativa automática","Contate seu banco se persistir"]',false),
('SUB-005','Assinatura cancelada','user_subscriptions.status = cancelled.','Sua assinatura foi cancelada.','medium','SUB','cancellation','["Cancelamento pelo usuário","Chargeback processado","Refund aplicado"]','["Reative escolhendo um novo plano em Assinatura","Fale com o suporte se não solicitou o cancelamento"]',true),

-- WBH (webhooks)
('WBH-001','Webhook Cakto sem autenticação','Header x-webhook-secret ausente ou inválido no cakto-webhook.','—','critical','WBH','cakto_auth','["Secret do webhook não configurado no painel Cakto","Rotação de secret sem atualização"]','["Confirme CAKTO_WEBHOOK_SECRET no ambiente","Reconfigure a URL do webhook no painel Cakto","Consulte os logs de auditoria"]',false),
('WBH-002','Payload Cakto inválido','Estrutura recebida não contém campos esperados (email, amount, transaction_id).','—','high','WBH','cakto_parse','["Evento fora do padrão","Mudança no formato do provedor"]','["Registre o payload em cakto_webhook_logs","Ajuste o parser recursivo","Notifique o time"]',false),
('WBH-003','Assinatura duplicada','UNIQUE em receitas.cakto_transaction_id disparou.','—','info','WBH','idempotency','["Retentativa do Cakto para evento já processado"]','["Nenhuma ação necessária — idempotência funcionou"]',true),
('WBH-004','Perfil não encontrado por email','Cakto enviou pagamento para email sem profile correspondente.','—','high','WBH','profile_lookup','["Usuário deletou a conta","Email diferente do usado no signup","Casing/whitespace no email"]','["Confirme email no painel Cakto","Contate o cliente para orientar login com o email correto"]',false),
('WBH-005','Falha ao agendar renovação','process-scheduled-webhooks não conseguiu enfileirar evento.','—','medium','WBH','scheduling','["Erro na inserção em scheduled_webhooks","Cron pausado"]','["Verifique logs do process-scheduled-webhooks","Reative o cron"]',false),

-- DB (banco/RLS)
('DB-001','Violação de RLS','new row violates row-level security policy.','Você não tem permissão para essa ação.','high','DB','rls','["Insert sem user_id","Usuário logado com conta diferente da referenciada","Policy mais restritiva do que o esperado"]','["Confirme que está logado com a conta correta","Reporte ao suporte com o código da operação"]',false),
('DB-002','Registro não encontrado','Query retornou zero linhas onde uma era esperada.','O registro solicitado não existe ou foi removido.','low','DB','not_found','["Registro deletado","ID incorreto","Filtro de dashboard removeu o resultado"]','["Verifique se está no dashboard correto","Recarregue a página","Confira a lista atualizada"]',true),
('DB-003','Duplicidade em índice único','UNIQUE constraint violado.','Já existe um registro com esses dados.','low','DB','conflict','["Categoria/dashboard/etc já cadastrado","Duplo clique no botão de salvar"]','["Confira a lista existente","Edite o item existente em vez de criar novo"]',true),
('DB-004','Query lenta / timeout','statement_timeout ou requisição >30s.','A operação demorou demais. Tente novamente.','medium','DB','performance','["Consulta sem índice","Volume de dados alto sem paginação"]','["Recarregue a página","Filtre por um período menor","Fale com o suporte se persistir"]',true),
('DB-005','Falha ao carregar dashboard','get_dashboard_data retornou erro.','Não conseguimos carregar os dados do seu perfil.','high','DB','dashboard_load','["Perda de conexão","dashboard_id inválido","Cache corrompido"]','["Recarregue a página","Troque de perfil e volte","Limpe o cache do navegador"]',true),

-- AI (IA)
('AI-001','Rate limit da IA atingido','check_and_increment_rate_limit bloqueou requisição de IA.','Você atingiu o limite de mensagens do dia.','info','AI','rate_limit','["Uso intenso do assistente","Limite do plano atingido"]','["Aguarde algumas horas e tente novamente","Faça upgrade para um plano com mais mensagens"]',true),
('AI-002','Créditos do gateway esgotados','Lovable AI gateway retornou 402 (payment required).','O assistente está temporariamente indisponível.','critical','AI','credits','["Créditos da plataforma acabaram"]','["Tente novamente em alguns minutos","Reporte ao suporte se persistir"]',false),
('AI-003','Rate limit do gateway (429)','Lovable AI gateway retornou 429.','O assistente está sobrecarregado. Tente novamente em instantes.','medium','AI','gateway_rate','["Muitas requisições simultâneas na plataforma"]','["Aguarde 30 segundos e tente novamente"]',true),
('AI-004','Falha do provedor de IA','Erro upstream ao processar solicitação.','O assistente teve um erro momentâneo. Tente reformular sua pergunta.','medium','AI','provider_error','["Instabilidade do provedor","Payload muito grande"]','["Reformule sua pergunta em menos palavras","Tente novamente em 1 minuto"]',true),
('AI-005','Resposta da IA em formato inesperado','Parser não conseguiu extrair estrutura da resposta.','O assistente respondeu em um formato inesperado.','low','AI','parse','["Modelo alucinou o formato","Mudança no schema"]','["Tente novamente","Reporte ao suporte com um print da conversa"]',true),

-- INT (integrações — planilhas)
('INT-001','Erro ao importar planilha','exceljs rejeitou o arquivo ou colunas não bateram.','Não conseguimos ler sua planilha.','medium','INT','spreadsheet_import','["Formato não suportado","Colunas faltando","Arquivo corrompido"]','["Use nosso modelo de planilha","Verifique se todas as colunas obrigatórias estão presentes","Salve como .xlsx antes de importar"]',true),
('INT-002','Falha ao exportar planilha','Erro ao gerar arquivo exceljs.','Não conseguimos gerar seu arquivo.','low','INT','spreadsheet_export','["Volume muito grande","Erro de memória"]','["Filtre por um período menor","Tente novamente"]',true),

-- UI
('UI-001','Erro de renderização','ErrorBoundary capturou exception no React.','A tela travou. Recarregando...','high','UI','render','["Estado inconsistente","Dado inesperado da API"]','["Recarregue a página","Se persistir, reporte com o código de ocorrência"]',true),
('UI-002','Formulário com dados inválidos','Validação zod/schema falhou.','Confira os campos destacados.','info','UI','validation','["Campo obrigatório vazio","Formato de email/telefone/data inválido"]','["Corrija os campos em vermelho","Tente salvar novamente"]',true),
('UI-003','Tema não aplicou de primeira','useTheme aplicou classe após render.','—','low','UI','theme','["Race condition no ThemeProvider"]','["Alterne o tema novamente"]',true),

-- NET
('NET-001','Sem conexão','fetch falhou com TypeError: Failed to fetch.','Sem conexão com a internet.','medium','NET','offline','["Wi-Fi caiu","Servidor Financy indisponível"]','["Verifique sua conexão","Recarregue quando reconectar"]',true),
('NET-002','Timeout de requisição','AbortController disparou timeout.','A requisição demorou demais.','medium','NET','timeout','["Rede lenta","Servidor sobrecarregado"]','["Tente novamente em instantes"]',true),
('NET-003','Erro do servidor (5xx)','Edge function ou API retornou 5xx.','Ops, algo deu errado do nosso lado.','high','NET','server_error','["Bug no backend","Manutenção em curso"]','["Aguarde 1 minuto e tente novamente","Reporte com o código de ocorrência se persistir"]',false),

-- SEC
('SEC-001','Ação sem permissão','has_role/policy negou a operação.','Você não tem permissão para essa ação.','high','SEC','authorization','["Papel de usuário insuficiente","Recurso protegido por role de admin"]','["Solicite acesso ao administrador da sua conta"]',false),
('SEC-002','Tentativa suspeita bloqueada','audit_sensitive_access registrou padrão de risco.','—','critical','SEC','audit','["Enumeração de dados","Múltiplas tentativas em endpoints sensíveis"]','["Bloqueio automático em vigor","Investigação manual necessária"]',false),

-- INF (infra)
('INF-001','Variável de ambiente ausente','checkEnv detectou secret faltando em edge function.','—','critical','INF','env','["Segredo não configurado","Deploy sem propagar env"]','["Configure o secret via add_secret","Redeploy a função"]',false),
('INF-002','Serviço temporariamente indisponível','Health check da edge function falhou.','Serviço em manutenção. Voltamos já.','high','INF','availability','["Deploy em andamento","Cold start"]','["Aguarde 30 segundos","Recarregue a página"]',true)

ON CONFLICT (code) DO NOTHING;
