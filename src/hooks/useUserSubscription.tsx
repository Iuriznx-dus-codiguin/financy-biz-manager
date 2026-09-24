import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';
import { logger } from '@/utils/logger';
import { isDeveloperTier } from '@/utils/subscriptionHelpers';

export interface UserSubscription {
  id: string;
  user_id: string;
  email: string;
  subscription_type: string;
  plan_name: string;
  plan_id?: string;
  status: string;
  created_at: string;
  started_at: string;
  expires_at?: string;
  renewed_at?: string;
  cancelled_at?: string;
  amount: number;
  currency: string;
  billing_period: string;
  payment_method?: string;
  cakto_subscription_id?: string;
  cakto_customer_id?: string;
  features: {
    max_dashboards?: number;
    ai_requests_per_month?: number;
    team_members?: number;
    whatsapp_integration?: boolean;
    advanced_analytics?: boolean;
    export_data?: boolean;
  };
  // `Json` (tipo gerado pelo Supabase) em vez de `Record<string, any>`:
  // `updateSubscription` repassa este objeto ao client, que exige `Json`.
  metadata: Json;
  updated_at: string;
}

/** Chave compartilhada do cache — o mesmo usuário nunca é buscado duas vezes. */
export const userSubscriptionQueryKey = (userId?: string) => ['user-subscription', userId] as const;

const fetchUserSubscription = async (userId: string): Promise<UserSubscription | null> => {
  // PRIMEIRO: Verificar se é desenvolvedor na tabela subscribers
  const { data: subscriberData } = await supabase
    .from('subscribers')
    .select('subscription_tier, subscribed, subscription_end')
    .eq('user_id', userId)
    .maybeSingle();

  // Se é desenvolvedor, retornar acesso ilimitado
  if (isDeveloperTier(subscriberData)) {
    logger.success('Acesso de desenvolvedor detectado - acesso ilimitado concedido');

    const { data } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Antes, um developer sem linha em user_subscriptions ficava com
    // subscription = null e caía em `isBlocked() === true`, perdendo o acesso
    // que o tier deveria garantir. O registro sintético evita isso.
    return (data as UserSubscription | null) ?? ({
      user_id: userId,
      subscription_type: 'developer',
      plan_name: 'Developer',
      status: 'active',
      features: {},
      metadata: {},
    } as unknown as UserSubscription);
  }

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('Erro ao buscar assinatura:', error);
    throw error;
  }

  if (data) return data as UserSubscription;

  // Se não encontrou assinatura, criar automaticamente (fallback)
  logger.warn('Assinatura não encontrada para o usuário. Criando assinatura pendente automaticamente...');
  const { error: ensureError } = await supabase.rpc('ensure_user_has_subscription', {
    p_user_id: userId,
  });
  if (ensureError) {
    logger.error('Erro ao criar assinatura automática:', ensureError);
  }

  const { data: newData, error: refetchError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (refetchError) {
    logger.error('Erro ao buscar assinatura após criação:', refetchError);
    throw refetchError;
  }

  return newData as UserSubscription | null;
};

/**
 * Assinatura do usuário logado.
 *
 * Roda sobre React Query porque o hook é consumido por ~10 componentes
 * (layout, sidebar, banners, useFeatureAccess, useIsAdmin…). Com o useState +
 * useEffect anterior, cada instância disparava as próprias consultas a
 * `subscribers` e `user_subscriptions` a cada montagem — uma dezena de
 * requisições idênticas em um único carregamento do dashboard.
 */
export const useUserSubscription = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: subscription = null,
    isLoading,
    error: queryError,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: userSubscriptionQueryKey(user?.id),
    queryFn: () => fetchUserSubscription(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 5,
  });

  const loading = Boolean(user?.id) && isLoading;
  const error = queryError ? 'Erro ao carregar dados da assinatura' : null;

  const fetchSubscription = async () => {
    await queryClient.invalidateQueries({ queryKey: userSubscriptionQueryKey(user?.id) });
    await refetchQuery();
  };

  const hasFeature = (feature: string): boolean => {
    if (!subscription || subscription.status !== 'active') return false;
    
    const now = new Date();
    if (subscription.expires_at && new Date(subscription.expires_at) < now) {
      return false;
    }

    return subscription.features[feature] === true || 
           (typeof subscription.features[feature] === 'number' && subscription.features[feature] > 0);
  };

  const getFeatureLimit = (feature: string): number => {
    if (!subscription || subscription.status !== 'active') return 0;
    
    const now = new Date();
    if (subscription.expires_at && new Date(subscription.expires_at) < now) {
      return 0;
    }

    return subscription.features[feature] || 0;
  };

  const isSubscriptionExpired = (): boolean => {
    // IMPORTANTE: Desenvolvedores NUNCA expiram
    if (isDeveloperTier(subscription)) {
      return false;
    }

    // Se não tem assinatura, considerar como expirado (precisa pagar)
    if (!subscription) {
      logger.warn('Usuário sem assinatura - acesso bloqueado');
      return true;
    }
    
    // NOVO: Se status é pending_payment, considerar como expirado (precisa pagar)
    if (subscription.status === 'pending_payment') {
      logger.warn('Assinatura pendente de pagamento - acesso bloqueado');
      return true;
    }
    
    // Se status não é active, considerar como expirado
    if (subscription.status !== 'active') {
      logger.warn('Assinatura não está ativa - acesso bloqueado');
      return true;
    }
    
    // Se tem assinatura ativa, verificar data de expiração
    if (!subscription.expires_at) return false;
    
    const isExpired = new Date(subscription.expires_at) < new Date();
    
    if (isExpired) {
      logger.warn('Assinatura expirada');
    }
    
    return isExpired;
  };

  /**
   * Helper centralizado: indica se o acesso do usuário deve estar bloqueado
   * (sem assinatura ativa, expirada, pendente ou cancelada). Usado pelo
   * layout, sidebar e guards para evitar lógica duplicada.
   */
  const isBlocked = (): boolean => {
    if (!subscription) return true;
    if (isDeveloperTier(subscription)) return false;
    if (isSubscriptionExpired()) return true;
    if (!subscription.subscription_type) return true;
    if (subscription.status === 'pending_payment') return true;
    if (subscription.status === 'cancelled') return true;
    if (subscription.status !== 'active') return true;
    return false;
  };

  const isFreeTrial = (): boolean => {
    // Teste grátis foi removido da plataforma; mantido como no-op para compat.
    return false;
  };


  const isPendingPayment = (): boolean => {
    return subscription?.status === 'pending_payment' || subscription?.subscription_type === 'pending';
  };

  const isPremium = (): boolean => {
    // Desenvolvedores sempre têm acesso premium
    if (isDeveloperTier(subscription)) {
      return true;
    }
    return subscription?.subscription_type === 'premium' || subscription?.subscription_type === 'enterprise';
  };

  const isBusinessPlan = (): boolean => {
    if (!subscription) return false;
    
    // Desenvolvedores têm acesso total (incluindo criação de empresas)
    if (subscription.subscription_type === 'developer') {
      return true;
    }
    
    // Verificar pelo plan_name se é plano empresarial
    const planName = subscription.plan_name?.toLowerCase() || '';
    return planName.includes('empresarial') ||
           planName.includes('company') ||
           planName.includes('business') ||
           planName.includes('premium');
  };

  const isPersonalPlan = (): boolean => {
    if (!subscription) return true; // Default para pessoal
    
    // Se não é empresarial, é pessoal
    return !isBusinessPlan();
  };

  const getDaysUntilExpiration = (): number | null => {
    if (!subscription || !subscription.expires_at) return null;
    
    const now = new Date();
    const expirationDate = new Date(subscription.expires_at);
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const renewSubscription = async (newExpiresAt?: string, amount?: number) => {
    if (!user) return false;

    try {
      const { error } = await supabase.rpc('renew_subscription', {
        p_user_id: user.id,
        p_new_expires_at: newExpiresAt || null,
        p_amount: amount || null
      });

      if (error) {
        logger.error('Erro ao renovar assinatura:', error);
        return false;
      }

      await fetchSubscription(); // Recarregar dados
      return true;
    } catch (err) {
      logger.error('Erro inesperado ao renovar:', err);
      return false;
    }
  };

  const updateSubscription = async (updates: Partial<UserSubscription>) => {
    if (!user || !subscription) return false;

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        logger.error('Erro ao atualizar assinatura:', error);
        return false;
      }

      await fetchSubscription(); // Recarregar dados
      return true;
    } catch (err) {
      logger.error('Erro inesperado ao atualizar:', err);
      return false;
    }
  };

  return {
    subscription,
    loading,
    error,
    hasFeature,
    getFeatureLimit,
    isSubscriptionExpired,
    isBlocked,
    isFreeTrial,
    isPendingPayment,
    isPremium,
    isBusinessPlan,
    isPersonalPlan,
    getDaysUntilExpiration,
    renewSubscription,
    updateSubscription,
    refetch: fetchSubscription
  };
};