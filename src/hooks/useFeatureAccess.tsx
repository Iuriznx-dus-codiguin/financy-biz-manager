import { useSubscription } from '@/hooks/useSubscription';

export const useFeatureAccess = () => {
  const { subscriptionTier } = useSubscription();

  const isFeatureAvailable = (feature: string) => {
    const freePlanFeatures = [
      'dashboard_basic',
      'receitas_basic', // Limitado
      'despesas_basic', // Limitado  
      'impostos_basic',
      'inteligencia_basica' // Básica funciona no plano gratuito
    ];

    const plusPlanFeatures = [
      ...freePlanFeatures,
      'dashboard_complete',
      'receitas_unlimited',
      'despesas_unlimited',
      'relatorios_basic',
      'fechamento_caixa',
      'export_data'
    ];

    const premiumPlanFeatures = [
      ...plusPlanFeatures,
      'multi_dashboard',
      'inteligencia_avancada',
      'dashboard_avancado', // Dashboard avançado apenas em planos premium
      'gestao_equipe',
      'fechamento_automatico',
      'whatsapp_support',
      'premiacoes_anuais'
    ];

    const enterprisePlanFeatures = [
      ...premiumPlanFeatures,
      'ia_pixel',
      'economia_impostos',
      'gestao_multi_empresa',
      'relatorios_corporativos',
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
        return freePlanFeatures.includes(feature);
    }
  };

  const getFeatureLimitMessage = (feature: string) => {
    const messages = {
      'receitas_unlimited': 'Limite de 50 receitas no plano gratuito. Atualize para Plus para acesso ilimitado.',
      'despesas_unlimited': 'Limite de 50 despesas no plano gratuito. Atualize para Plus para acesso ilimitado.',
      'relatorios_basic': 'Relatórios avançados disponíveis no plano Plus ou superior.',
      'inteligencia_basica': 'Inteligência financeira disponível no plano Plus ou superior.',
      'inteligencia_avancada': 'Inteligência financeira avançada disponível no plano Premium ou superior.',
      'multi_dashboard': 'Múltiplos perfis/empresas disponíveis apenas no plano Premium.',
      'fechamento_automatico': 'Fechamento automático disponível no plano Premium ou superior.',
      'export_data': 'Exportação de dados disponível no plano Plus ou superior.'
    };

    return messages[feature] || 'Este recurso requer uma assinatura ativa.';
  };

  // Limites específicos para plano gratuito
  const getLimits = () => {
    // Desenvolvedor tem acesso ilimitado a tudo, exceto perfis/empresas (limite de 10)
    if (subscriptionTier === 'developer') {
      return {
        maxReceitas: -1,
        maxDespesas: -1,
        maxImpostos: -1,
        maxMetas: -1,
        maxProfiles: 10 // Renomeado de maxDashboards
      };
    }

    switch (subscriptionTier) {
      case 'free':
        return {
          maxReceitas: 50,
          maxDespesas: 50,
          maxImpostos: 20,
          maxMetas: 5,
          maxProfiles: 1 // Renomeado de maxDashboards
        };
      case 'plus':
        return {
          maxReceitas: -1, // Ilimitado
          maxDespesas: -1,
          maxImpostos: -1,
          maxMetas: -1,
          maxProfiles: 1 // Renomeado de maxDashboards
        };
      case 'premium':
      case 'enterprise':
        return {
          maxReceitas: -1,
          maxDespesas: -1,
          maxImpostos: -1,
          maxMetas: -1,
          maxProfiles: 5 // Renomeado de maxDashboards
        };
      default:
        return {
          maxReceitas: 50,
          maxDespesas: 50,
          maxImpostos: 20,
          maxMetas: 5,
          maxProfiles: 1 // Renomeado de maxDashboards
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