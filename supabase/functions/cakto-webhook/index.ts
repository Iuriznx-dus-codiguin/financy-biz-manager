import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkEnv, constantTimeCompare, generateHmacSha256 } from '../_shared/utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.financy.site',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type JsonObject = Record<string, any>;

interface PlanConfig {
  subscription_type: 'personal' | 'business';
  plan_name: string;
  plan_id: string;
  billing_period: 'monthly' | 'yearly';
  duration_days: number;
  features: {
    max_dashboards: number;
    ai_requests_per_month: number;
    team_members: number;
    whatsapp_integration: boolean;
    advanced_analytics?: boolean;
    advanced_reports?: boolean;
    priority_support?: boolean;
    custom_categories?: boolean;
    export_data?: boolean;
  };
}

interface NormalizedCaktoPayload {
  raw: JsonObject;
  data: JsonObject;
  eventType: string;
  status: string;
  email: string;
  amount: number;
  transactionId: string;
  subscriptionId: string;
  customerId: string;
  productName: string;
  offerName: string;
  planHint: string;
  paymentMethod: string;
  metadata: JsonObject;
}

class WebhookError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const PLAN_MAPPINGS: Record<string, PlanConfig> = {
  pessoal_plus_mensal: {
    subscription_type: 'personal',
    plan_name: 'Plus Pessoal - Mensal',
    plan_id: 'personal_plus_monthly',
    billing_period: 'monthly',
    duration_days: 30,
    features: { max_dashboards: 1, ai_requests_per_month: -1, team_members: 1, whatsapp_integration: true },
  },
  pessoal_plus_anual: {
    subscription_type: 'personal',
    plan_name: 'Plus Pessoal - Anual',
    plan_id: 'personal_plus_yearly',
    billing_period: 'yearly',
    duration_days: 365,
    features: { max_dashboards: 1, ai_requests_per_month: -1, team_members: 1, whatsapp_integration: true },
  },
  pessoal_pro_mensal: {
    subscription_type: 'personal',
    plan_name: 'Pro Pessoal - Mensal',
    plan_id: 'personal_pro_monthly',
    billing_period: 'monthly',
    duration_days: 30,
    features: { max_dashboards: 3, ai_requests_per_month: -1, team_members: 1, whatsapp_integration: true, advanced_analytics: true, priority_support: true },
  },
  pessoal_pro_anual: {
    subscription_type: 'personal',
    plan_name: 'Pro Pessoal - Anual',
    plan_id: 'personal_pro_yearly',
    billing_period: 'yearly',
    duration_days: 365,
    features: { max_dashboards: 3, ai_requests_per_month: -1, team_members: 1, whatsapp_integration: true, advanced_analytics: true, priority_support: true },
  },
  empresarial_plus_mensal: {
    subscription_type: 'business',
    plan_name: 'Plus Empresarial - Mensal',
    plan_id: 'business_plus_monthly',
    billing_period: 'monthly',
    duration_days: 30,
    features: { max_dashboards: 1, ai_requests_per_month: -1, team_members: 5, whatsapp_integration: true, advanced_reports: true, priority_support: true },
  },
  empresarial_plus_anual: {
    subscription_type: 'business',
    plan_name: 'Plus Empresarial - Anual',
    plan_id: 'business_plus_yearly',
    billing_period: 'yearly',
    duration_days: 365,
    features: { max_dashboards: 1, ai_requests_per_month: -1, team_members: 5, whatsapp_integration: true, advanced_reports: true, priority_support: true },
  },
  empresarial_pro_mensal: {
    subscription_type: 'business',
    plan_name: 'PRO Empresarial - Mensal',
    plan_id: 'business_pro_monthly',
    billing_period: 'monthly',
    duration_days: 30,
    features: { max_dashboards: 2, ai_requests_per_month: -1, team_members: -1, whatsapp_integration: true, advanced_reports: true, advanced_analytics: true, priority_support: true, custom_categories: true },
  },
  empresarial_pro_anual: {
    subscription_type: 'business',
    plan_name: 'PRO Empresarial - Anual',
    plan_id: 'business_pro_yearly',
    billing_period: 'yearly',
    duration_days: 365,
    features: { max_dashboards: 2, ai_requests_per_month: -1, team_members: -1, whatsapp_integration: true, advanced_reports: true, advanced_analytics: true, priority_support: true, custom_categories: true },
  },
  empresarial_enterprise_mensal: {
    subscription_type: 'business',
    plan_name: 'Super Company - Mensal',
    plan_id: 'business_enterprise_monthly',
    billing_period: 'monthly',
    duration_days: 30,
    features: { max_dashboards: 10, ai_requests_per_month: -1, team_members: -1, whatsapp_integration: true, advanced_reports: true, advanced_analytics: true, priority_support: true, custom_categories: true, export_data: true },
  },
  empresarial_enterprise_anual: {
    subscription_type: 'business',
    plan_name: 'Super Company - Anual',
    plan_id: 'business_enterprise_yearly',
    billing_period: 'yearly',
    duration_days: 365,
    features: { max_dashboards: 10, ai_requests_per_month: -1, team_members: -1, whatsapp_integration: true, advanced_reports: true, advanced_analytics: true, priority_support: true, custom_categories: true, export_data: true },
  },
};

const PLAN_ALIASES: Record<string, string> = {
  personal_plus_monthly: 'pessoal_plus_mensal',
  personal_plus_yearly: 'pessoal_plus_anual',
  personal_pro_monthly: 'pessoal_pro_mensal',
  personal_pro_yearly: 'pessoal_pro_anual',
  business_plus_monthly: 'empresarial_plus_mensal',
  business_plus_yearly: 'empresarial_plus_anual',
  business_pro_monthly: 'empresarial_pro_mensal',
  business_pro_yearly: 'empresarial_pro_anual',
  business_enterprise_monthly: 'empresarial_enterprise_mensal',
  business_enterprise_yearly: 'empresarial_enterprise_anual',
  personal_plus_annual: 'pessoal_plus_anual',
  personal_pro_annual: 'pessoal_pro_anual',
  business_plus_annual: 'empresarial_plus_anual',
  business_pro_annual: 'empresarial_pro_anual',
  business_enterprise_annual: 'empresarial_enterprise_anual',
};

// Eventos oficiais da Cakto (https://docs.cakto.com.br/api-reference/webhooks/create.md)
const APPROVED_STATUSES = new Set(['approved', 'paid', 'completed', 'success', 'active', 'payment_approved', 'purchase_approved']);
const APPROVED_EVENTS = new Set([
  'purchase_approved',
  'payment_approved',
  'order_paid',
  'subscription_renewed',
  // subscription_created NÃO ativa por si só — aguardamos purchase_approved/subscription_renewed
]);
const CANCELLATION_EVENTS = new Set([
  'subscription_canceled',
  'subscription_cancelled', // tolerância a variação ortográfica
  'refund',
  'chargeback',
  'subscription_expired',
  // Aliases tolerados de integrações antigas
  'purchase_refunded',
  'payment_refunded',
  'refund_approved',
  'chargeback_created',
]);
const CANCELLATION_STATUSES = new Set(['cancelled', 'canceled', 'refunded', 'chargeback', 'expired', 'inactive']);
// Eventos de pagamento pendente: PIX/boleto/picpay/openfinance gerados — apenas registrar
const PENDING_PAYMENT_EVENTS = new Set([
  'pix_gerado',
  'boleto_gerado',
  'picpay_gerado',
  'openfinance_nubank_gerado',
]);
// Eventos de falha de cobrança: recusa de compra ou de renovação
const FAILED_PAYMENT_EVENTS = new Set([
  'purchase_refused',
  'subscription_renewal_refused',
]);
// Eventos de funil (apenas log)
const FUNNEL_EVENTS = new Set([
  'initiate_checkout',
  'checkout_abandonment',
]);

function jsonResponse(body: JsonObject, status = 200): Response {
  return new Response(JSON.stringify({ ...body, timestamp: new Date().toISOString() }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getValue(source: JsonObject, paths: string[]): any {
  for (const path of paths) {
    const value = path.split('.').reduce<any>((current, key) => current?.[key], source);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function asObject(value: any): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function sanitizeText(value: any): string {
  return typeof value === 'string' ? value.trim() : value === undefined || value === null ? '' : String(value).trim();
}

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeEmail(value: any): string {
  return sanitizeText(value).toLowerCase();
}

function parseAmount(value: any): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value > 1000 ? value / 100 : value;
  const text = sanitizeText(value).replace(/[^0-9,.-]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(text);
  if (!Number.isFinite(parsed)) return 0;
  return parsed > 1000 ? parsed / 100 : parsed;
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return 'email_indisponivel';
  return `${name.slice(0, 2)}***@${domain}`;
}

function normalizePayload(payload: JsonObject): NormalizedCaktoPayload {
  const data = asObject(payload.data);
  const merged = { ...payload, ...data };
  const metadata = {
    ...asObject(payload.metadata),
    ...asObject(data.metadata),
    ...asObject(getValue(merged, ['product.metadata', 'offer.metadata', 'subscription.metadata'])),
  };

  const eventType = normalizeKey(sanitizeText(getValue(merged, ['event', 'event_type', 'type', 'name'])));
  const status = normalizeKey(sanitizeText(getValue(merged, ['status', 'payment_status', 'payment.status', 'purchase.status', 'subscription.status'])));
  const email = normalizeEmail(getValue(merged, [
    'customer.email', 'buyer.email', 'client.email', 'user.email', 'payment.customer.email', 'purchase.customer.email',
    'customer_email', 'email', 'payer_email', 'contact.email',
  ]));
  const transactionId = sanitizeText(getValue(merged, [
    'transaction_id', 'transaction.id', 'payment.transaction_id', 'payment.id', 'purchase.id', 'order.id', 'id', 'sale_id', 'checkout_id',
  ]));
  const subscriptionId = sanitizeText(getValue(merged, ['subscription.id', 'subscription_id', 'cakto_subscription_id', 'recurrence.id'])) || transactionId;
  const customerId = sanitizeText(getValue(merged, ['customer.id', 'buyer.id', 'client.id', 'customer_id']));
  const productName = sanitizeText(getValue(merged, [
    'product.name', 'product.title', 'product_name', 'productName', 'offer.product.name', 'items.0.product.name', 'item.name',
  ]));
  const offerName = sanitizeText(getValue(merged, ['offer.name', 'offer.title', 'offer_name', 'plan.name', 'plan.title']));
  const planHint = sanitizeText(getValue({ ...merged, metadata }, [
    'metadata.plan_id', 'metadata.plan', 'metadata.plan_slug', 'metadata.subscription_plan', 'plan_id', 'plan.slug', 'plan.id', 'offer.code', 'product.code',
  ]));
  const paymentMethod = sanitizeText(getValue(merged, ['payment_method', 'payment.method', 'method', 'payment.type'])) || 'Cakto';
  const amount = parseAmount(getValue(merged, ['amount', 'total_amount', 'price', 'value', 'payment.amount', 'purchase.amount', 'paid_amount']));

  return { raw: payload, data, eventType, status, email, amount, transactionId, subscriptionId, customerId, productName, offerName, planHint, paymentMethod, metadata };
}

function identifyPlan(event: NormalizedCaktoPayload): PlanConfig | null {
  const candidates = [
    event.planHint,
    event.metadata?.plan_id,
    event.metadata?.plan,
    event.metadata?.plan_slug,
    event.productName,
    event.offerName,
  ]
    .map(sanitizeText)
    .filter(Boolean);

  for (const candidate of candidates) {
    const key = normalizeKey(candidate);
    const alias = PLAN_ALIASES[key] || key;
    if (PLAN_MAPPINGS[alias]) return PLAN_MAPPINGS[alias];

    for (const [mappingKey, config] of Object.entries(PLAN_MAPPINGS)) {
      const normalizedPlanId = normalizeKey(config.plan_id);
      const normalizedName = normalizeKey(config.plan_name);
      if (key.includes(mappingKey) || key.includes(normalizedPlanId) || key.includes(normalizedName)) return config;
    }
  }

  const searchable = normalizeKey(candidates.join(' '));
  const isYearly = /anual|annual|yearly|ano/.test(searchable);
  const isBusiness = /empresarial|business|empresa|company/.test(searchable);
  const type = isBusiness ? 'empresarial' : 'pessoal';
  const period = isYearly ? 'anual' : 'mensal';

  if (/super|enterprise|company/.test(searchable)) return PLAN_MAPPINGS[`empresarial_enterprise_${period}`] || null;
  if (/pro/.test(searchable)) return PLAN_MAPPINGS[`${type}_pro_${period}`] || null;
  if (/plus/.test(searchable)) return PLAN_MAPPINGS[`${type}_plus_${period}`] || null;
  return null;
}

function isApprovedEvent(event: NormalizedCaktoPayload): boolean {
  return APPROVED_EVENTS.has(event.eventType) || APPROVED_STATUSES.has(event.status);
}

function isCancellationEvent(event: NormalizedCaktoPayload): boolean {
  return CANCELLATION_EVENTS.has(event.eventType) || CANCELLATION_STATUSES.has(event.status);
}

function tierFromPlan(planId: string): string {
  const tierMapping: Record<string, string> = {
    personal_plus_monthly: 'plus',
    personal_plus_yearly: 'plus',
    personal_pro_monthly: 'premium',
    personal_pro_yearly: 'premium',
    business_plus_monthly: 'plus',
    business_plus_yearly: 'plus',
    business_pro_monthly: 'premium',
    business_pro_yearly: 'premium',
    business_enterprise_monthly: 'enterprise',
    business_enterprise_yearly: 'enterprise',
  };
  return tierMapping[planId] || 'premium';
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
  const amount = event.amount || 0;
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


serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') throw new WebhookError(405, 'method_not_allowed', 'Método não permitido');

    const envVars = checkEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CAKTO_WEBHOOK_SECRET']);
    const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);
    const rawBody = await req.text();

    let payload: JsonObject;
    try {
      payload = JSON.parse(rawBody || '{}');
    } catch {
      throw new WebhookError(400, 'invalid_json', 'JSON inválido');
    }

    await authenticateWebhook(req, rawBody, payload, envVars.CAKTO_WEBHOOK_SECRET);

    const event = normalizePayload(payload);
    console.log('Webhook Cakto autenticado', {
      event: event.eventType,
      status: event.status,
      email: event.email ? maskEmail(event.email) : null,
      transaction_id: event.transactionId || event.subscriptionId || null,
      product: event.productName || event.offerName || null,
    });

    if (isApprovedEvent(event)) return await processApprovedPayment(supabase, event);
    if (isCancellationEvent(event)) return await processSubscriptionStop(supabase, event);
    if (PENDING_PAYMENT_EVENTS.has(event.eventType)) return await processPendingPayment(supabase, event);
    if (FAILED_PAYMENT_EVENTS.has(event.eventType)) return await processFailedPayment(supabase, event);
    if (FUNNEL_EVENTS.has(event.eventType) || event.eventType === 'subscription_created') {
      console.log('Webhook Cakto: evento de funil/criação registrado', { event: event.eventType, email: event.email ? maskEmail(event.email) : null });
      return jsonResponse({ success: true, message: 'Evento de funil registrado', event: event.eventType });
    }

    return jsonResponse({ success: true, ignored: true, message: 'Evento recebido mas não processado', event: event.eventType || event.status || 'unknown' });
  } catch (error) {
    if (error instanceof WebhookError) {
      console.error('Webhook Cakto erro controlado', { code: error.code, status: error.status, message: error.message });
      return jsonResponse({ error: error.message, code: error.code }, error.status);
    }

    console.error('Webhook Cakto erro inesperado', error);
    return jsonResponse({ error: 'Erro interno do servidor', code: 'internal_error' }, 500);
  }
});