import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verificar autorização
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse do body com verificação
    let body;
    const rawBody = await req.text();
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw body:', rawBody);
      throw new Error('Invalid JSON in request body');
    }

    const { message } = body;

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
        'Authorization': `Bearer ${openAIApiKey}`,
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

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Salvar conversa no banco
    await supabase
      .from('ai_conversations')
      .insert({
        user_id: user.id,
        agent_type: 'support',
        message,
        response: aiResponse,
        metadata: { timestamp: new Date().toISOString() }
      });

    return new Response(JSON.stringify({ 
      response: aiResponse || "Desculpe, não consegui processar sua solicitação no momento.",
      agent: 'support'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in support agent:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});