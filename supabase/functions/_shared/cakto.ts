// Regras puras do webhook da Cakto: normalização do payload e identificação do plano.
// Sem dependências de runtime (Deno ou Node) para poder ser testado com Vitest.

export type JsonObject = Record<string, any>;

export interface PlanConfig {
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

export interface NormalizedCaktoPayload {
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

export const PLAN_MAPPINGS: Record<string, PlanConfig> = {
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

export const PLAN_ALIASES: Record<string, string> = {
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
export const APPROVED_STATUSES = new Set(['approved', 'paid', 'completed', 'success', 'active', 'payment_approved', 'purchase_approved']);
export const APPROVED_EVENTS = new Set([
  'purchase_approved',
  'payment_approved',
  'order_paid',
  'subscription_renewed',
  // subscription_created NÃO ativa por si só — aguardamos purchase_approved/subscription_renewed
]);
export const CANCELLATION_EVENTS = new Set([
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
export const CANCELLATION_STATUSES = new Set(['cancelled', 'canceled', 'refunded', 'chargeback', 'expired', 'inactive']);
// Eventos de pagamento pendente: PIX/boleto/picpay/openfinance gerados — apenas registrar
export const PENDING_PAYMENT_EVENTS = new Set([
  'pix_gerado',
  'boleto_gerado',
  'picpay_gerado',
  'openfinance_nubank_gerado',
]);
// Eventos de falha de cobrança: recusa de compra ou de renovação
export const FAILED_PAYMENT_EVENTS = new Set([
  'purchase_refused',
  'subscription_renewal_refused',
]);
// Eventos de funil (apenas log)
export const FUNNEL_EVENTS = new Set([
  'initiate_checkout',
  'checkout_abandonment',
]);

export const CATEGORY_LABELS = {
  approved: 'approved',
  cancellation: 'cancellation',
  pending: 'pending',
  failed: 'failed',
  funnel: 'funnel',
  unknown: 'unknown',
} as const;

export type Category = keyof typeof CATEGORY_LABELS;

export function categoryFor(event: NormalizedCaktoPayload): Category {
  if (isApprovedEvent(event)) return 'approved';
  if (isCancellationEvent(event)) return 'cancellation';
  if (PENDING_PAYMENT_EVENTS.has(event.eventType)) return 'pending';
  if (FAILED_PAYMENT_EVENTS.has(event.eventType)) return 'failed';
  if (FUNNEL_EVENTS.has(event.eventType) || event.eventType === 'subscription_created') return 'funnel';
  return 'unknown';
}

export function redactPayload(payload: JsonObject): JsonObject {
  try {
    const clone = JSON.parse(JSON.stringify(payload ?? {}));
    if (typeof clone?.secret === 'string') clone.secret = '***';
    if (clone?.customer && typeof clone.customer === 'object') {
      if (clone.customer.document) clone.customer.document = '***';
      if (clone.customer.cpf) clone.customer.cpf = '***';
      if (clone.customer.cnpj) clone.customer.cnpj = '***';
    }
    if (clone?.card && typeof clone.card === 'object') clone.card = '***';
    return clone;
  } catch {
    return {};
  }
}

export function getValue(source: JsonObject, paths: string[]): any {
  for (const path of paths) {
    const value = path.split('.').reduce<any>((current, key) => current?.[key], source);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

export function asObject(value: any): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function sanitizeText(value: any): string {
  return typeof value === 'string' ? value.trim() : value === undefined || value === null ? '' : String(value).trim();
}

export function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normalizeEmail(value: any): string {
  return sanitizeText(value).toLowerCase();
}

export function parseAmount(value: any): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value > 1000 ? value / 100 : value;
  const text = sanitizeText(value).replace(/[^0-9,.-]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(text);
  if (!Number.isFinite(parsed)) return 0;
  return parsed > 1000 ? parsed / 100 : parsed;
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return 'email_indisponivel';
  return `${name.slice(0, 2)}***@${domain}`;
}

export function normalizePayload(payload: JsonObject): NormalizedCaktoPayload {
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

export function identifyPlan(event: NormalizedCaktoPayload): PlanConfig | null {
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

export function isApprovedEvent(event: NormalizedCaktoPayload): boolean {
  return APPROVED_EVENTS.has(event.eventType) || APPROVED_STATUSES.has(event.status);
}

export function isCancellationEvent(event: NormalizedCaktoPayload): boolean {
  return CANCELLATION_EVENTS.has(event.eventType) || CANCELLATION_STATUSES.has(event.status);
}

export function tierFromPlan(planId: string): string {
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
