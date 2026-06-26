import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { celebrate } from '@/utils/celebration';

export const usePaymentSuccess = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const hasCheckedRef = useRef(false);
  const lastNotificationIdRef = useRef<string | null>(null);

  const triggerConfetti = () => celebrate();

  const checkForPaymentNotifications = async () => {
    if (!user || hasCheckedRef.current) return;

    try {
      const { data: notifications, error } = await supabase
        .from('payment_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('processed', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !notifications?.length) return;

      const notification = notifications[0];
      if (lastNotificationIdRef.current === notification.id) return;

      lastNotificationIdRef.current = notification.id;
      hasCheckedRef.current = true;

      celebrate({ dedupeKey: `payment:${notification.id}` });

      setTimeout(() => {
        toast({
          title: '🎉 Pagamento confirmado!',
          description: `Seu plano ${notification.plan_name} está ativo. Obrigado pela confiança!`,
          duration: 8000,
        });
      }, 500);

      await supabase
        .from('payment_notifications')
        .update({ processed: true })
        .eq('id', notification.id);
    } catch (error) {
      console.error('Erro no processamento de notificação de pagamento:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    checkForPaymentNotifications();
    const interval = setInterval(checkForPaymentNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  return { triggerConfetti };
};
