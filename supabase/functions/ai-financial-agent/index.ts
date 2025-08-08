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

    const { message, action, transactionId } = body;

    if (!message) {
      throw new Error('Message is required');
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
        // Salvar na tabela apropriada (despesas ou receitas)
        if (transaction.type === 'expense') {
          await supabase.from('despesas').insert({
            user_id: user.id,
            descricao: transaction.description,
            valor: transaction.amount,
            categoria: transaction.category,
            data: transaction.date,
            forma_pagamento: 'Dinheiro',
            fornecedor: 'Via IA'
          });
        } else {
          await supabase.from('receitas').insert({
            user_id: user.id,
            descricao: transaction.description,
            valor: transaction.amount,
            categoria: transaction.category,
            data: transaction.date,
            forma_pagamento: 'Dinheiro',
            cliente: 'Via IA'
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
        'Authorization': `Bearer ${openAIApiKey}`,
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

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    let parsedResponse;
    let transactionId = null;

    try {
      // Tentar parsear a resposta JSON
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

        transactionId = transaction?.id;
      }
    } catch (e) {
      console.log('Erro ao parsear JSON da IA:', e);
      // Se não conseguir parsear, criar resposta padrão
      parsedResponse = { 
        response: aiResponse || "Entendi! Como posso ajudar com suas finanças?", 
        has_transaction: false 
      };
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
          transaction_id: transactionId
        }
      })
      .select()
      .single();

    return new Response(JSON.stringify({ 
      response: parsedResponse.response || "Como posso ajudar com suas finanças?",
      agent: 'financial_intelligence',
      has_transaction: parsedResponse.has_transaction || false,
      transaction_id: transactionId,
      conversation_id: conversation?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in financial agent:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});