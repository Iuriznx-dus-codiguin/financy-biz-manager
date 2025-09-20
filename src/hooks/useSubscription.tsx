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

  // Listener de realtime para mudanças na tabela subscribers
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'subscribers',
          filter: `email=eq.${user.email}`
        },
        (payload) => {
          console.log('Mudança na assinatura detectada:', payload);
          
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          // Se mudou de não assinado para assinado
          if (!oldData.subscribed && newData.subscribed) {
            // Verificar se já mostrou a notificação
            const paymentNotificationKey = `payment_notification_shown_${user.email}`;
            const notificationShown = localStorage.getItem(paymentNotificationKey);
            
            if (!notificationShown) {
              alert("🎉 Pagamento confirmado com sucesso! Obrigado pela sua confiança, as funcionalidades de sua assinatura já estão disponíveis.");
              localStorage.setItem(paymentNotificationKey, 'true');
            }
          }
          
          // Atualizar os dados da assinatura
          setSubscriptionData({
            subscribed: newData.subscribed,
            subscription_tier: newData.subscription_tier,
            subscription_end: newData.subscription_end,
            stripe_customer_id: newData.stripe_customer_id
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const checkSubscriptionStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data: subscriber, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

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