// Regras puras do webhook da Cakto: normalização do payload, categoria do evento, identificação do plano
// e valor pago. Sem dependências de runtime (Deno ou Node) para poder ser testado com Vitest.
//
// Contrato preservado: mesmos eventos aceitos, mesmos caminhos de leitura do payload (mais alguns novos).

import { interpretarValor } from './dinheiro.ts';
import { type LimitesPlano, type Plano, PLANOS, planoPorChaveCakto, planoPorId, planoPorNomeAproximado } from './planos.ts';

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- payload JSON de terceiros, navegado por caminho
export type JsonObject = Record<string, any>;

export interface PlanConfig {
  subscription_type: 'personal' | 'business';
  plan_name: string;
  plan_id: string;
  billing_period: 'monthly' | 'yearly';
  duration_days: number;
  /** Preço de referência do catálogo, usado para validar a unidade do valor recebido. */
  price: number;
  features: LimitesPlano;
}

export interface NormalizedCaktoPayload {
  raw: JsonObject;
  data: JsonObject;
  eventType: string;
  status: string;
  email: string;
  /** Valor como veio no payload (reais ou centavos); use `valorPago` para o valor em reais. */
  rawAmount: unknown;
  transactionId: string;
  subscriptionId: string;
  customerId: string;
  productName: string;
  offerName: string;
  offerId: string;
  checkoutUrl: string;
  planHint: string;
  paymentMethod: string;
  metadata: JsonObject;
}

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

export function isApprovedEvent(event: NormalizedCaktoPayload): boolean {
  return APPROVED_EVENTS.has(event.eventType) || APPROVED_STATUSES.has(event.status);
}

export function isCancellationEvent(event: NormalizedCaktoPayload): boolean {
  return CANCELLATION_EVENTS.has(event.eventType) || CANCELLATION_STATUSES.has(event.status);
}

/** Estorno e chargeback cortam o acesso como `refunded`; os demais como `cancelled`. */
export function isRefundEvent(event: NormalizedCaktoPayload): boolean {
  return /refund|chargeback/.test(event.eventType) || /refund|chargeback/.test(event.status);
}

export function categoryFor(event: NormalizedCaktoPayload): Category {
  if (isApprovedEvent(event)) return 'approved';
  if (isCancellationEvent(event)) return 'cancellation';
  if (PENDING_PAYMENT_EVENTS.has(event.eventType)) return 'pending';
  if (FAILED_PAYMENT_EVENTS.has(event.eventType)) return 'failed';
  if (FUNNEL_EVENTS.has(event.eventType) || event.eventType === 'subscription_created') return 'funnel';
  return 'unknown';
}

// ---------------------------------------------------------------------------------------------
// Leitura do payload
// ---------------------------------------------------------------------------------------------

export function getValue(source: JsonObject, paths: string[]): unknown {
  for (const path of paths) {
    // deno-lint-ignore no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- navegação dinâmica do payload
    const value = path.split('.').reduce<any>((current, key) => current?.[key], source);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

export function asObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : {};
}

export function sanitizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value === undefined || value === null ? '' : String(value).trim();
}

export function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normalizeEmail(value: unknown): string {
  return sanitizeText(value).toLowerCase();
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
  const offerId = sanitizeText(getValue(merged, ['offer.id', 'offer.short_id', 'offer.code', 'offer_id', 'offerId']));
  const checkoutUrl = sanitizeText(getValue(merged, ['checkoutUrl', 'checkout_url', 'offer.url', 'offer.checkoutUrl']));
  const planHint = sanitizeText(getValue({ ...merged, metadata }, [
    'metadata.plan_id', 'metadata.plan', 'metadata.plan_slug', 'metadata.subscription_plan', 'plan_id', 'plan.slug', 'plan.id', 'offer.code', 'product.code',
  ]));
  const paymentMethod = sanitizeText(getValue(merged, [
    'paymentMethod', 'payment_method', 'paymentMethodName', 'payment.method', 'method', 'payment.type',
  ])) || 'Cakto';
  const rawAmount = getValue(merged, ['amount', 'total_amount', 'price', 'value', 'payment.amount', 'purchase.amount', 'paid_amount', 'baseAmount']);

  return {
    raw: payload, data, eventType, status, email, rawAmount, transactionId, subscriptionId, customerId,
    productName, offerName, offerId, checkoutUrl, planHint, paymentMethod, metadata,
  };
}

// ---------------------------------------------------------------------------------------------
// Plano
// ---------------------------------------------------------------------------------------------

export function planConfigFrom(plano: Plano): PlanConfig {
  return {
    subscription_type: plano.tipo,
    plan_name: plano.nomeCompleto,
    plan_id: plano.id,
    billing_period: plano.periodo,
    duration_days: plano.duracaoDias,
    price: plano.preco,
    features: plano.limites,
  };
}

/** Aliases antigos (ex.: personal_plus_annual) para a chave da Cakto. */
const ALIASES: Record<string, string> = {
  personal_plus_annual: 'pessoal_plus_anual',
  personal_pro_annual: 'pessoal_pro_anual',
  business_plus_annual: 'empresarial_plus_anual',
  business_pro_annual: 'empresarial_pro_anual',
  business_enterprise_annual: 'empresarial_enterprise_anual',
};

function planoPorChave(candidato: string): Plano | null {
  const chave = normalizeKey(candidato);
  return planoPorChaveCakto(ALIASES[chave] ?? chave) ?? planoPorId(chave);
}

function planoPorOferta(evento: NormalizedCaktoPayload): Plano | null {
  const trechoUrl = evento.checkoutUrl.split('?')[0].split('/').filter(Boolean).pop() ?? '';
  const candidatos = [evento.offerId, trechoUrl].map((c) => c.trim()).filter(Boolean);
  for (const candidato of candidatos) {
    const plano = PLANOS.find((p) => p.ofertasCakto.includes(candidato));
    if (plano) return plano;
  }
  return null;
}

/**
 * Identifica o plano pelo nome, comparando PALAVRAS inteiras (não substrings):
 * "Plano Plus Mensal" não é anual e "Produto Plus" não é Pro.
 */
/**
 * Ordem de identificação: oferta da Cakto (id/URL de checkout) → chave ou plan_id explícito
 * (metadados) → nome do produto/oferta por palavras inteiras.
 */
export function identifyPlan(event: NormalizedCaktoPayload): PlanConfig | null {
  const porOferta = planoPorOferta(event);
  if (porOferta) return planConfigFrom(porOferta);

  const chaves = [event.planHint, event.metadata?.plan_id, event.metadata?.plan, event.metadata?.plan_slug]
    .map(sanitizeText)
    .filter(Boolean);
  for (const chave of chaves) {
    const plano = planoPorChave(chave);
    if (plano) return planConfigFrom(plano);
  }

  for (const nome of [event.offerName, event.productName, ...chaves].filter(Boolean)) {
    const plano = planoPorNomeAproximado(nome);
    if (plano) return planConfigFrom(plano);
  }
  return null;
}

/** Tier gravado na tabela legada `subscribers` (mantido como estava). */
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

// ---------------------------------------------------------------------------------------------
// Valor
// ---------------------------------------------------------------------------------------------

/**
 * Valor pago em reais. A unidade enviada pela Cakto (reais ou centavos) é decidida comparando com o
 * preço de referência do plano: vale o candidato mais próximo (valor como veio ou dividido por 100).
 * Sem referência, o valor é tratado como reais.
 */
export function valorPago(bruto: unknown, precoReferencia?: number | null): number {
  const numero = interpretarValor(bruto);
  if (numero === null || numero < 0) return 0;
  if (!precoReferencia || precoReferencia <= 0) return numero;
  const candidatos = [numero, numero / 100];
  const distancia = (v: number) => Math.abs(v - precoReferencia) / precoReferencia;
  return candidatos.reduce((melhor, atual) => (distancia(atual) < distancia(melhor) ? atual : melhor));
}

// ---------------------------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------------------------

const CHAVES_SENSIVEIS = /^(secret|password|senha|token|document|doc_?number|docnumber|cpf|cnpj|card|cvv|phone|telefone|cellphone|celular|mobile|whatsapp|address|endereco|zip_?code|zipcode|cep|birth.*|ip)$/i;
const CHAVES_DE_NOME = /^(name|nome|full_?name|first_?name|last_?name)$/i;
const OBJETOS_DE_PESSOA = /^(customer|buyer|client|user|payer|contact|affiliate|producer)$/i;

function mascararValor(chave: string, valor: unknown): unknown {
  if (valor === null || valor === undefined) return valor;
  if (typeof valor === 'object') return '***';
  if (/email/i.test(chave) && typeof valor === 'string') return maskEmail(valor);
  return '***';
}

/**
 * Cópia do payload sem segredos nem dados pessoais, para o log de auditoria: documentos, telefones,
 * endereços e cartões viram "***", e-mails ficam mascarados e nomes são ocultados dentro de objetos de
 * pessoa (cliente, afiliado…). Nomes de produto e oferta são mantidos.
 */
export function redactPayload(payload: JsonObject): JsonObject {
  const visitar = (valor: unknown, profundidade: number, pai: string): unknown => {
    if (profundidade > 8) return '[profundo]';
    if (Array.isArray(valor)) return valor.slice(0, 50).map((v) => visitar(v, profundidade + 1, pai));
    if (!valor || typeof valor !== 'object') return valor;
    const saida: JsonObject = {};
    for (const [chave, v] of Object.entries(valor as JsonObject)) {
      const sensivel = CHAVES_SENSIVEIS.test(chave) || /email/i.test(chave) ||
        (CHAVES_DE_NOME.test(chave) && OBJETOS_DE_PESSOA.test(pai));
      saida[chave] = sensivel ? mascararValor(chave, v) : visitar(v, profundidade + 1, chave);
    }
    return saida;
  };
  try {
    return visitar(payload ?? {}, 0, '') as JsonObject;
  } catch {
    return {};
  }
}
