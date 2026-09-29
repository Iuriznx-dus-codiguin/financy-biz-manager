import { describe, expect, it } from 'vitest';
import { categoryFor, identifyPlan, isRefundEvent, normalizePayload, redactPayload, valorPago } from './cakto';

const evento = (dados: Record<string, unknown>, event = 'purchase_approved') => normalizePayload({ event, data: dados });

describe('cakto: identificação do plano', () => {
  it('reconhece o plan_id enviado nos metadados', () => {
    expect(identifyPlan(evento({ metadata: { plan_id: 'pessoal_plus_mensal' } }))?.plan_id).toBe('personal_plus_monthly');
  });

  it('reconhece o nome comercial exato do plano', () => {
    expect(identifyPlan(evento({ product: { name: 'Super Company - Anual' } }))?.plan_id).toBe('business_enterprise_yearly');
  });

  it('reconhece a oferta pelo id ou pela URL de checkout', () => {
    expect(identifyPlan(evento({ offer: { id: 'izhudpq' } }))?.plan_id).toBe('business_plus_monthly');
    expect(identifyPlan(evento({ checkoutUrl: 'https://pay.cakto.com.br/t2cpi2a_590702' }))?.plan_id).toBe('business_enterprise_yearly');
  });

  it('corrigido (A-12): "Plano Plus Mensal" é mensal — "plano" não é "ano"', () => {
    expect(identifyPlan(evento({ product: { name: 'Plano Plus Mensal' } }))?.plan_id).toBe('personal_plus_monthly');
  });

  it('corrigido (A-12): "Produto … Plus" é Plus — "produto" não é "pro"', () => {
    expect(identifyPlan(evento({ product: { name: 'Produto Financy Plus Mensal' } }))?.plan_id).toBe('personal_plus_monthly');
  });

  it('identifica período anual e plano empresarial por palavras', () => {
    expect(identifyPlan(evento({ offer: { name: 'Financy PRO Empresarial Anual' } }))?.plan_id).toBe('business_pro_yearly');
  });

  it('devolve limites e duração do catálogo', () => {
    const plano = identifyPlan(evento({ metadata: { plan_id: 'empresarial_pro_mensal' } }));
    expect(plano).toMatchObject({ duration_days: 30, price: 97, features: { max_dashboards: 2 } });
  });

  it('não chuta quando não reconhece', () => {
    expect(identifyPlan(evento({ product: { name: 'Curso de Excel' } }))).toBeNull();
  });
});

describe('cakto: valor', () => {
  it('reais continuam reais', () => {
    expect(valorPago(19.9, 19.9)).toBe(19.9);
    expect(valorPago('97.00', 97)).toBe(97);
  });

  it('corrigido (A-12): R$ 1.170,00 não vira R$ 11,70', () => {
    expect(valorPago(1170, 1170)).toBe(1170);
    expect(valorPago('1.170,00', 1170)).toBe(1170);
  });

  it('centavos são convertidos pelo preço de referência', () => {
    expect(valorPago(117000, 1170)).toBe(1170);
    expect(valorPago(4490, 44.9)).toBe(44.9);
  });

  it('valor com cupom continua na unidade certa', () => {
    expect(valorPago(15.92, 19.9)).toBe(15.92);
  });

  it('sem referência trata como reais; inválido vira 0', () => {
    expect(valorPago(250)).toBe(250);
    expect(valorPago('abc', 19.9)).toBe(0);
  });
});

describe('cakto: normalização e categoria', () => {
  it('corrigido (A-12): lê paymentMethod em camelCase', () => {
    expect(evento({ paymentMethod: 'pix' }).paymentMethod).toBe('pix');
  });

  it('categoriza os eventos do contrato', () => {
    expect(categoryFor(evento({}, 'purchase_approved'))).toBe('approved');
    expect(categoryFor(evento({}, 'subscription_renewed'))).toBe('approved');
    expect(categoryFor(evento({}, 'chargeback'))).toBe('cancellation');
    expect(categoryFor(evento({}, 'pix_gerado'))).toBe('pending');
    expect(categoryFor(evento({}, 'subscription_renewal_refused'))).toBe('failed');
    expect(categoryFor(evento({}, 'initiate_checkout'))).toBe('funnel');
    expect(isRefundEvent(evento({}, 'purchase_refunded'))).toBe(true);
    expect(isRefundEvent(evento({}, 'subscription_canceled'))).toBe(false);
  });
});

describe('cakto: log sem dados pessoais', () => {
  it('mascara segredo, documento, telefone, nome e e-mail do cliente; mantém produto e oferta', () => {
    const limpo = redactPayload({
      secret: 's3gr3d0',
      data: {
        customer: { name: 'Maria Souza', email: 'maria@exemplo.com', phone: '11999999999', docNumber: '12345678900' },
        product: { name: 'Plus Pessoal - Mensal' },
        offer: { id: 'gbmkspq', name: 'Plus Mensal' },
        amount: 19.9,
      },
    });
    expect(limpo.secret).toBe('***');
    expect(limpo.data.customer).toEqual({ name: '***', email: 'ma***@exemplo.com', phone: '***', docNumber: '***' });
    expect(limpo.data.product.name).toBe('Plus Pessoal - Mensal');
    expect(limpo.data.offer).toEqual({ id: 'gbmkspq', name: 'Plus Mensal' });
    expect(limpo.data.amount).toBe(19.9);
  });
});
