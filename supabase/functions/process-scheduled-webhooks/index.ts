import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Usar SERVICE_ROLE para bypass RLS
    );

    const today = new Date().toISOString().split('T')[0];
    console.log('🕐 Processando webhooks agendados para:', today);

    // Buscar webhooks pendentes para hoje
    const { data: pendingWebhooks, error: fetchError } = await supabaseClient
      .from('scheduled_webhooks')
      .select('*')
      .eq('scheduled_date', today)
      .eq('executed', false)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Erro ao buscar webhooks:', fetchError);
      throw fetchError;
    }

    console.log(`📋 Encontrados ${pendingWebhooks?.length || 0} webhooks para processar`);

    const results = [];

    for (const webhook of pendingWebhooks || []) {
      try {
        console.log(`🚀 Processando webhook ${webhook.event_type} para usuário ${webhook.user_id}`);

        // Enviar para n8n
        const response = await fetch(webhook.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...webhook.payload,
            event_type: webhook.event_type,
            webhook_id: webhook.id
          })
        });

        if (!response.ok) {
          throw new Error(`Webhook falhou: ${response.status} ${response.statusText}`);
        }

        // Marcar como executado
        await supabaseClient
          .from('scheduled_webhooks')
          .update({
            executed: true,
            executed_at: new Date().toISOString()
          })
          .eq('id', webhook.id);

        console.log(`✅ Webhook ${webhook.event_type} executado com sucesso`);
        results.push({ id: webhook.id, event_type: webhook.event_type, success: true });

      } catch (error) {
        console.error(`❌ Erro ao processar webhook ${webhook.id}:`, error);

        // Salvar erro
        await supabaseClient
          .from('scheduled_webhooks')
          .update({
            error_message: error.message
          })
          .eq('id', webhook.id);

        results.push({ id: webhook.id, event_type: webhook.event_type, success: false, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
