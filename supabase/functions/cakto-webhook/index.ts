
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkEnv, safeHandler, constantTimeCompare, generateHmacSha256 } from '../_shared/utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.financy.site', // Restrito ao domínio específico
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

serve(safeHandler(async (req) => {
  console.log('Webhook Cakto recebido:', req.method, req.url);

  // Validar variáveis de ambiente obrigatórias
  const envVars = checkEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CAKTO_WEBHOOK_SECRET']);
  const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

  if (req.method === 'POST') {
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);
    console.log('Payload recebido do Cakto:', JSON.stringify(payload, null, 2));

    // Verificar assinatura do webhook usando HMAC-SHA256
    const signature = req.headers.get('x-webhook-signature');
    if (signature) {
      const expectedSignature = await generateHmacSha256(envVars.CAKTO_WEBHOOK_SECRET, rawBody);
      const providedSignature = signature.replace('sha256=', '');
      
      if (!constantTimeCompare(expectedSignature, providedSignature)) {
        console.error('Assinatura do webhook inválida');
        throw new Error('Unauthorized');
      }
    }

    // Verificar se é um evento de pagamento aprovado
    if (payload.event === 'payment.approved' || payload.status === 'approved' || payload.status === 'paid') {
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
        throw new Error('Usuário não encontrado');
      }

      // Calcular valor (Cakto pode enviar em centavos ou reais)
      let valorFinal = parseFloat(amount);
      if (valorFinal > 1000) {
        valorFinal = valorFinal / 100; // Converter de centavos para reais
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
          valor: valorFinal,
          forma_pagamento: 'Cartão de Crédito'
        });

      if (receitaError) {
        console.error('Erro ao inserir receita:', receitaError);
        throw new Error('Erro ao registrar receita');
      }

      console.log('Receita registrada com sucesso:', receita);

      // Atualizar ou criar assinatura do usuário
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30); // 30 dias a partir de hoje

      const { error: subscriptionError } = await supabase
        .from('subscribers')
        .upsert({
          user_id: profiles.id,
          email: customer_email,
          subscribed: true,
          subscription_tier: 'premium',
          subscription_end: subscriptionEndDate.toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'email'
        });

      if (subscriptionError) {
        console.error('Erro ao atualizar assinatura:', subscriptionError);
        // Não falhar o webhook por causa disso, só logar o erro
      } else {
        console.log('Assinatura atualizada com sucesso para:', customer_email);
      }

      // Responder com sucesso
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Pagamento processado com sucesso',
          receita_id: receita?.[0]?.id || 'criada'
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
  throw new Error('Método não permitido');
}));
