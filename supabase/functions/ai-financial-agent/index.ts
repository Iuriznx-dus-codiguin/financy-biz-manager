import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkEnv, safeHandler, checkRateLimit, getCorsHeaders } from '../_shared/utils.ts';

serve(safeHandler(async (req) => {
  const corsHeaders = getCorsHeaders(req);

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
  const { message, action, transactionId } = body;

  if (!message) {
    throw new Error('Bad request - Message is required');
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

    if (transaction) {
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
        .eq('id', transactionId);

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
          date: new Date().toISOString().split('T')[0]
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