import { describe, expect, it } from 'vitest';
import {
  assinaturaAtiva, limiteDeDashboards, planoDaAssinatura, podeCriarDashboard, situacaoAssinatura, temRecurso,
} from './assinatura';
import { PLANOS, planoPorId } from './planos';

const agora = new Date('2026-09-27T12:00:00Z');
const ativa = (plan_id: string, extra: Record<string, unknown> = {}) => ({
  status: 'active', subscription_type: planoPorId(plan_id)!.tipo, expires_at: '2026-10-27T12:00:00Z',
  plan_id, plan_name: planoPorId(plan_id)!.nomeCompleto, features: planoPorId(plan_id)!.limites, ...extra,
});

describe('catálogo de planos', () => {
  it('tem os 10 planos vendidos com preços e limites de produção', () => {
    expect(PLANOS).toHaveLength(10);
    expect(planoPorId('business_enterprise_yearly')).toMatchObject({ preco: 1170, duracaoDias: 365 });
    expect(planoPorId('personal_plus_monthly')?.ofertasCakto).toContain('gbmkspq');
  });
});

describe('assinaturaAtiva (mesma regra do bloqueio do front)', () => {
  it('ativa dentro do prazo', () => {
    expect(assinaturaAtiva(ativa('personal_plus_monthly'), null, agora)).toBe(true);
  });
  it('bloqueia expirada, pendente, atrasada, cancelada e inexistente', () => {
    expect(assinaturaAtiva(ativa('personal_plus_monthly', { expires_at: '2026-09-01T00:00:00Z' }), null, agora)).toBe(false);
    expect(assinaturaAtiva({ status: 'pending_payment', subscription_type: 'pending', expires_at: null }, null, agora)).toBe(false);
    expect(assinaturaAtiva(ativa('personal_plus_monthly', { status: 'past_due' }), null, agora)).toBe(false);
    expect(assinaturaAtiva(ativa('personal_plus_monthly', { status: 'cancelled' }), null, agora)).toBe(false);
    expect(assinaturaAtiva(null, null, agora)).toBe(false);
  });
  it('desenvolvedor nunca expira (pelo registro ou pela tabela legada subscribers)', () => {
    expect(assinaturaAtiva({ status: 'active', subscription_type: 'developer', expires_at: null }, null, agora)).toBe(true);
    expect(assinaturaAtiva(null, { subscription_tier: 'developer', subscribed: true }, agora)).toBe(true);
  });
  it('descreve a situação', () => {
    expect(situacaoAssinatura({ status: 'past_due', subscription_type: 'business', expires_at: null }, null, agora)).toBe('pagamento_atrasado');
    expect(situacaoAssinatura({ status: 'pending_payment', subscription_type: 'pending', expires_at: null }, null, agora)).toBe('pagamento_pendente');
    expect(situacaoAssinatura(ativa('personal_pro_yearly', { expires_at: '2020-01-01T00:00:00Z' }), null, agora)).toBe('expirada');
  });
});

describe('limites e recursos por plan_id (corrige A-05/A-06)', () => {
  it.each([
    ['personal_plus_monthly', 1],
    ['personal_pro_monthly', 3],
    ['business_plus_monthly', 1],
    ['business_pro_yearly', 2],
    ['business_enterprise_monthly', 10],
  ])('%s permite %d dashboard(s)', (planId, limite) => {
    expect(limiteDeDashboards(ativa(planId), null, agora)).toBe(limite);
  });
  it('prefere o limite gravado pelo webhook e usa o catálogo para registros antigos', () => {
    expect(limiteDeDashboards(ativa('personal_plus_monthly', { features: { max_dashboards: 4 } }), null, agora)).toBe(4);
    expect(limiteDeDashboards({ status: 'active', subscription_type: 'business', expires_at: null, plan_name: 'PRO Empresarial - Mensal' }, null, agora)).toBe(2);
  });
  it('desenvolvedor é ilimitado e bloqueado não cria dashboards', () => {
    expect(limiteDeDashboards(null, { subscription_tier: 'developer', subscribed: true }, agora)).toBe(-1);
    expect(limiteDeDashboards({ status: 'pending_payment', subscription_type: 'pending', expires_at: null }, null, agora)).toBe(0);
    expect(podeCriarDashboard(9, -1)).toBe(true);
    expect(podeCriarDashboard(1, 1)).toBe(false);
  });
  it('Plus Pessoal tem IA básica; os demais planos, dashboard avançado', () => {
    expect(temRecurso('dashboard_avancado', ativa('personal_plus_monthly'), null, agora)).toBe(false);
    expect(temRecurso('inteligencia_basica', ativa('personal_plus_monthly'), null, agora)).toBe(true);
    expect(temRecurso('dashboard_avancado', ativa('business_plus_monthly'), null, agora)).toBe(true);
    expect(temRecurso('inteligencia_avancada', ativa('personal_pro_monthly'), null, agora)).toBe(true);
  });
  it('encontra o plano pelo plan_id ou pelo plan_name antigo', () => {
    expect(planoDaAssinatura({ status: 'active', subscription_type: 'personal', expires_at: null, plan_name: 'Pro Pessoal - Anual' })?.id).toBe('personal_pro_yearly');
  });
});

describe('planoDaAssinatura com plan_name antigo', () => {
  it('reconhece o plano pelas palavras do nome quando não há plan_id nem nome exato', () => {
    expect(planoDaAssinatura({ status: 'active', subscription_type: 'personal', expires_at: null, plan_name: 'Pro Pessoal Mensal' })?.id)
      .toBe('personal_pro_monthly');
    expect(planoDaAssinatura({ status: 'active', subscription_type: 'business', expires_at: null, plan_name: 'Plano PRO Empresarial Anual' })?.id)
      .toBe('business_pro_yearly');
    expect(planoDaAssinatura({ status: 'active', subscription_type: 'business', expires_at: null, plan_name: 'Super Company' })?.id)
      .toBe('business_enterprise_monthly');
    expect(planoDaAssinatura({ status: 'active', subscription_type: 'personal', expires_at: null, plan_name: 'Produto qualquer' })).toBeNull();
  });
});
