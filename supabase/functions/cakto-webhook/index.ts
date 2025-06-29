
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Webhook Cakto recebido:', req.method, req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === 'POST') {
      const payload = await req.json();
      console.log('Payload recebido do Cakto:', JSON.stringify(payload, null, 2));

      // Verificar se é um evento de pagamento aprovado
      if (payload.event === 'payment.approved' || payload.status === 'approved') {
        const {
          customer_email,
          amount,
          transaction_id,
          product_name,
          metadata
        } = payload;

        console.log('Processando pagamento aprovado:', {
          email: customer_email,
          valor: amount,
          transacao: transaction_id
        });

        // Buscar usuário pelo email
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', customer_email)
          .single();

        if (profileError) {
          console.error('Erro ao buscar perfil:', profileError);
          return new Response(
            JSON.stringify({ error: 'Usuário não encontrado' }),
            { 
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // Registrar a receita de assinatura
        const { data: receita, error: receitaError } = await supabase
          .from('receitas')
          .insert({
            user_id: profiles.id,
            data: new Date().toISOString().split('T')[0],
            descricao: `Pagamento de assinatura - ${product_name || 'Financy Premium'}`,
            categoria: 'Assinatura',
            cliente: customer_email,
            valor: parseFloat(amount) / 100, // Cakto envia em centavos
            forma_pagamento: 'Cartão de Crédito'
          });

        if (receitaError) {
          console.error('Erro ao inserir receita:', receitaError);
          return new Response(
            JSON.stringify({ error: 'Erro ao registrar receita' }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        console.log('Receita registrada com sucesso:', receita);

        // Responder com sucesso
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Pagamento processado com sucesso',
            receita_id: receita?.id
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Outros tipos de eventos (opcional - para logs)
      console.log('Evento não processado:', payload.event || payload.status);
      return new Response(
        JSON.stringify({ message: 'Evento recebido mas não processado' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Método não permitido
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro no webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
