import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import confetti from 'canvas-confetti';

export const usePaymentSuccess = () => {
  const { user } = useAuth();
  const hasCheckedRef = useRef(false);
  const lastNotificationIdRef = useRef<string | null>(null);

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.1, 0.3),
          y: Math.random() - 0.2,
        },
        colors: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'],
      });
      
      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.7, 0.9),
          y: Math.random() - 0.2,
        },
        colors: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'],
      });
    }, 250);
  };

  const showPaymentSuccessAlert = (planName: string, amount: number) => {
    alert(`🎉 Pagamento confirmado com sucesso! Obrigado pela sua confiança, sua compra já está disponível.`);
  };

  const checkForPaymentNotifications = async () => {
    if (!user || hasCheckedRef.current) return;

    try {
      // Buscar notificações não processadas
      const { data: notifications, error } = await supabase
        .from('payment_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('processed', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Erro ao buscar notificações de pagamento:', error);
        return;
      }

      if (notifications && notifications.length > 0) {
        const notification = notifications[0];
        
        // Evitar processar a mesma notificação múltiplas vezes
        if (lastNotificationIdRef.current === notification.id) {
          return;
        }

        lastNotificationIdRef.current = notification.id;
        hasCheckedRef.current = true;

        // Disparar confetti
        triggerConfetti();

        // Aguardar um pouco para o confetti começar
        setTimeout(() => {
          // Mostrar alert nativo
          showPaymentSuccessAlert(notification.plan_name, notification.amount);
        }, 500);

        // Marcar notificação como processada
        await supabase
          .from('payment_notifications')
          .update({ processed: true })
          .eq('id', notification.id);
      }
    } catch (error) {
      console.error('Erro no processamento de notificação de pagamento:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Verificar imediatamente ao montar
    checkForPaymentNotifications();

    // Configurar um intervalo para verificar periodicamente (a cada 10 segundos)
    const interval = setInterval(checkForPaymentNotifications, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  return {
    triggerConfetti,
  };
};
