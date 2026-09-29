// Legado: sem chamador no front (ver ARQUITETURA-ALVO D-03). Mantida no ar até confirmar que o n8n não a usa.
import { cabecalhosCors } from '../_shared/cors.ts';
import { ErroHttp, naoAutorizado, requisicaoInvalida } from '../_shared/http.ts';
import { formatarBRL } from '../_shared/dinheiro.ts';
import { resumoDosPlanos } from '../_shared/planos.ts';
import { clienteServico } from '../_shared/supabase.ts';
import { checkEnv, safeHandler, checkRateLimit } from '../_shared/utils.ts';

Deno.serve(safeHandler(async (req) => {
  const corsHeaders = cabecalhosCors(req);
  // Validar variáveis de ambiente obrigatórias
  const envVars = checkEnv(['OPENAI_API_KEY']);
  const supabase = clienteServico();

  // Rate limit por IP ANTES da autenticação (prevenir ataques de força bruta)
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  if (!(await checkRateLimit(supabase, `ip:${clientIp}`, 'ip_request', 60, 1))) {
    throw new ErroHttp(429, 'LIMITE_ATINGIDO', 'Muitas requisições. Tente novamente em instantes.');
  }

  // Autenticar usuário
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw naoAutorizado();
  }
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    throw naoAutorizado();
  }

  // Rate limit por usuário APÓS autenticação (50 mensagens por dia)
  if (!(await checkRateLimit(supabase, `user:${user.id}`, 'ai_message', 50, 1440))) {
    throw new ErroHttp(429, 'LIMITE_ATINGIDO', 'Limite diário de mensagens atingido. Tente novamente amanhã.');
  }

  const body = await req.json();
  const { message } = body;

  if (!message) {
    throw requisicaoInvalida('Mensagem é obrigatória');
  }

  // Sistema prompt para o agente de suporte
  const systemPrompt = `Você é o Agente de Suporte da plataforma Financy, uma plataforma de gestão financeira brasileira.
    
    Suas responsabilidades:
    - Responder dúvidas sobre funcionalidades da plataforma de forma clara e amigável
    - Ajudar com questões sobre planos de assinatura, relatórios, cadastro de despesas/receitas
    - Explicar como usar recursos do painel de controle
    - Fornecer suporte técnico básico
    - Manter tom profissional mas acessível
    
    Funcionalidades principais da Financy:
    - Dashboard com visão geral financeira
    - Gestão de receitas e despesas
    - Controle de impostos (DAS, MEI, etc.)
    - Relatórios financeiros
    - Metas financeiras
    - Multi-dashboards (planos premium)
    - Inteligência financeira via IA
    - Gestão de equipe (planos empresariais)
    
    Não existe plano gratuito nem teste grátis. Planos (assinatura pela página Assinatura, pagamento na Cakto):
${resumoDosPlanos(formatarBRL)}
    
    IMPORTANTE: Apenas forneça informações sobre funcionalidades que realmente existem na plataforma. Se não souber algo específico, seja honesto e sugira contato com suporte humano.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${envVars.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 500
    }),
  });

  if (!response.ok) {
    console.error('Erro da API OpenAI:', await response.text());
    throw new Error('Erro ao processar solicitação de IA');
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;

  // Salvar conversa no banco
  const { error: saveError } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: user.id,
      agent_type: 'support',
      message,
      response: aiResponse,
      metadata: { timestamp: new Date().toISOString() }
    });

  if (saveError) {
    console.error('Erro ao salvar conversa:', saveError);
  }

  return new Response(JSON.stringify({ 
    response: aiResponse,
    agent: 'support'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}));