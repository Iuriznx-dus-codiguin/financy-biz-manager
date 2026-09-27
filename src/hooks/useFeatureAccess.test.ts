import { describe, expect, it } from 'vitest';
import { resolveTier } from './useFeatureAccess';

const futuro = '2099-01-01T00:00:00Z';
const tier = (plano: string, tipo: string) => resolveTier(tipo, plano, 'active', futuro);

describe('resolveTier (tier deduzido do nome do plano)', () => {
  it('planos pessoais', () => {
    expect(tier('Plus Pessoal - Mensal', 'personal')).toBe('plus');
    expect(tier('Pro Pessoal - Anual', 'personal')).toBe('pro');
  });

  it('comportamento atual (bug A-05): todo plano empresarial vira "premium" (5 perfis)', () => {
    expect(tier('Plus Empresarial - Mensal', 'business')).toBe('premium');
    expect(tier('PRO Empresarial - Mensal', 'business')).toBe('premium');
    expect(tier('Super Company - Anual', 'business')).toBe('premium');
  });

  it('sem assinatura ativa ou expirada vira "unsubscribed"', () => {
    expect(resolveTier('personal', 'Plus Pessoal - Mensal', 'pending_payment', futuro)).toBe('unsubscribed');
    expect(resolveTier('personal', 'Plus Pessoal - Mensal', 'active', '2000-01-01T00:00:00Z')).toBe('unsubscribed');
  });
});
