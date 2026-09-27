// Legado: sem chamador no front (ver ARQUITETURA-ALVO D-03). Mantida no ar até confirmar que o n8n não a usa.
import { exigirAssinaturaAtiva } from '../_shared/acesso.ts';
import { cabecalhosCors } from '../_shared/cors.ts';
import { hojeISO } from '../_shared/datas.ts';
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
  const { message, action, transactionId } = body;

  if (!message) {
    throw requisicaoInvalida('Mensagem é obrigatória');
  }

  // Se for uma ação de confirmação de gasto
  if (action === 'confirm_transaction') {
    
    // Buscar a transação
    const { data: transaction } = await supabase
      .from('ai_recognized_transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .single();

    // Já salva: não duplica o lançamento em cliques repetidos.
    if (transaction && !transaction.saved_to_platform) {
      // Buscar dashboard principal do usuário
      const { data: mainDashboardId } = await supabase
        .rpc('get_user_main_dashboard', { p_user_id: user.id });

      // Salvar na tabela apropriada (despesas ou receitas)
      if (transaction.type === 'expense') {
        await supabase.from('despesas').insert({
          user_id: user.id,
          dashboard_id: mainDashboardId,
          descricao: transaction.description,
          valor: transaction.amount,
          categoria: transaction.category,
          data: transaction.date,
          forma_pagamento: 'Dinheiro',
          fornecedor: 'Via IA',
          status: 'paga'
        });
      } else {
        await supabase.from('receitas').insert({
          user_id: user.id,
          dashboard_id: mainDashboardId,
          descricao: transaction.description,
          valor: transaction.amount,
          categoria: transaction.category,
          data: transaction.date,
          forma_pagamento: 'Dinheiro',
          cliente: 'Via IA',
          status: 'paga'
        });
      }

      // Marcar como salvo
      await supabase
        .from('ai_recognized_transactions')
        .update({ saved_to_platform: true, confirmed: true })
        .eq('id', transactionId)
        .eq('user_id', user.id);

      return new Response(JSON.stringify({ 
        response: `✅ ${transaction.type === 'expense' ? 'Gasto' : 'Receita'} salvo com sucesso na plataforma!`,
        agent: 'financial_intelligence'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Sistema prompt para reconhecimento de transações
  const systemPrompt = `Você é o Agente de Inteligência Financeira da Financy. Sua função é identificar gastos e receitas em linguagem natural e responder de forma amigável e criativa.

    INSTRUÇÕES:
    1. Analise se a mensagem contém informações sobre gastos ou ganhos
    2. Se detectar, extraia: valor, descrição, categoria provável
    3. Categorias válidas: alimentacao, transporte, saude, educacao, lazer, vestuario, casa, trabalho, tecnologia, marketing, vendas, outros
    4. Responda sempre de forma amigável e criativa
    5. Se identificar transação, termine sempre com: "Caso queira salvar na plataforma, clique no botão 'Confirmar' abaixo."

    EXEMPLOS:
    - "Comprei um hambúrguer de 15 reais" → categoria: alimentacao
    - "Gastei 30 reais no Uber" → categoria: transporte  
    - "Vendi um produto por 100 reais" → receita, categoria: vendas

    Responda sempre em português brasileiro, seja criativo mas profissional.
    
    Se não detectar nenhuma transação, apenas converse normalmente sobre finanças ou tire dúvidas.`;

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
        { role: 'user', content: `Analise esta mensagem e identifique se há alguma transação financeira: "${message}"

        Se detectar uma transação, responda no formato JSON:
        {
          "has_transaction": true,
          "type": "expense" ou "income",
          "amount": valor_em_numero,
          "description": "descrição da transação",
          "category": "categoria",
          "response": "sua resposta amigável"
        }
        
        Se não detectar transação:
        {
          "has_transaction": false,
          "response": "sua resposta conversacional sobre finanças"
        }` }
      ],
      temperature: 0.7,
      max_tokens: 400
    }),
  });

  if (!response.ok) {
    console.error('Erro da API OpenAI:', await response.text());
    throw new Error('Erro ao processar solicitação de IA');
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;

  let parsedResponse;
  let transactionIdResult = null;

  try {
    parsedResponse = JSON.parse(aiResponse);
    
    // Se detectou transação, salvar no banco
    if (parsedResponse.has_transaction) {
      const { data: transaction } = await supabase
        .from('ai_recognized_transactions')
        .insert({
          user_id: user.id,
          type: parsedResponse.type,
          description: parsedResponse.description,
          amount: parsedResponse.amount,
          category: parsedResponse.category,
          date: hojeISO()
        })
        .select()
        .single();

      transactionIdResult = transaction.id;
    }
  } catch (e) {
    // Se não conseguir parsear, usar resposta direta
    parsedResponse = { response: aiResponse, has_transaction: false };
  }

  // Salvar conversa no banco
  const { data: conversation } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: user.id,
      agent_type: 'financial_intelligence',
      message,
      response: parsedResponse.response,
      metadata: { 
        has_transaction: parsedResponse.has_transaction,
        transaction_id: transactionIdResult
      }
    })
    .select()
    .single();

  return new Response(JSON.stringify({ 
    response: parsedResponse.response,
    agent: 'financial_intelligence',
    has_transaction: parsedResponse.has_transaction,
    transaction_id: transactionIdResult,
    conversation_id: conversation.id
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}));