import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Subscription {
  id: string;
  email: string;
  subscribed: boolean;
  subscription_tier?: string;
  subscription_end?: string;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchSubscription();
  }, [user]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      
      // Primeiro, tentar buscar na nova tabela user_subscriptions
      const { data: userSubData } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (userSubData) {
        setSubscription({
          id: userSubData.id,
          email: userSubData.email,
          subscribed: userSubData.status === 'active' && 
                     (!userSubData.expires_at || new Date(userSubData.expires_at) > new Date()),
          subscription_tier: userSubData.subscription_type,
          subscription_end: userSubData.expires_at
        });
        return;
      }
      
      // Fallback: tentar buscar na tabela customer_subscriptions (dados do Cakto)
      const { data: caktoData } = await supabase
        .from('customer_subscriptions')
        .select('*')
        .or(`user_id.eq.${user!.id},email.eq.${user!.email}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

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

      // Fallback para a tabela subscribers (dados do Stripe)
      const { data: stripeData } = await supabase
        .from('subscribers')
        .select('*')
        .or(`user_id.eq.${user!.id},email.eq.${user!.email}`)
        .single();

      if (stripeData) {
        setSubscription({
          id: stripeData.id,
          email: stripeData.email,
          subscribed: stripeData.subscribed,
          subscription_tier: stripeData.subscription_tier,
          subscription_end: stripeData.subscription_end
        });
        return;
      }

      // Se não encontrar nada, define como usuário gratuito
      setSubscription({
        id: 'free',
        email: user!.email || '',
        subscribed: false,
        subscription_tier: 'free'
      });

    } catch (error) {
      console.error('Erro ao buscar assinatura:', error);
      setSubscription({
        id: 'free',
        email: user!.email || '',
        subscribed: false,
        subscription_tier: 'free'
      });
    } finally {
      setLoading(false);
    }
  };

  const isPremium = () => {
    return subscription?.subscribed && 
           subscription?.subscription_tier && 
           subscription.subscription_tier !== 'free' &&
           subscription.subscription_tier !== 'free_trial';
  };

  const isSubscriptionExpired = () => {
    if (!subscription?.subscription_end) return false;
    return new Date(subscription.subscription_end) < new Date();
  };

  return {
    subscription,
    subscriptionData: subscription,
    subscriptionTier: subscription?.subscription_tier || 'free',
    loading,
    isPremium,
    isSubscriptionExpired,
    refetch: fetchSubscription
  };
};