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

  // Sistema prompt para o especialista em impostos
  const systemPrompt = `Você é o Especialista em Impostos da Financy, um contador virtual inteligente especializado em tributação brasileira.

    Suas especialidades:
    - MEI (Microempreendedor Individual) e DAS
    - Simples Nacional, Lucro Presumido, Lucro Real
    - ICMS, ISS, IRPF, IRPJ, PIS, COFINS
    - Regime tributário mais adequado para cada perfil
    - Prazos de vencimento e obrigações acessórias
    - Estratégias legais de redução da carga tributária
    - Deduções permitidas por lei

    INSTRUÇÕES:
    1. Identifique automaticamente quando o usuário menciona impostos/tributos
    2. Explique de forma técnica mas simplificada
    3. Contextualize com exemplos práticos do dia a dia
    4. Use linguagem criativa sem perder profissionalismo
    5. Sempre sugira ações práticas quando relevante
    6. Para MEI, sempre lembre do DAS mensal (venc. dia 20)
    7. Para empresas, oriente sobre regime tributário mais vantajoso

    EXEMPLOS de respostas criativas:
    - "O DAS do MEI é como um combo mensal de impostos..."
    - "O Simples Nacional é como um buffet de impostos unificado..."
    - "Esta despesa pode ser dedutível se classificada corretamente..."

    Responda sempre em português brasileiro e seja proativo em sugerir melhorias na gestão tributária.`;

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
      max_tokens: 600
    }),
  });

  if (!response.ok) {
    console.error('Erro da API OpenAI:', await response.text());
    throw new Error('Erro ao processar solicitação de IA');
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;

  // Verificar se mencionou algum imposto para marcar como relevante
  const taxKeywords = ['MEI', 'DAS', 'ICMS', 'ISS', 'IRPF', 'IRPJ', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'PIS', 'COFINS', 'imposto', 'tributo'];
  const hasTaxContent = taxKeywords.some(keyword => 
    message.toLowerCase().includes(keyword.toLowerCase()) || 
    aiResponse.toLowerCase().includes(keyword.toLowerCase())
  );

  // Salvar conversa no banco
  const { error: saveError } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: user.id,
      agent_type: 'tax_specialist',
      message,
      response: aiResponse,
      metadata: { 
        has_tax_content: hasTaxContent,
        timestamp: new Date().toISOString()
      }
    });

  if (saveError) {
    console.error('Erro ao salvar conversa:', saveError);
  }

  return new Response(JSON.stringify({ 
    response: aiResponse,
    agent: 'tax_specialist',
    has_tax_content: hasTaxContent
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}));