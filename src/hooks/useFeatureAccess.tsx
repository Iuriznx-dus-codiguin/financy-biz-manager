import { useSubscription } from '@/hooks/useSubscription';

export const useFeatureAccess = () => {
  const { subscriptionTier } = useSubscription();

  const isFeatureAvailable = (feature: string) => {
    // Plano Plus Pessoal
    const plusPlanFeatures = [
      'dashboard_basic',
      'receitas_unlimited',
      'despesas_unlimited',
      'impostos_basic',
      'inteligencia_basica',
      'whatsapp_ia',
      'export_data'
    ];

    // Plano Pro Pessoal (inclui Plus + avançado)
    const proPlanFeatures = [
      ...plusPlanFeatures,
      'dashboard_complete',
      'dashboard_avancado',
      'inteligencia_avancada',
      'relatorios_basic',
      'fechamento_caixa',
      'multi_dashboard'
    ];

    // Plano Premium/Enterprise (empresarial)
    const premiumPlanFeatures = [
      ...proPlanFeatures,
      'gestao_equipe',
      'fechamento_automatico',
      'whatsapp_support',
      'premiacoes_anuais',
      'relatorios_corporativos'
    ];

    const enterprisePlanFeatures = [
      ...premiumPlanFeatures,
      'ia_pixel',
      'economia_impostos',
      'gestao_multi_empresa',
      'suporte_dedicado'
    ];

    // Desenvolvedor tem acesso a tudo
    if (subscriptionTier === 'developer') {
      return true;
    }

    switch (subscriptionTier) {
      case 'plus':
        return plusPlanFeatures.includes(feature);
      case 'premium':
        return premiumPlanFeatures.includes(feature);
      case 'enterprise':
        return enterprisePlanFeatures.includes(feature);
      case 'free':
      default:
        // Sem plano ativo = sem acesso
        return false;
    }
  };

  const getFeatureLimitMessage = (feature: string) => {
    const messages: Record<string, string> = {
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

    return messages[feature] || 'Este recurso requer uma assinatura ativa.';
  };

  // Limites específicos por plano
  const getLimits = () => {
    // Desenvolvedor tem acesso ilimitado
    if (subscriptionTier === 'developer') {
      return {
        maxReceitas: -1,
        maxDespesas: -1,
        maxImpostos: -1,
        maxMetas: -1,
        maxProfiles: 10
      };
    }

    switch (subscriptionTier) {
      case 'plus':
        return {
          maxReceitas: -1,
          maxDespesas: -1,
          maxImpostos: -1,
          maxMetas: -1,
          maxProfiles: 1
        };
      case 'premium':
        return {
          maxReceitas: -1,
          maxDespesas: -1,
          maxImpostos: -1,
          maxMetas: -1,
          maxProfiles: 3
        };
      case 'enterprise':
        return {
          maxReceitas: -1,
          maxDespesas: -1,
          maxImpostos: -1,
          maxMetas: -1,
          maxProfiles: 10
        };
      case 'free':
      default:
        return {
          maxReceitas: 0,
          maxDespesas: 0,
          maxImpostos: 0,
          maxMetas: 0,
          maxProfiles: 0
        };
    }
  };

  return {
    isFeatureAvailable,
    getFeatureLimitMessage,
    getLimits,
    subscriptionTier
  };
};
