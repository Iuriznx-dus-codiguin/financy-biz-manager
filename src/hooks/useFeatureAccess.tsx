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
 * Mapa autoritativo plan_id → tier.
 *
 * `plan_id` é gravado pelo webhook da Cakto a partir de PLAN_MAPPINGS e é o
 * único identificador estável do plano. Classificar por `plan_name` (como era
 * feito antes) errava em dois casos reais:
 *   - "Super Company" (Enterprise) não contém a palavra "enterprise" e caía no
 *     fallback `subscription_type === 'business'` → premium, tirando do cliente
 *     do plano mais caro as features ia_pixel, economia_impostos,
 *     gestao_multi_empresa e suporte_dedicado que ele estava pagando;
 *   - "PRO Empresarial" e "Plus Empresarial" casavam ambos em 'empresarial'
 *     antes de 'pro', então o assinante Pro recebia exatamente o mesmo conjunto
 *     de features do Plus.
 */
const PLAN_ID_TO_TIER: Record<string, Tier> = {
  personal_plus_monthly: 'plus',
  personal_plus_yearly: 'plus',
  personal_pro_monthly: 'pro',
  personal_pro_yearly: 'pro',
  business_plus_monthly: 'premium',
  business_plus_yearly: 'premium',
  business_pro_monthly: 'premium',
  business_pro_yearly: 'premium',
  business_enterprise_monthly: 'enterprise',
  business_enterprise_yearly: 'enterprise',
};

/**
 * Resolve o tier canônico a partir dos campos brutos da assinatura.
 * subscription_type vem como: 'developer' | 'personal' | 'business' | 'pending' | 'free_trial'
 */
export const resolveTier = (
  subscriptionType?: string | null,
  planName?: string | null,
  status?: string | null,
  expiresAt?: string | null,
  planId?: string | null,
): Tier => {
  if (subscriptionType === 'developer') return 'developer';

  // Sem assinatura ativa → unsubscribed
  const isActive = status === 'active' && (!expiresAt || new Date(expiresAt) > new Date());
  if (!isActive) return 'unsubscribed';

  // 1) plan_id — identificador estável, preferido sempre que presente
  const byPlanId = planId ? PLAN_ID_TO_TIER[planId.toLowerCase()] : undefined;
  if (byPlanId) return byPlanId;

  // 2) plan_name — fallback para assinaturas antigas sem plan_id gravado.
  //    A ordem importa: nomes mais específicos primeiro.
  const p = (planName || '').toLowerCase();
  const isBusiness = /empresarial|business|company/.test(p);
  if (/enterprise|super company/.test(p)) return 'enterprise';
  if (/\bpro\b/.test(p)) return isBusiness ? 'premium' : 'pro';
  if (/\bplus\b/.test(p)) return isBusiness ? 'premium' : 'plus';
  if (p.includes('premium')) return 'premium';
  if (isBusiness) return 'premium';

  // 3) Fallback por subscription_type quando nada mais bate
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
    subscription?.plan_id,
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
