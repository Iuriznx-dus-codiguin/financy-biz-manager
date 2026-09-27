import { describe, expect, it } from 'vitest';
import { identifyPlan, normalizePayload, parseAmount } from './cakto';

const evento = (dados: Record<string, unknown>) => normalizePayload({ event: 'purchase_approved', data: dados });

describe('cakto: identificação do plano', () => {
  it('reconhece o plan_id enviado nos metadados', () => {
    expect(identifyPlan(evento({ metadata: { plan_id: 'pessoal_plus_mensal' } }))?.plan_id).toBe('personal_plus_monthly');
  });

  it('reconhece o nome comercial exato do plano', () => {
    expect(identifyPlan(evento({ product: { name: 'Super Company - Anual' } }))?.plan_id).toBe('business_enterprise_yearly');
  });

  it('comportamento atual (bug A-12): "Plano Plus Mensal" vira anual porque "plano" contém "ano"', () => {
    expect(identifyPlan(evento({ product: { name: 'Plano Plus Mensal' } }))?.plan_id).toBe('personal_plus_yearly');
  });

  it('comportamento atual (bug A-12): "Produto … Plus" vira Pro porque "produto" contém "pro"', () => {
    expect(identifyPlan(evento({ product: { name: 'Produto Financy Plus Mensal' } }))?.plan_id).toBe('personal_pro_monthly');
  });
});

describe('cakto: valor', () => {
  it('mantém valores até 1000 como reais', () => {
    expect(parseAmount(19.9)).toBe(19.9);
    expect(parseAmount('97.00')).toBe(97);
  });

  it('comportamento atual (bug A-12): divide por 100 qualquer valor acima de 1000', () => {
    expect(parseAmount(1170)).toBe(11.7);
    expect(parseAmount(4990)).toBe(49.9);
  });

  it('comportamento atual (bug A-12): "1.197,00" vira 1,197', () => {
    expect(parseAmount('1.197,00')).toBeCloseTo(1.197);
  });
});

describe('cakto: normalização', () => {
  it('comportamento atual (bug A-12): ignora paymentMethod em camelCase', () => {
    expect(evento({ paymentMethod: 'pix' }).paymentMethod).toBe('Cakto');
  });
});
