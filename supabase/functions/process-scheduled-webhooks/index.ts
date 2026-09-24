import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkEnv, getCorsHeaders, isAuthorizedCron } from '../_shared/utils.ts';

/**
 * Hosts para os quais esta rotina pode disparar webhooks.
 * `webhook_url` vem do banco; a allowlist impede que uma linha adulterada
 * transforme a function em um proxy de requisições (SSRF) para a rede interna.
 */
const ALLOWED_WEBHOOK_HOSTS = (Deno.env.get('WEBHOOK_ALLOWED_HOSTS') ?? 'central-financy-n8n.y8enlt.easypanel.host')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

function isAllowedWebhookUrl(rawUrl: unknown): boolean {
  if (typeof rawUrl !== 'string' || !rawUrl) return false;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:') return false;
    return ALLOWED_WEBHOOK_HOSTS.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rotina de cron com service role: exige o token dedicado, senão qualquer
    // usuário logado pode adiantar o disparo da fila de notificações.
    // A checagem vem antes do resto do ambiente para que a resposta a um
    // chamador não autorizado seja sempre 401.
    const { CRON_SECRET_TOKEN } = checkEnv(['CRON_SECRET_TOKEN']);

    if (!isAuthorizedCron(req, CRON_SECRET_TOKEN)) {
      console.error('[SECURITY] process-scheduled-webhooks: token de cron ausente ou inválido');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const envVars = checkEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

    const supabaseClient = createClient(
      envVars.SUPABASE_URL,
      envVars.SUPABASE_SERVICE_ROLE_KEY, // Usar SERVICE_ROLE para bypass RLS
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

        if (!isAllowedWebhookUrl(webhook.webhook_url)) {
          throw new Error('Destino do webhook não está na allowlist');
        }

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
      JSON.stringify({ error: 'Erro interno ao processar webhooks agendados' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
