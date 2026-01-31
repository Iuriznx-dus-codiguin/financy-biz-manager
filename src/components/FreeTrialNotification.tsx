import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, CreditCard, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface FreeTrialNotificationProps {
  setActiveSection?: (section: string) => void;
}

export const FreeTrialNotification: React.FC<FreeTrialNotificationProps> = ({ setActiveSection }) => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isPendingPayment, setIsPendingPayment] = useState(false);

  useEffect(() => {
    if (!user) return;

    checkSubscriptionStatus();
  }, [user]);

  const checkSubscriptionStatus = async () => {
    try {
      const { data: userSub } = await supabase
        .from('user_subscriptions')
        .select('status, subscription_type')
        .eq('user_id', user?.id)
        .maybeSingle();

      // Mostrar notificação apenas para usuários com pending_payment
      if (userSub?.status === 'pending_payment') {
        setIsPendingPayment(true);
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Erro ao verificar status da assinatura:', error);
    }
  };

  const handleGoToSubscription = () => {
    if (setActiveSection) {
      setActiveSection('assinatura');
    }
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !user || !isPendingPayment) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      <Card className="bg-gradient-to-br from-primary/10 via-purple-50 to-primary/5 dark:from-primary/20 dark:via-purple-900/20 dark:to-primary/10 border-primary/30 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <div className="p-2 bg-primary/20 rounded-full">
                <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-primary dark:text-primary">
                  Bem-vindo ao Financy!
                </p>
                <p className="text-xs text-muted-foreground">
                  Escolha um plano para desbloquear todas as funcionalidades
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 flex space-x-2">
            <Button
              onClick={handleGoToSubscription}
              size="sm"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Ver Planos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
