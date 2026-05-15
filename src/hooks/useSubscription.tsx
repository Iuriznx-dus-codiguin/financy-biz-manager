import { useState, useEffect } from 'react';
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

/**
 * Hook consolidado de assinatura.
 * Prioridade: developer > user_subscriptions > customer_subscriptions > não_assinante
 */
export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    fetchSubscription();
  }, [user]);

  const fetchSubscription = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Buscar todas as fontes de assinatura em paralelo
      const [subscriberRes, userSubRes, caktoSubRes] = await Promise.all([
        supabase
          .from('subscribers')
          .select('subscription_tier, subscribed, subscription_end')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_subscriptions')
          .select('id, email, status, subscription_type, expires_at')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('customer_subscriptions')
          .select('id, email, status, plan_type, expires_at')
          .or(`user_id.eq.${user.id},email.eq.${user.email}`)
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
        setSubscription({
          id: 'developer',
          email: user.email || '',
          subscribed: true,
          subscription_tier: 'developer',
          subscription_end: undefined,
        });
        return;
      }

      if (userSubData) {
        const isActive =
          userSubData.status === 'active' &&
          (!userSubData.expires_at || new Date(userSubData.expires_at) > new Date());
        setSubscription({
          id: userSubData.id,
          email: userSubData.email,
          subscribed: isActive,
          subscription_tier: userSubData.subscription_type,
          subscription_end: userSubData.expires_at,
        });
        return;
      }

      if (caktoData) {
        setSubscription({
          id: caktoData.id,
          email: caktoData.email,
          subscribed: caktoData.status === 'active',
          subscription_tier: caktoData.plan_type,
          subscription_end: caktoData.expires_at,
        });
        return;
      }

      setSubscription({
        id: 'unsubscribed',
        email: user.email || '',
        subscribed: false,
        subscription_tier: 'unsubscribed',
      });
    } catch (error) {
      logger.error('Erro ao buscar assinatura:', error);
      setSubscription({
        id: 'unsubscribed',
        email: user?.email || '',
        subscribed: false,
        subscription_tier: 'unsubscribed',
      });
    } finally {
      setLoading(false);
    }
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
