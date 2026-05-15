import { useUserSubscription } from '@/hooks/useUserSubscription';

// Feature sets por tier - definidos como constantes para evitar recriação
const PLUS_FEATURES = [
  'dashboard_basic',
  'receitas_unlimited',
  'despesas_unlimited',
  'impostos_basic',
  'inteligencia_basica',
  'whatsapp_ia',
  'export_data'
] as const;

const PRO_FEATURES = [
  ...PLUS_FEATURES,
  'dashboard_complete',
  'dashboard_avancado',
  'inteligencia_avancada',
  'relatorios_basic',
  'fechamento_caixa',
  'multi_dashboard'
] as const;

const PREMIUM_FEATURES = [
  ...PRO_FEATURES,
  'gestao_equipe',
  'fechamento_automatico',
  'whatsapp_support',
  'premiacoes_anuais',
  'relatorios_corporativos'
] as const;

const ENTERPRISE_FEATURES = [
  ...PREMIUM_FEATURES,
  'ia_pixel',
  'economia_impostos',
  'gestao_multi_empresa',
  'suporte_dedicado'
] as const;

// Sets para lookup O(1)
const PLUS_SET = new Set<string>(PLUS_FEATURES);
const PRO_SET = new Set<string>(PRO_FEATURES);
const PREMIUM_SET = new Set<string>(PREMIUM_FEATURES);
const ENTERPRISE_SET = new Set<string>(ENTERPRISE_FEATURES);

const FEATURE_MESSAGES: Record<string, string> = {
  'receitas_unlimited': 'Assine um plano para ter acesso a receitas.',
  'despesas_unlimited': 'Assine um plano para ter acesso a despesas.',
  'relatorios_basic': 'Relatórios disponíveis no plano Pro ou superior.',
  'inteligencia_basica': 'Inteligência financeira disponível em todos os planos pagos.',
  'inteligencia_avancada': 'Inteligência financeira avançada disponível no plano Pro ou superior.',
  'multi_dashboard': 'Múltiplas contas disponíveis no plano Pro (até 3) ou empresarial.',
  'fechamento_automatico': 'Fechamento automático disponível nos planos empresariais.',
  'export_data': 'Exportação de dados disponível em todos os planos pagos.',
  'gestao_equipe': 'Gestão de equipe disponível nos planos empresariais.',
};

export type Tier = 'developer' | 'plus' | 'pro' | 'premium' | 'enterprise' | 'unsubscribed';

interface PlanLimits {
  maxReceitas: number;
  maxDespesas: number;
  maxImpostos: number;
  maxMetas: number;
  maxProfiles: number;
}

const PLAN_LIMITS: Record<Tier, PlanLimits> = {
  developer:    { maxReceitas: -1, maxDespesas: -1, maxImpostos: -1, maxMetas: -1, maxProfiles: 10 },
  plus:         { maxReceitas: -1, maxDespesas: -1, maxImpostos: -1, maxMetas: -1, maxProfiles: 1 },
  pro:          { maxReceitas: -1, maxDespesas: -1, maxImpostos: -1, maxMetas: -1, maxProfiles: 3 },
  premium:      { maxReceitas: -1, maxDespesas: -1, maxImpostos: -1, maxMetas: -1, maxProfiles: 5 },
  enterprise:   { maxReceitas: -1, maxDespesas: -1, maxImpostos: -1, maxMetas: -1, maxProfiles: 10 },
  unsubscribed: { maxReceitas: 0, maxDespesas: 0, maxImpostos: 0, maxMetas: 0, maxProfiles: 0 },
};

/**
 * Resolve o tier canônico a partir dos campos brutos da assinatura.
 * subscription_type vem como: 'developer' | 'personal' | 'business' | 'pending' | 'free_trial'
 * plan_name pode conter: 'Plus', 'Pro', 'Premium', 'Empresarial', 'Enterprise', etc.
 */
export const resolveTier = (
  subscriptionType?: string | null,
  planName?: string | null,
  status?: string | null,
  expiresAt?: string | null,
): Tier => {
  if (subscriptionType === 'developer') return 'developer';

  // Sem assinatura ativa → unsubscribed
  const isActive = status === 'active' && (!expiresAt || new Date(expiresAt) > new Date());
  if (!isActive) return 'unsubscribed';

  const p = (planName || '').toLowerCase();
  if (p.includes('enterprise')) return 'enterprise';
  if (p.includes('premium') || p.includes('empresarial') || p.includes('business')) return 'premium';
  if (p.includes('pro')) return 'pro';
  if (p.includes('plus')) return 'plus';

  // Fallback por subscription_type quando plan_name não bate
  if (subscriptionType === 'business') return 'premium';
  if (subscriptionType === 'personal') return 'plus';

  return 'unsubscribed';
};

export const useFeatureAccess = () => {
  const { subscription } = useUserSubscription();

  const subscriptionTier: Tier = resolveTier(
    subscription?.subscription_type,
    subscription?.plan_name,
    subscription?.status,
    subscription?.expires_at,
  );

  const isFeatureAvailable = (feature: string): boolean => {
    switch (subscriptionTier) {
      case 'developer':  return true;
      case 'enterprise': return ENTERPRISE_SET.has(feature);
      case 'premium':    return PREMIUM_SET.has(feature);
      case 'pro':        return PRO_SET.has(feature);
      case 'plus':       return PLUS_SET.has(feature);
      default:           return false;
    }
  };

  const getFeatureLimitMessage = (feature: string): string => {
    return FEATURE_MESSAGES[feature] || 'Este recurso requer uma assinatura ativa.';
  };

  const getLimits = (): PlanLimits => PLAN_LIMITS[subscriptionTier] || PLAN_LIMITS.unsubscribed;

  return {
    isFeatureAvailable,
    getFeatureLimitMessage,
    getLimits,
    subscriptionTier,
  };
};
