// Legado: sem chamador no front (ver ARQUITETURA-ALVO D-03). Mantida no ar até confirmar que o n8n não a usa.
import { exigirAssinaturaAtiva } from '../_shared/acesso.ts';
import { cabecalhosCors } from '../_shared/cors.ts';
import { ErroHttp, naoAutorizado, requisicaoInvalida } from '../_shared/http.ts';
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
  await exigirAssinaturaAtiva(supabase, user.id);

  // Rate limit por usuário APÓS autenticação (50 mensagens por dia)
  if (!(await checkRateLimit(supabase, `user:${user.id}`, 'ai_message', 50, 1440))) {
    throw new ErroHttp(429, 'LIMITE_ATINGIDO', 'Limite diário de mensagens atingido. Tente novamente amanhã.');
  }

  const body = await req.json();
  const { message } = body;

  if (!message) {
    throw requisicaoInvalida('Mensagem é obrigatória');
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