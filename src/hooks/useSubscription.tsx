import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  stripe_customer_id: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSubscriptionStatus();
  }, [user]);

  const checkSubscriptionStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data: subscriber, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('email', user.email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar assinatura:', error);
        return;
      }

      if (subscriber) {
        setSubscriptionData({
          subscribed: subscriber.subscribed,
          subscription_tier: subscriber.subscription_tier,
          subscription_end: subscriber.subscription_end,
          stripe_customer_id: subscriber.stripe_customer_id
        });
      } else {
        setSubscriptionData({
          subscribed: false,
          subscription_tier: null,
          subscription_end: null,
          stripe_customer_id: null
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status da assinatura:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscriptionTier = subscriptionData?.subscription_tier || 'free';
  
  return {
    subscriptionData,
    subscriptionTier,
    loading,
    checkSubscriptionStatus
  };
};