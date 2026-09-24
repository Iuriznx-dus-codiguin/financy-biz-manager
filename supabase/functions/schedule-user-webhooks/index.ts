import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkEnv, constantTimeCompare, getCorsHeaders } from '../_shared/utils.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const unauthorized = () =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const envVars = checkEnv([
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_ANON_KEY',
      'N8N_RELATIONAL_DATA_URL',
    ]);

    const supabaseClient = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const { userId, eventType } = body || {};

    if (!userId || typeof userId !== 'string' || !UUID_RE.test(userId)) {
      return new Response(JSON.stringify({ error: 'userId inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Autorização: a function roda com service role e lê/envia PII de qualquer
    // usuário a partir de um userId do corpo. Sem esta checagem, qualquer
    // usuário logado dispara notificações para a conta de terceiros (IDOR).
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return unauthorized();
    const token = authHeader.slice('Bearer '.length);

    const isInternalCall = constantTimeCompare(token, envVars.SUPABASE_SERVICE_ROLE_KEY);
    if (!isInternalCall) {
      // Chamada vinda do app: só pode agendar para a própria conta.
      const authClient = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
      const callerId = claimsData?.claims?.sub as string | undefined;
      if (claimsError || !callerId) return unauthorized();
      if (callerId !== userId) {
        console.error('[SECURITY] schedule-user-webhooks: tentativa de agendar para outro usuário');
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('📅 Agendando webhooks', { eventType, internal: isInternalCall });

    // Buscar dados do usuário
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('nome_completo, email, telefone, created_at')
      .eq('id', userId)
      .single();

    if (!profile) {
      throw new Error('Perfil não encontrado');
    }

    const webhookUrl = envVars.N8N_RELATIONAL_DATA_URL;
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
