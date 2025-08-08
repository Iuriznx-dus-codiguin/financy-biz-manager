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
      throw new Error('Message is required');
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
        max_tokens: 600
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Verificar se mencionou algum imposto para marcar como relevante
    const taxKeywords = ['MEI', 'DAS', 'ICMS', 'ISS', 'IRPF', 'IRPJ', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'PIS', 'COFINS', 'imposto', 'tributo'];
    const hasTaxContent = taxKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase()) || 
      aiResponse.toLowerCase().includes(keyword.toLowerCase())
    );

    // Salvar conversa no banco
    await supabase
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

    return new Response(JSON.stringify({ 
      response: aiResponse || "Desculpe, não consegui processar sua solicitação no momento.",
      agent: 'tax_specialist',
      has_tax_content: hasTaxContent
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in tax agent:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});