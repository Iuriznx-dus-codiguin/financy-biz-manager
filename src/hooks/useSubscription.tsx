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
      
      // 1. Verificar se é desenvolvedor
      const { data: subscriberData } = await supabase
        .from('subscribers')
        .select('subscription_tier, subscribed, subscription_end')
        .eq('user_id', user.id)
        .maybeSingle();

      if (isDeveloperTier(subscriberData)) {
        logger.success('Acesso de desenvolvedor detectado');
        setSubscription({
          id: 'developer',
          email: user.email || '',
          subscribed: true,
          subscription_tier: 'developer',
          subscription_end: undefined
        });
        return;
      }
      
      // 2. Tabela principal: user_subscriptions
      const { data: userSubData } = await supabase
        .from('user_subscriptions')
        .select('id, email, status, subscription_type, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userSubData) {
        const isActive = userSubData.status === 'active' && 
          (!userSubData.expires_at || new Date(userSubData.expires_at) > new Date());
        
        setSubscription({
          id: userSubData.id,
          email: userSubData.email,
          subscribed: isActive,
          subscription_tier: userSubData.subscription_type,
          subscription_end: userSubData.expires_at
        });
        return;
      }
      
      // 3. Fallback: customer_subscriptions (Cakto)
      const { data: caktoData } = await supabase
        .from('customer_subscriptions')
        .select('id, email, status, plan_type, expires_at')
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (caktoData) {
        setSubscription({
          id: caktoData.id,
          email: caktoData.email,
          subscribed: caktoData.status === 'active',
          subscription_tier: caktoData.plan_type,
          subscription_end: caktoData.expires_at
        });
        return;
      }

      // 4. Sem assinatura
      setSubscription({
        id: 'unsubscribed',
        email: user.email || '',
        subscribed: false,
        subscription_tier: 'unsubscribed'
      });

    } catch (error) {
      logger.error('Erro ao buscar assinatura:', error);
      setSubscription({
        id: 'unsubscribed',
        email: user?.email || '',
        subscribed: false,
        subscription_tier: 'unsubscribed'
      });
    } finally {
      setLoading(false);
    }
  };

  const isPremium = () => {
    if (isDeveloperTier(subscription)) return true;
    return subscription?.subscribed &&
           subscription?.subscription_tier &&
           !['unsubscribed', 'pending'].includes(subscription.subscription_tier);
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
