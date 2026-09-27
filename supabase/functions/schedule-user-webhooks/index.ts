// Agenda os avisos de renovação (5 dias antes, 1 dia antes e no dia) enviados ao n8n por
// process-scheduled-webhooks. Chamada apenas pelo backend (cakto-webhook, com a service role).
import { exigirChamadorInterno } from '../_shared/auth.ts';
import { hojeISO, somarDias } from '../_shared/datas.ts';
import { json, lerJson, requisicaoInvalida, servir } from '../_shared/http.ts';
import { log } from '../_shared/logger.ts';
import { urlN8n } from '../_shared/n8n.ts';
import { clienteServico } from '../_shared/supabase.ts';

const EVENTOS_RENOVACAO = ['renovacao5', 'renovacao1', 'renovacao0'];

servir('schedule-user-webhooks', async (req) => {
  exigirChamadorInterno(req);
  const { userId, eventType } = await lerJson<{ userId?: string; eventType?: string }>(req);
  if (!userId) throw requisicaoInvalida('userId é obrigatório');

  // O agendamento de teste grátis foi removido junto com o trial; só renovações são agendadas.
  if (eventType !== 'subscription_renewal') {
    return json(req, { success: true, scheduled: 0, webhooks: [] });
  }

  const supabase = clienteServico();
  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from('profiles').select('nome_completo, email, telefone').eq('id', userId).maybeSingle(),
    supabase.from('user_subscriptions').select('expires_at').eq('user_id', userId).maybeSingle(),
  ]);
  if (!profile) throw requisicaoInvalida('Perfil não encontrado');
  if (!subscription?.expires_at) throw requisicaoInvalida('Data de renovação não encontrada');

  const hoje = hojeISO();
  const dataRenovacao = hojeISO(new Date(subscription.expires_at));
  const basePayload = { nome: profile.nome_completo, email: profile.email, telefone: profile.telefone, user_id: userId };
  const webhookUrl = urlN8n('centro-de-dados-relacionais');

  // Cada renovação reagenda: os avisos antigos ainda não enviados são substituídos (antes duplicavam).
  await supabase
    .from('scheduled_webhooks')
    .delete()
    .eq('user_id', userId)
    .eq('executed', false)
    .in('event_type', EVENTOS_RENOVACAO);

  const webhooksToSchedule = [
    { event_type: 'renovacao5', scheduled_date: somarDias(dataRenovacao, -5) },
    { event_type: 'renovacao1', scheduled_date: somarDias(dataRenovacao, -1) },
    { event_type: 'renovacao0', scheduled_date: dataRenovacao },
  ]
    // Aviso cuja data já passou não é enviado atrasado (ex.: "faltam 5 dias" quando faltam 3).
    .filter((w) => w.scheduled_date >= hoje)
    .map((w) => ({ ...w, user_id: userId, webhook_url: webhookUrl, payload: basePayload }));

  if (webhooksToSchedule.length > 0) {
    const { error } = await supabase.from('scheduled_webhooks').insert(webhooksToSchedule);
    if (error) throw new Error(`Erro ao agendar webhooks: ${error.message}`);
  }

  log('info', 'agendamento.renovacao', { user_id: userId, agendados: webhooksToSchedule.length, renovacao: dataRenovacao });
  return json(req, {
    success: true,
    scheduled: webhooksToSchedule.length,
    webhooks: webhooksToSchedule.map((w) => ({ event_type: w.event_type, date: w.scheduled_date })),
  });
});
