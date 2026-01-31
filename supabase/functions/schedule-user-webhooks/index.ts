import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { userId, eventType } = await req.json();
    // eventType: 'free_trial' ou 'subscription_renewal'

    console.log('📅 Agendando webhooks para:', userId, eventType);

    // Buscar dados do usuário
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('nome_completo, email, telefone, created_at')
      .eq('id', userId)
      .single();

    if (!profile) {
      throw new Error('Perfil não encontrado');
    }

    const webhookUrl = 'https://central-financy-n8n.y8enlt.easypanel.host/webhook/centro-de-dados-relacionais';
    const basePayload = {
      nome: profile.nome_completo,
      email: profile.email,
      telefone: profile.telefone,
      user_id: userId
    };

    const webhooksToSchedule = [];

    // NOTA: Lógica de free_trial removida - modelo de pagamento direto implementado
    // Agora apenas webhooks de renovação são agendados quando o usuário assina

    if (eventType === 'subscription_renewal') {
      // Buscar data de renovação
      const { data: subscription } = await supabaseClient
        .from('user_subscriptions')
        .select('expires_at')
        .eq('user_id', userId)
        .single();

      if (!subscription?.expires_at) {
        throw new Error('Data de renovação não encontrada');
      }

      const renewalDate = new Date(subscription.expires_at);
      
      // 5 dias antes, 1 dia antes, dia da renovação
      const date5Before = new Date(renewalDate);
      date5Before.setDate(date5Before.getDate() - 5);
      
      const date1Before = new Date(renewalDate);
      date1Before.setDate(date1Before.getDate() - 1);

      webhooksToSchedule.push(
        {
          user_id: userId,
          event_type: 'renovacao5',
          scheduled_date: date5Before.toISOString().split('T')[0],
          webhook_url: webhookUrl,
          payload: basePayload
        },
        {
          user_id: userId,
          event_type: 'renovacao1',
          scheduled_date: date1Before.toISOString().split('T')[0],
          webhook_url: webhookUrl,
          payload: basePayload
        },
        {
          user_id: userId,
          event_type: 'renovacao0',
          scheduled_date: renewalDate.toISOString().split('T')[0],
          webhook_url: webhookUrl,
          payload: basePayload
        }
      );
    }

    // Inserir webhooks agendados
    const { error: insertError } = await supabaseClient
      .from('scheduled_webhooks')
      .insert(webhooksToSchedule);

    if (insertError) {
      console.error('Erro ao inserir webhooks:', insertError);
      throw insertError;
    }

    console.log(`✅ ${webhooksToSchedule.length} webhooks agendados com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        scheduled: webhooksToSchedule.length,
        webhooks: webhooksToSchedule.map(w => ({ event_type: w.event_type, date: w.scheduled_date }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
