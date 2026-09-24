import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkEnv, safeHandler, checkRateLimit } from '../_shared/utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(safeHandler(async (req) => {
  // Validar variáveis de ambiente obrigatórias
  const envVars = checkEnv(['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

  // Rate limit por IP ANTES da autenticação (prevenir ataques de força bruta)
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  if (!(await checkRateLimit(supabase, `ip:${clientIp}`, 'ip_request', 60, 1))) {
    throw new Error('Too many requests from this IP');
  }

  // Autenticar usuário
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Unauthorized');
  }
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // Rate limit por usuário APÓS autenticação (5 requests/min para IA)
  if (!(await checkRateLimit(supabase, `user:${user.id}`, 'ai_message', 50, 1440))) {
    throw new Error('Rate limit exceeded - Limite de 5 requisições por minuto atingido');
  }

  const body = await req.json();
  const { message } = body;

  if (!message) {
    throw new Error('Bad request - Message is required');
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
    
    Planos disponíveis:
    - Gratuito: Funcionalidades básicas limitadas
    - Plus: Recursos ilimitados + IA básica
    - Premium: Multi-dashboards + IA avançada + gestão de equipe
    - Enterprise: Recursos corporativos + suporte dedicado
    
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