import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import confetti from 'canvas-confetti';

export const usePaymentSuccess = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const hasCheckedRef = useRef(false);
  const lastNotificationIdRef = useRef<string | null>(null);

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) { clearInterval(interval); return; }

      const particleCount = 50 * (timeLeft / duration);
      const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

      confetti({ particleCount, startVelocity: 30, spread: 360, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }, colors });
      confetti({ particleCount, startVelocity: 30, spread: 360, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }, colors });
    }, 250);
  };

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

      triggerConfetti();

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
