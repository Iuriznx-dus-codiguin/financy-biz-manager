// Webhook da Cakto. Contrato preservado: mesma URL, verify_jwt = false, autenticação por HMAC
// (x-webhook-signature) ou `secret` no corpo, mesmos eventos e formato de resposta.
import {
  type Category,
  type JsonObject,
  type NormalizedCaktoPayload,
  type PlanConfig,
  FAILED_PAYMENT_EVENTS,
  FUNNEL_EVENTS,
  PENDING_PAYMENT_EVENTS,
  categoryFor,
  identifyPlan,
  isApprovedEvent,
  isCancellationEvent,
  isRefundEvent,
  maskEmail,
  normalizePayload,
  redactPayload,
  tierFromPlan,
  valorPago,
} from '../_shared/cakto.ts';
import { hojeISO } from '../_shared/datas.ts';
import { log } from '../_shared/logger.ts';
import { clienteServico, type SupabaseClient, variavel } from '../_shared/supabase.ts';
import { constantTimeCompare, generateHmacSha256 } from '../_shared/utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.financy.site',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

class WebhookError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

function jsonResponse(body: JsonObject, status = 200): Response {
  return new Response(JSON.stringify({ ...body, timestamp: new Date().toISOString() }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// -------------------------------------------------------------------------------------------------
// Autenticação e busca
// -------------------------------------------------------------------------------------------------

async function authenticateWebhook(req: Request, rawBody: string, payload: JsonObject, secret: string): Promise<void> {
  const signature = req.headers.get('x-webhook-signature');
  const payloadSecret = typeof payload?.secret === 'string' ? payload.secret : null;

  if (signature) {
    if (!signature.startsWith('sha256=')) throw new WebhookError(401, 'invalid_signature_prefix', 'Não autorizado');
    const expectedSignature = await generateHmacSha256(secret, rawBody);
    const providedSignature = signature.slice('sha256='.length);
    if (!constantTimeCompare(expectedSignature, providedSignature)) throw new WebhookError(401, 'invalid_signature', 'Não autorizado');
    return;
  }

  if (payloadSecret && constantTimeCompare(payloadSecret, secret)) return;
  throw new WebhookError(401, 'missing_or_invalid_secret', 'Não autorizado');
}

/** Escapa curingas do LIKE para que o ilike funcione como igualdade sem diferenciar maiúsculas. */
function igualdadeSemCaixa(valor: string): string {
  return valor.replace(/[\\%_]/g, (c) => `\\${c}`);
}

async function findProfileByEmail(supabase: SupabaseClient, email: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, created_at')
    .ilike('email', igualdadeSemCaixa(email))
    .order('created_at', { ascending: true })
    .limit(2);

  if (error) throw new WebhookError(500, 'profile_lookup_failed', 'Erro ao buscar usuário');
  if (!data || data.length === 0) return null;
  if (data.length > 1) log('warn', 'cakto.perfis_duplicados', { email });
  return data[0] as { id: string; email: string; created_at: string };
}

async function pagamentoJaProcessado(supabase: SupabaseClient, userId: string, chave: string): Promise<boolean> {
  const [notificacao, receita] = await Promise.all([
    supabase.from('payment_notifications').select('id').eq('transaction_id', chave).limit(1),
    supabase.from('receitas').select('id').eq('user_id', userId).eq('cakto_transaction_id', chave).limit(1),
  ]);
  if (notificacao.error || receita.error) {
    // Sem certeza sobre a idempotência, é melhor a Cakto reenviar do que estender duas vezes.
    throw new WebhookError(500, 'idempotency_check_failed', 'Erro ao verificar pagamento');
  }
  return (notificacao.data?.length ?? 0) > 0 || (receita.data?.length ?? 0) > 0;
}

async function getMainDashboardId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_user_main_dashboard', { p_user_id: userId });
  if (error) {
    log('warn', 'cakto.dashboard_principal_indisponivel', { codigo: error.code, mensagem: error.message });
    return null;
  }
  return data || null;
}

// -------------------------------------------------------------------------------------------------
// Log de auditoria
// -------------------------------------------------------------------------------------------------

async function recordWebhookLog(
  supabase: SupabaseClient,
  params: {
    event: NormalizedCaktoPayload | null;
    payload: JsonObject;
    responseBody: JsonObject;
    httpStatus: number;
    status: 'success' | 'failed' | 'ignored' | 'pending';
    errorCode?: string | null;
    errorMessage?: string | null;
    durationMs: number;
  },
): Promise<void> {
  try {
    const { event, payload, responseBody, httpStatus, status, errorCode, errorMessage, durationMs } = params;
    const transactionId = event?.transactionId || null;
    const category: Category = event ? categoryFor(event) : 'unknown';
    const planConfig = event && category === 'approved' ? identifyPlan(event) : null;

    let attemptCount = 1;
    let isRetry = false;
    if (transactionId) {
      const { count } = await supabase
        .from('cakto_webhook_logs')
        .select('id', { count: 'exact', head: true })
        .eq('transaction_id', transactionId);
      if (typeof count === 'number' && count > 0) {
        attemptCount = count + 1;
        isRetry = true;
      }
    }

    const profile = event?.email ? await findProfileByEmail(supabase, event.email).catch(() => null) : null;

    await supabase.from('cakto_webhook_logs').insert({
      event_type: event?.eventType || null,
      category,
      status,
      http_status: httpStatus,
      attempt_count: attemptCount,
      is_retry: isRetry,
      email_masked: event?.email ? maskEmail(event.email) : null,
      user_id: profile?.id ?? null,
      subscription_type: planConfig?.subscription_type ?? (event?.eventType?.includes('subscription') ? 'unknown' : null),
      plan_id: planConfig?.plan_id ?? null,
      plan_name: planConfig?.plan_name ?? (event?.productName || event?.offerName || null),
      transaction_id: transactionId,
      subscription_id: event?.subscriptionId || null,
      amount: event ? valorPago(event.rawAmount, planConfig?.price) || null : null,
      payment_method: event?.paymentMethod || null,
      duration_ms: durationMs,
      error_code: errorCode ?? null,
      error_message: errorMessage ?? null,
      payload: redactPayload(payload),
      response: responseBody,
    });
  } catch (err) {
    log('warn', 'cakto.log_auditoria_falhou', { erro: err instanceof Error ? err.message : String(err) });
  }
}

// -------------------------------------------------------------------------------------------------
// Eventos
// -------------------------------------------------------------------------------------------------

interface AssinaturaAtual {
  status: string | null;
  plan_id: string | null;
  expires_at: string | null;
  started_at: string | null;
  cakto_subscription_id: string | null;
  metadata: JsonObject | null;
}

async function assinaturaAtual(supabase: SupabaseClient, userId: string): Promise<AssinaturaAtual | null> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('status, plan_id, expires_at, started_at, cakto_subscription_id, metadata')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new WebhookError(500, 'subscription_lookup_failed', 'Erro ao buscar assinatura');
  return data as AssinaturaAtual | null;
}

/**
 * Nova expiração: soma a duração do plano ao que ainda resta da assinatura ativa (renovação
 * antecipada não perde dias); sem assinatura vigente, conta a partir de agora.
 */
function novaExpiracao(atual: AssinaturaAtual | null, plano: PlanConfig, agora: Date): Date {
  const vigenteAte = atual?.status === 'active' && atual.expires_at ? new Date(atual.expires_at) : null;
  const inicio = vigenteAte && vigenteAte > agora ? vigenteAte : agora;
  const fim = new Date(inicio);
  fim.setUTCDate(fim.getUTCDate() + plano.duration_days);
  return fim;
}

async function processApprovedPayment(supabase: SupabaseClient, event: NormalizedCaktoPayload) {
  if (!event.email) throw new WebhookError(400, 'missing_customer_email', 'Email do cliente não informado');

  const planConfig = identifyPlan(event);
  if (!planConfig) {
    log('error', 'cakto.plano_nao_identificado', {
      event: event.eventType, status: event.status, product: event.productName, offer: event.offerName,
      offer_id: event.offerId, plan_hint: event.planHint, transaction_id: event.transactionId,
    });
    throw new WebhookError(422, 'plan_not_identified', 'Plano não identificado');
  }

  const profile = await findProfileByEmail(supabase, event.email);
  if (!profile) {
    log('warn', 'cakto.pagamento_antes_do_perfil', { email: event.email, transaction_id: event.transactionId, plan_id: planConfig.plan_id });
    return jsonResponse({ success: true, pending: true, code: 'profile_not_found', message: 'Pagamento recebido; usuário ainda não encontrado' }, 202);
  }

  const agora = new Date();
  const amount = valorPago(event.rawAmount, planConfig.price);
  const idempotencyKey = event.transactionId || event.subscriptionId || `${profile.id}-${planConfig.plan_id}-${hojeISO(agora)}`;

  // Reenvio do mesmo pagamento: nada muda (antes, cada reenvio estendia a assinatura).
  if (await pagamentoJaProcessado(supabase, profile.id, idempotencyKey)) {
    log('info', 'cakto.pagamento_repetido', { transaction_id: idempotencyKey, plan_id: planConfig.plan_id });
    return jsonResponse({ success: true, message: 'Pagamento já processado anteriormente', idempotent_retry: true });
  }

  const atual = await assinaturaAtual(supabase, profile.id);
  const expiraEm = novaExpiracao(atual, planConfig, agora);
  const renovacaoDoMesmoPlano = atual?.status === 'active' && atual.plan_id === planConfig.plan_id;

  // D-02 (pendente): o pagamento continua registrado como receita no dashboard do comprador.
  const dashboardId = await getMainDashboardId(supabase, profile.id);
  const { error: receitaError } = await supabase.from('receitas').insert({
    user_id: profile.id,
    data: hojeISO(agora),
    descricao: `Pagamento de assinatura - ${planConfig.plan_name}`,
    categoria: 'Assinatura',
    cliente: event.email,
    valor: amount,
    forma_pagamento: event.paymentMethod || 'Cakto',
    dashboard_id: dashboardId,
    cakto_transaction_id: idempotencyKey,
  });
  if (receitaError && receitaError.code !== '23505') {
    log('error', 'cakto.receita_falhou', { codigo: receitaError.code, mensagem: receitaError.message });
    throw new WebhookError(500, 'revenue_insert_failed', 'Erro ao registrar receita');
  }

  const { error: userSubscriptionError } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: profile.id,
      email: event.email,
      subscription_type: planConfig.subscription_type,
      plan_name: planConfig.plan_name,
      plan_id: planConfig.plan_id,
      status: 'active',
      billing_period: planConfig.billing_period,
      started_at: renovacaoDoMesmoPlano && atual?.started_at ? atual.started_at : agora.toISOString(),
      expires_at: expiraEm.toISOString(),
      renewed_at: agora.toISOString(),
      cancelled_at: null,
      amount,
      features: planConfig.features,
      payment_method: event.paymentMethod || 'Cakto',
      cakto_subscription_id: event.subscriptionId || idempotencyKey,
      cakto_customer_id: event.customerId || null,
      metadata: {
        ...event.metadata,
        transaction_id: event.transactionId,
        subscription_id: event.subscriptionId,
        offer_id: event.offerId || null,
        product_name: event.productName,
        offer_name: event.offerName,
        processed_at: agora.toISOString(),
      },
      updated_at: agora.toISOString(),
    }, { onConflict: 'user_id' });

  if (userSubscriptionError) {
    log('error', 'cakto.assinatura_falhou', { codigo: userSubscriptionError.code, mensagem: userSubscriptionError.message });
    throw new WebhookError(500, 'subscription_upsert_failed', 'Erro ao ativar assinatura');
  }

  // Espelho legado (subscribers): lido apenas para o tier developer.
  const { error: subscribersError } = await supabase
    .from('subscribers')
    .upsert({
      user_id: profile.id,
      email: event.email,
      subscribed: true,
      subscription_tier: tierFromPlan(planConfig.plan_id),
      subscription_end: expiraEm.toISOString(),
      updated_at: agora.toISOString(),
    }, { onConflict: 'email' });
  if (subscribersError) log('warn', 'cakto.subscribers_falhou', { codigo: subscribersError.code });

  try {
    const { error: scheduleError } = await supabase.functions.invoke('schedule-user-webhooks', {
      body: { userId: profile.id, eventType: 'subscription_renewal' },
    });
    if (scheduleError) log('warn', 'cakto.agendamento_falhou', { erro: scheduleError.message });
  } catch (scheduleError) {
    log('warn', 'cakto.agendamento_falhou', { erro: scheduleError instanceof Error ? scheduleError.message : String(scheduleError) });
  }

  const { error: notificationError } = await supabase
    .from('payment_notifications')
    .upsert({
      user_id: profile.id,
      plan_name: planConfig.plan_name,
      plan_id: planConfig.plan_id,
      amount,
      transaction_id: idempotencyKey,
      processed: false,
    }, { onConflict: 'transaction_id' });
  if (notificationError) log('warn', 'cakto.notificacao_falhou', { codigo: notificationError.code });

  log('info', 'cakto.pagamento_processado', {
    email: event.email, transaction_id: idempotencyKey, plan_id: planConfig.plan_id, expira_em: expiraEm.toISOString(),
  });

  return jsonResponse({
    success: true,
    message: 'Pagamento processado com sucesso',
    idempotent_retry: false,
    plan: {
      name: planConfig.plan_name,
      type: planConfig.subscription_type,
      period: planConfig.billing_period,
      expires_at: expiraEm.toISOString(),
    },
  });
}

async function processSubscriptionStop(supabase: SupabaseClient, event: NormalizedCaktoPayload) {
  if (!event.email && !event.subscriptionId) {
    return jsonResponse({ success: true, ignored: true, code: 'missing_identifier', message: 'Evento recebido sem identificador de assinatura' });
  }

  const now = new Date().toISOString();
  const profile = event.email ? await findProfileByEmail(supabase, event.email) : null;

  let atual: (AssinaturaAtual & { user_id: string }) | null = null;
  if (profile) {
    const encontrada = await assinaturaAtual(supabase, profile.id);
    atual = encontrada ? { ...encontrada, user_id: profile.id } : null;
  } else {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('user_id, status, plan_id, expires_at, started_at, cakto_subscription_id, metadata')
      .eq('cakto_subscription_id', event.subscriptionId)
      .maybeSingle();
    atual = data as typeof atual;
  }
  if (!atual) {
    return jsonResponse({ success: true, ignored: true, code: 'subscription_not_found', message: 'Assinatura não encontrada' });
  }

  // Evento de uma assinatura diferente da atual (ex.: cancelamento antigo depois de uma nova compra).
  // Mantido o comportamento anterior (cancela a atual) até confirmar o payload real da Cakto — D-18.
  const idsDoEvento = [event.subscriptionId, event.transactionId].filter(Boolean);
  const idsAtuais = [atual.cakto_subscription_id, atual.metadata?.transaction_id, atual.metadata?.subscription_id].filter(Boolean);
  if (idsDoEvento.length > 0 && idsAtuais.length > 0 && !idsDoEvento.some((id) => idsAtuais.includes(id))) {
    log('warn', 'cakto.cancelamento_de_outra_assinatura', { evento: idsDoEvento, atual: idsAtuais });
  }

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: isRefundEvent(event) ? 'refunded' : 'cancelled',
      cancelled_at: now,
      updated_at: now,
      metadata: { ...(atual.metadata ?? {}), last_event: event.eventType, status: event.status, transaction_id: event.transactionId, processed_at: now },
    })
    .eq('user_id', atual.user_id);
  if (error) {
    log('error', 'cakto.cancelamento_falhou', { codigo: error.code, mensagem: error.message });
    throw new WebhookError(500, 'subscription_cancel_failed', 'Erro ao atualizar assinatura');
  }

  const { error: subscriberError } = await supabase
    .from('subscribers')
    .update({ subscribed: false, updated_at: now })
    .eq('user_id', atual.user_id)
    .neq('subscription_tier', 'developer');
  if (subscriberError) log('warn', 'cakto.subscribers_cancelamento_falhou', { codigo: subscriberError.code });

  return jsonResponse({ success: true, message: 'Evento de assinatura atualizado' });
}

async function processPendingPayment(supabase: SupabaseClient, event: NormalizedCaktoPayload) {
  // PIX/boleto/picpay/openfinance gerados: não ativam; marcam "aguardando" sem sobrescrever plano ativo.
  if (!event.email) {
    return jsonResponse({ success: true, ignored: true, code: 'missing_email', message: 'Cobrança pendente recebida sem email' });
  }
  const profile = await findProfileByEmail(supabase, event.email);
  if (!profile) {
    return jsonResponse({ success: true, pending: true, code: 'profile_not_found', message: 'Cobrança pendente registrada' }, 202);
  }
  const current = await assinaturaAtual(supabase, profile.id);
  if (!current || current.status === 'pending_payment' || current.status === 'inactive') {
    await supabase.from('user_subscriptions').upsert({
      user_id: profile.id,
      email: event.email,
      status: 'pending_payment',
      subscription_type: 'pending',
      plan_name: 'Aguardando Pagamento',
      payment_method: event.paymentMethod || event.eventType,
      metadata: { last_event: event.eventType, transaction_id: event.transactionId, generated_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  }
  log('info', 'cakto.cobranca_pendente', { email: event.email, event: event.eventType });
  return jsonResponse({ success: true, message: 'Cobrança pendente registrada', event: event.eventType });
}

async function processFailedPayment(supabase: SupabaseClient, event: NormalizedCaktoPayload) {
  if (!event.email) {
    return jsonResponse({ success: true, ignored: true, code: 'missing_email', message: 'Falha de pagamento sem email' });
  }
  const profile = await findProfileByEmail(supabase, event.email);
  if (!profile) {
    return jsonResponse({ success: true, pending: true, code: 'profile_not_found', message: 'Falha registrada' }, 202);
  }
  const now = new Date().toISOString();
  const current = await assinaturaAtual(supabase, profile.id);
  const isRenewal = event.eventType === 'subscription_renewal_refused';

  // Renovação recusada: past_due. Compra recusada: continua aguardando pagamento — mas não derruba
  // uma assinatura ativa (ex.: tentativa de trocar de plano com cartão recusado).
  if (!isRenewal && current?.status === 'active') {
    log('info', 'cakto.compra_recusada_com_assinatura_ativa', { email: event.email });
    return jsonResponse({ success: true, message: 'Falha de pagamento registrada', new_status: 'active' });
  }
  const newStatus = isRenewal ? 'past_due' : 'pending_payment';
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: newStatus,
      updated_at: now,
      metadata: { ...(current?.metadata ?? {}), last_event: event.eventType, transaction_id: event.transactionId, failed_at: now },
    })
    .eq('user_id', profile.id);
  if (error) log('warn', 'cakto.falha_nao_registrada', { codigo: error.code });

  log('info', 'cakto.falha_de_pagamento', { email: event.email, event: event.eventType, new_status: newStatus });
  return jsonResponse({ success: true, message: 'Falha de pagamento registrada', new_status: newStatus });
}

function statusFromResponseBody(body: JsonObject): 'success' | 'failed' | 'ignored' | 'pending' {
  if (body?.error) return 'failed';
  if (body?.ignored) return 'ignored';
  if (body?.pending) return 'pending';
  return 'success';
}

async function captureResponse(res: Response): Promise<{ res: Response; body: JsonObject; status: number }> {
  let body: JsonObject = {};
  try {
    body = await res.clone().json();
  } catch {
    body = {};
  }
  return { res, body, status: res.status };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const startedAt = Date.now();
  let supabase: SupabaseClient | null = null;
  let payload: JsonObject = {};
  let event: NormalizedCaktoPayload | null = null;

  try {
    if (req.method !== 'POST') throw new WebhookError(405, 'method_not_allowed', 'Método não permitido');

    const secret = variavel('CAKTO_WEBHOOK_SECRET');
    supabase = clienteServico();
    const rawBody = await req.text();

    try {
      payload = JSON.parse(rawBody || '{}');
    } catch {
      throw new WebhookError(400, 'invalid_json', 'JSON inválido');
    }

    await authenticateWebhook(req, rawBody, payload, secret);

    event = normalizePayload(payload);
    log('info', 'cakto.evento', {
      event: event.eventType,
      status: event.status,
      email: event.email || null,
      transaction_id: event.transactionId || event.subscriptionId || null,
      product: event.productName || event.offerName || null,
    });

    let handlerResponse: Response;
    if (isApprovedEvent(event)) {
      handlerResponse = await processApprovedPayment(supabase, event);
    } else if (isCancellationEvent(event)) {
      handlerResponse = await processSubscriptionStop(supabase, event);
    } else if (PENDING_PAYMENT_EVENTS.has(event.eventType)) {
      handlerResponse = await processPendingPayment(supabase, event);
    } else if (FAILED_PAYMENT_EVENTS.has(event.eventType)) {
      handlerResponse = await processFailedPayment(supabase, event);
    } else if (FUNNEL_EVENTS.has(event.eventType) || event.eventType === 'subscription_created') {
      handlerResponse = jsonResponse({ success: true, message: 'Evento de funil registrado', event: event.eventType });
    } else {
      handlerResponse = jsonResponse({ success: true, ignored: true, message: 'Evento recebido mas não processado', event: event.eventType || event.status || 'unknown' });
    }

    const captured = await captureResponse(handlerResponse);
    await recordWebhookLog(supabase, {
      event,
      payload,
      responseBody: captured.body,
      httpStatus: captured.status,
      status: statusFromResponseBody(captured.body),
      durationMs: Date.now() - startedAt,
    });
    return captured.res;
  } catch (error) {
    const isControlled = error instanceof WebhookError;
    const httpStatus = isControlled ? error.status : 500;
    const errorCode = isControlled ? error.code : 'internal_error';
    const errorMessage = isControlled ? error.message : 'Erro interno do servidor';
    log('error', 'cakto.erro', {
      codigo: errorCode,
      status: httpStatus,
      detalhe: isControlled ? undefined : error instanceof Error ? error.message : String(error),
    });

    const responseBody = { error: errorMessage, code: errorCode };
    if (supabase) {
      await recordWebhookLog(supabase, {
        event, payload, responseBody, httpStatus, status: 'failed', errorCode, errorMessage, durationMs: Date.now() - startedAt,
      });
    }
    return jsonResponse(responseBody, httpStatus);
  }
});
