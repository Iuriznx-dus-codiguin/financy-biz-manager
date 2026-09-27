// Envia ao n8n os avisos agendados para hoje (cron diário às 10:00 UTC, com x-cron-secret).
import { exigirChamadorInterno } from '../_shared/auth.ts';
import { hojeISO } from '../_shared/datas.ts';
import { json, servir } from '../_shared/http.ts';
import { log } from '../_shared/logger.ts';
import { ehUrlDoN8n, enviarParaN8n } from '../_shared/n8n.ts';
import { clienteServico } from '../_shared/supabase.ts';

servir('process-scheduled-webhooks', async (req) => {
  exigirChamadorInterno(req);
  const supabase = clienteServico();
  const hoje = hojeISO();

  const { data: pendentes, error } = await supabase
    .from('scheduled_webhooks')
    .select('id, event_type, webhook_url, payload')
    .eq('scheduled_date', hoje)
    .eq('executed', false)
    .order('created_at', { ascending: true })
    .limit(1000);
  if (error) throw new Error(`Erro ao buscar webhooks: ${error.message}`);

  const results: { id: string; event_type: string; success: boolean; error?: string }[] = [];
  for (const webhook of pendentes ?? []) {
    try {
      // URL gravada no banco só é chamada se for do n8n configurado.
      if (!ehUrlDoN8n(webhook.webhook_url)) throw new Error('URL fora do n8n configurado');
      await enviarParaN8n(webhook.webhook_url, { ...webhook.payload, event_type: webhook.event_type, webhook_id: webhook.id });
      await supabase
        .from('scheduled_webhooks')
        .update({ executed: true, executed_at: new Date().toISOString(), error_message: null })
        .eq('id', webhook.id);
      results.push({ id: webhook.id, event_type: webhook.event_type, success: true });
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      await supabase.from('scheduled_webhooks').update({ error_message: mensagem.slice(0, 500) }).eq('id', webhook.id);
      results.push({ id: webhook.id, event_type: webhook.event_type, success: false, error: mensagem });
    }
  }

  log('info', 'webhooks_agendados.processados', {
    data: hoje,
    total: results.length,
    falhas: results.filter((r) => !r.success).length,
  });
  return json(req, { success: true, processed: results.length, results });
});
