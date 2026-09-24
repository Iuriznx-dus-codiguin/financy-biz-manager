import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logger } from '@/utils/logger';
import { isDeveloperTier } from '@/utils/subscriptionHelpers';

interface Subscription {
  id: string;
  email: string;
  subscribed: boolean;
  subscription_tier?: string;
  subscription_end?: string;
}

/** Chave compartilhada do cache — mesma resposta para todos os consumidores. */
export const subscriptionQueryKey = (userId?: string) => ['subscription-consolidated', userId] as const;

/**
 * Consulta consolidada de assinatura.
 * Prioridade: developer > user_subscriptions > customer_subscriptions > não_assinante
 */
const fetchConsolidatedSubscription = async (
  userId: string,
  userEmail: string,
): Promise<Subscription> => {
  try {
    // Buscar todas as fontes de assinatura em paralelo
    const [subscriberRes, userSubRes, caktoSubRes] = await Promise.all([
      supabase
        .from('subscribers')
        .select('subscription_tier, subscribed, subscription_end')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('user_subscriptions')
        .select('id, email, status, subscription_type, expires_at')
        .eq('user_id', userId)
        .maybeSingle(),
      // Filtra só por user_id. O `.or()` anterior interpolava `user.email`
      // direto na string de filtro do PostgREST — um email contendo vírgula
      // ou parêntese (caracteres válidos no padrão) reescrevia a condição.
      supabase
        .from('customer_subscriptions')
        .select('id, email, status, plan_type, expires_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const subscriberData = subscriberRes.data;
    const userSubData = userSubRes.data;
    const caktoData = caktoSubRes.data;

    // Prioridade: developer > user_subscriptions > customer_subscriptions > sem assinatura
    if (isDeveloperTier(subscriberData)) {
      logger.success('Acesso de desenvolvedor detectado');
      return {
        id: 'developer',
        email: userEmail,
        subscribed: true,
        subscription_tier: 'developer',
        subscription_end: undefined,
      };
    }

    if (userSubData) {
      const isActive =
        userSubData.status === 'active' &&
        (!userSubData.expires_at || new Date(userSubData.expires_at) > new Date());
      return {
        id: userSubData.id,
        email: userSubData.email,
        subscribed: isActive,
        subscription_tier: userSubData.subscription_type,
        subscription_end: userSubData.expires_at,
      };
    }

    if (caktoData) {
      return {
        id: caktoData.id,
        email: caktoData.email,
        subscribed: caktoData.status === 'active',
        subscription_tier: caktoData.plan_type,
        subscription_end: caktoData.expires_at,
      };
    }

    return {
      id: 'unsubscribed',
      email: userEmail,
      subscribed: false,
      subscription_tier: 'unsubscribed',
    };
  } catch (error) {
    // Mantém o comportamento original: falha de rede degrada para
    // "não assinante" em vez de propagar o erro para a UI.
    logger.error('Erro ao buscar assinatura:', error);
    return {
      id: 'unsubscribed',
      email: userEmail,
      subscribed: false,
      subscription_tier: 'unsubscribed',
    };
  }
};

/**
 * Hook consolidado de assinatura.
 *
 * Sobre React Query porque são TRÊS consultas por montagem (`subscribers`,
 * `user_subscriptions`, `customer_subscriptions`) e o hook é consumido por
 * `FloatingDashboardInfo`, `MobileSidebar` e `Configuracoes` ao mesmo tempo —
 * eram até nove requisições idênticas num único carregamento do dashboard.
 */
export const useSubscription = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: subscription = null,
    isLoading,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: subscriptionQueryKey(user?.id),
    queryFn: () => fetchConsolidatedSubscription(user!.id, user!.email || ''),
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 5,
  });

  const loading = Boolean(user?.id) && isLoading;

  const fetchSubscription = async () => {
    await queryClient.invalidateQueries({ queryKey: subscriptionQueryKey(user?.id) });
    await refetchQuery();
  };

  /**
   * Retorna true se o usuário possui qualquer plano pago ativo (incluindo developer).
   * Não confundir com o tier "Premium" — para verificar features específicas, use useFeatureAccess.
   */
  const isPremium = () => {
    if (isDeveloperTier(subscription)) return true;
    if (!subscription?.subscribed) return false;
    const tier = subscription.subscription_tier;
    if (!tier) return false;
    // Qualquer tier exceto não-pagantes
    return !['unsubscribed', 'pending', 'free_trial', 'free'].includes(tier);
  };

  const isSubscriptionExpired = () => {
    if (!subscription?.subscription_end) return false;
    return new Date(subscription.subscription_end) < new Date();
  };

  return {
    subscription,
    subscriptionData: subscription,
    subscriptionTier: subscription?.subscription_tier || 'unsubscribed',
    loading,
    isPremium,
    isSubscriptionExpired,
    refetch: fetchSubscription
  };
};
