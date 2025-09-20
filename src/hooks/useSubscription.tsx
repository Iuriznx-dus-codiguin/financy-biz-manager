import { useEffect, useState, useRef } from 'react';
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
  const previousSubscriptionStatus = useRef<boolean | null>(null);

  useEffect(() => {
    checkSubscriptionStatus();
  }, [user]);

  // Verificar periodicamente o status da assinatura para detectar pagamentos processados
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      checkSubscriptionStatus();
    }, 30000); // Verificar a cada 30 segundos

    // Verificar quando a aba ganha foco (usuário retorna da página de pagamento)
    const handleFocus = () => {
      checkSubscriptionStatus();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
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
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar assinatura:', error);
        return;
      }

      let currentSubscribed = false;
      
      if (subscriber) {
        currentSubscribed = subscriber.subscribed;
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

      // Verificar se houve mudança de não assinado para assinado
      const paymentNotificationKey = `payment_notification_shown_${user.email}`;
      const notificationShown = localStorage.getItem(paymentNotificationKey);
      
      if (previousSubscriptionStatus.current === false && 
          currentSubscribed === true && 
          !notificationShown) {
        
        // Mostrar alert de confirmação de pagamento
        alert("🎉 Pagamento confirmado com sucesso! Obrigado pela sua confiança, as funcionalidades de sua assinatura já estão disponíveis.");
        
        // Marcar como mostrado para não exibir novamente
        localStorage.setItem(paymentNotificationKey, 'true');
      }
      
      // Atualizar o status anterior
      previousSubscriptionStatus.current = currentSubscribed;
      
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