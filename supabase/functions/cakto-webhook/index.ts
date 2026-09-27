import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkEnv, constantTimeCompare, generateHmacSha256 } from '../_shared/utils.ts';
import {
  type Category,
  type JsonObject,
  type NormalizedCaktoPayload,
  FAILED_PAYMENT_EVENTS,
  FUNNEL_EVENTS,
  PENDING_PAYMENT_EVENTS,
  categoryFor,
  identifyPlan,
  isApprovedEvent,
  isCancellationEvent,
  maskEmail,
  normalizePayload,
  redactPayload,
  tierFromPlan,
  valorPago,
} from '../_shared/cakto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.financy.site',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};


class WebhookError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}


function jsonResponse(body: JsonObject, status = 200): Response {
  return new Response(JSON.stringify({ ...body, timestamp: new Date().toISOString() }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}


async function recordWebhookLog(
  supabase: any,
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

    let userId: string | null = null;
    if (event?.email) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', event.email)
        .limit(1);
      userId = data?.[0]?.id ?? null;
    }

    await supabase.from('cakto_webhook_logs').insert({
      event_type: event?.eventType || null,
      category,
      status,
      http_status: httpStatus,
      attempt_count: attemptCount,
      is_retry: isRetry,
      email_masked: event?.email ? maskEmail(event.email) : null,
      user_id: userId,
      subscription_type: planConfig?.subscription_type ?? (event?.eventType?.includes('subscription') ? 'unknown' : null),
      plan_id: planConfig?.plan_id ?? null,
      plan_name: planConfig?.plan_name ?? event?.productName ?? event?.offerName ?? null,
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
    console.warn('Webhook Cakto: falha ao registrar log de auditoria', err);
  }
}



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

async function findProfileByEmail(supabase: any, email: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, created_at')
    .ilike('email', email)
    .order('created_at', { ascending: true })
    .limit(2);

  if (error) throw new WebhookError(500, 'profile_lookup_failed', 'Erro ao buscar usuário');
  if (!data || data.length === 0) return null;
  if (data.length > 1) console.warn('Webhook Cakto: múltiplos perfis para o mesmo email, usando o mais antigo', { email: maskEmail(email) });
  return data[0];
}

async function hasExistingRevenue(supabase: any, userId: string, transactionId: string): Promise<boolean> {
  if (!transactionId) return false;
  const { data, error } = await supabase
    .from('receitas')
    .select('id')
    .eq('user_id', userId)
    .eq('cakto_transaction_id', transactionId)
    .maybeSingle();
  if (error) {
    console.warn('Webhook Cakto: falha ao verificar idempotência de receita', { code: error.code, message: error.message });
    return false;
  }
  return Boolean(data);
}

async function getMainDashboardId(supabase: any, userId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_user_main_dashboard', { p_user_id: userId });
  if (error) {
    console.warn('Webhook Cakto: não foi possível obter dashboard principal', { code: error.code, message: error.message });
    return null;
  }
  return data || null;
}

async function processApprovedPayment(supabase: any, event: NormalizedCaktoPayload) {
  if (!event.email) throw new WebhookError(400, 'missing_customer_email', 'Email do cliente não informado');

  const planConfig = identifyPlan(event);
  if (!planConfig) {
    console.error('Webhook Cakto: plano não identificado', {
      event: event.eventType,
      status: event.status,
      product: event.productName,
      offer: event.offerName,
      plan_hint: event.planHint,
      transaction_id: event.transactionId,
    });
    throw new WebhookError(422, 'plan_not_identified', 'Plano não identificado');
  }

  const profile = await findProfileByEmail(supabase, event.email);
  if (!profile) {
    console.warn('Webhook Cakto: pagamento recebido antes da criação do perfil', {
      email: maskEmail(event.email),
      transaction_id: event.transactionId,
      plan_id: planConfig.plan_id,
    });
    return jsonResponse({ success: true, pending: true, code: 'profile_not_found', message: 'Pagamento recebido; usuário ainda não encontrado' }, 202);
  }

  const now = new Date();
  const subscriptionEndDate = new Date(now);
  subscriptionEndDate.setDate(subscriptionEndDate.getDate() + planConfig.duration_days);
  const amount = valorPago(event.rawAmount, planConfig.price);
  const idempotencyKey = event.transactionId || event.subscriptionId || `${profile.id}-${planConfig.plan_id}-${now.toISOString().slice(0, 10)}`;
  const alreadyRegistered = await hasExistingRevenue(supabase, profile.id, idempotencyKey);
  const dashboardId = await getMainDashboardId(supabase, profile.id);

  if (!alreadyRegistered) {
    const { error: receitaError } = await supabase
      .from('receitas')
      .insert({
        user_id: profile.id,
        data: now.toISOString().split('T')[0],
        descricao: `Pagamento de assinatura - ${planConfig.plan_name}`,
        categoria: 'Assinatura',
        cliente: event.email,
        valor: amount,
        forma_pagamento: event.paymentMethod || 'Cakto',
        dashboard_id: dashboardId,
        cakto_transaction_id: idempotencyKey,
      });

    if (receitaError && receitaError.code !== '23505') {
      console.error('Webhook Cakto: erro ao inserir receita', { code: receitaError.code, message: receitaError.message });
      throw new WebhookError(500, 'revenue_insert_failed', 'Erro ao registrar receita');
    }
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
      started_at: now.toISOString(),
      expires_at: subscriptionEndDate.toISOString(),
      renewed_at: alreadyRegistered ? undefined : now.toISOString(),
      amount,
      features: planConfig.features,
      payment_method: event.paymentMethod || 'Cakto',
      cakto_subscription_id: event.subscriptionId || idempotencyKey,
      cakto_customer_id: event.customerId || null,
      metadata: {
        ...event.metadata,
        transaction_id: event.transactionId,
        subscription_id: event.subscriptionId,
        product_name: event.productName,
        offer_name: event.offerName,
        processed_at: now.toISOString(),
        idempotent_retry: alreadyRegistered,
      },
      updated_at: now.toISOString(),
    }, { onConflict: 'user_id' });

  if (userSubscriptionError) {
    console.error('Webhook Cakto: erro ao atualizar user_subscriptions', { code: userSubscriptionError.code, message: userSubscriptionError.message });
    throw new WebhookError(500, 'subscription_upsert_failed', 'Erro ao ativar assinatura');
  }

  const { error: subscribersError } = await supabase
    .from('subscribers')
    .upsert({
      user_id: profile.id,
      email: event.email,
      subscribed: true,
      subscription_tier: tierFromPlan(planConfig.plan_id),
      subscription_end: subscriptionEndDate.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: 'email' });

  if (subscribersError) console.warn('Webhook Cakto: erro não crítico ao atualizar subscribers', { code: subscribersError.code, message: subscribersError.message });

  try {
    const { error: scheduleError } = await supabase.functions.invoke('schedule-user-webhooks', {
      body: { userId: profile.id, eventType: 'subscription_renewal' },
    });
    if (scheduleError) console.warn('Webhook Cakto: erro não crítico ao agendar renovação', scheduleError);
  } catch (scheduleError) {
    console.warn('Webhook Cakto: exceção não crítica ao agendar renovação', scheduleError);
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

  if (notificationError) console.warn('Webhook Cakto: erro não crítico ao criar notificação', { code: notificationError.code, message: notificationError.message });

  console.log('Webhook Cakto: pagamento processado', {
    email: maskEmail(event.email),
    transaction_id: idempotencyKey,
    plan_id: planConfig.plan_id,
    idempotent_retry: alreadyRegistered,
  });

  return jsonResponse({
    success: true,
    message: alreadyRegistered ? 'Pagamento já processado anteriormente' : 'Pagamento processado com sucesso',
    idempotent_retry: alreadyRegistered,
    plan: {
      name: planConfig.plan_name,
      type: planConfig.subscription_type,
      period: planConfig.billing_period,
      expires_at: subscriptionEndDate.toISOString(),
    },
  });
}

async function processSubscriptionStop(supabase: any, event: NormalizedCaktoPayload) {
  if (!event.email && !event.subscriptionId) {
    return jsonResponse({ success: true, ignored: true, code: 'missing_identifier', message: 'Evento recebido sem identificador de assinatura' });
  }

  const now = new Date().toISOString();
  let userId: string | null = null;

  if (event.email) {
    const profile = await findProfileByEmail(supabase, event.email);
    userId = profile?.id || null;
  }

  let updateQuery = supabase
    .from('user_subscriptions')
    .update({
      status: event.status.includes('refund') || event.eventType.includes('refund') ? 'refunded' : 'cancelled',
      cancelled_at: now,
      updated_at: now,
      metadata: { event_type: event.eventType, status: event.status, transaction_id: event.transactionId, processed_at: now },
    });

  if (userId) updateQuery = updateQuery.eq('user_id', userId);
  else updateQuery = updateQuery.eq('cakto_subscription_id', event.subscriptionId);

  const { error } = await updateQuery;
  if (error) {
    console.error('Webhook Cakto: erro ao cancelar assinatura', { code: error.code, message: error.message });
    throw new WebhookError(500, 'subscription_cancel_failed', 'Erro ao atualizar assinatura');
  }

  if (event.email) {
    const { error: subscriberError } = await supabase
      .from('subscribers')
      .update({ subscribed: false, updated_at: now })
      .eq('email', event.email);
    if (subscriberError) console.warn('Webhook Cakto: erro não crítico ao atualizar subscribers no cancelamento', { code: subscriberError.code, message: subscriberError.message });
  }

  return jsonResponse({ success: true, message: 'Evento de assinatura atualizado' });
}

async function processPendingPayment(supabase: any, event: NormalizedCaktoPayload) {
  // PIX/boleto/picpay/openfinance gerados: NÃO ativam assinatura, mas se houver perfil registramos a intenção
  if (!event.email) {
    return jsonResponse({ success: true, ignored: true, code: 'missing_email', message: 'Cobrança pendente recebida sem email' });
  }
  const profile = await findProfileByEmail(supabase, event.email);
  if (!profile) {
    return jsonResponse({ success: true, pending: true, code: 'profile_not_found', message: 'Cobrança pendente registrada' }, 202);
  }
  // Marca a assinatura como aguardando pagamento sem sobrescrever planos ativos
  const { data: current } = await supabase
    .from('user_subscriptions')
    .select('status')
    .eq('user_id', profile.id)
    .maybeSingle();

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
  console.log('Webhook Cakto: cobrança pendente registrada', { email: maskEmail(event.email), event: event.eventType });
  return jsonResponse({ success: true, message: 'Cobrança pendente registrada', event: event.eventType });
}

async function processFailedPayment(supabase: any, event: NormalizedCaktoPayload) {
  if (!event.email) {
    return jsonResponse({ success: true, ignored: true, code: 'missing_email', message: 'Falha de pagamento sem email' });
  }
  const profile = await findProfileByEmail(supabase, event.email);
  if (!profile) {
    return jsonResponse({ success: true, pending: true, code: 'profile_not_found', message: 'Falha registrada' }, 202);
  }
  const now = new Date().toISOString();
  // Para renovação recusada: marca past_due preservando dados do plano.
  // Para compra recusada inicial: mantém pending_payment.
  const isRenewal = event.eventType === 'subscription_renewal_refused';
  const newStatus = isRenewal ? 'past_due' : 'pending_payment';

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: newStatus,
      updated_at: now,
      metadata: { last_event: event.eventType, transaction_id: event.transactionId, failed_at: now },
    })
    .eq('user_id', profile.id);

  if (error) console.warn('Webhook Cakto: erro não crítico ao registrar falha', { code: error.code, message: error.message });

  console.log('Webhook Cakto: falha de pagamento registrada', {
    email: maskEmail(event.email),
    event: event.eventType,
    new_status: newStatus,
  });
  return jsonResponse({ success: true, message: 'Falha de pagamento registrada', new_status: newStatus });
}


function statusFromResponseBody(body: JsonObject): 'success' | 'failed' | 'ignored' | 'pending' {
  if (body?.error) return 'failed';
  if (body?.ignored) return 'ignored';
  if (body?.pending) return 'pending';
  return 'success';
}

async function captureResponse(res: Response): Promise<{ res: Response; body: JsonObject; status: number }> {
  const cloned = res.clone();
  let body: JsonObject = {};
  try {
    body = await cloned.json();
  } catch {
    body = {};
  }
  return { res, body, status: res.status };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const startedAt = Date.now();
  let supabase: any = null;
  let payload: JsonObject = {};
  let event: NormalizedCaktoPayload | null = null;

  try {
    if (req.method !== 'POST') throw new WebhookError(405, 'method_not_allowed', 'Método não permitido');

    const envVars = checkEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CAKTO_WEBHOOK_SECRET']);
    supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);
    const rawBody = await req.text();

    try {
      payload = JSON.parse(rawBody || '{}');
    } catch {
      throw new WebhookError(400, 'invalid_json', 'JSON inválido');
    }

    await authenticateWebhook(req, rawBody, payload, envVars.CAKTO_WEBHOOK_SECRET);

    event = normalizePayload(payload);
    console.log('Webhook Cakto autenticado', {
      event: event.eventType,
      status: event.status,
      email: event.email ? maskEmail(event.email) : null,
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
      console.log('Webhook Cakto: evento de funil/criação registrado', { event: event.eventType, email: event.email ? maskEmail(event.email) : null });
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
    const durationMs = Date.now() - startedAt;
    const isControlled = error instanceof WebhookError;
    const httpStatus = isControlled ? (error as WebhookError).status : 500;
    const errorCode = isControlled ? (error as WebhookError).code : 'internal_error';
    const errorMessage = isControlled ? (error as WebhookError).message : 'Erro interno do servidor';

    if (isControlled) {
      console.error('Webhook Cakto erro controlado', { code: errorCode, status: httpStatus, message: errorMessage });
    } else {
      console.error('Webhook Cakto erro inesperado', error);
    }

    const responseBody = { error: errorMessage, code: errorCode };
    if (supabase) {
      await recordWebhookLog(supabase, {
        event,
        payload,
        responseBody,
        httpStatus,
        status: 'failed',
        errorCode,
        errorMessage,
        durationMs,
      });
    }
    return jsonResponse(responseBody, httpStatus);
  }
});
