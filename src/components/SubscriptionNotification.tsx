import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

interface SubscriptionNotificationProps {
  setActiveSection?: (section: string) => void;
}

export const SubscriptionNotification: React.FC<SubscriptionNotificationProps> = ({ setActiveSection }) => {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState<number | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    checkSubscriptionStatus();
  }, [user]);

  const checkSubscriptionStatus = async () => {
    if (!user) return;

    try {
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
          subscription_end: subscriber.subscription_end
        });

        // Calcular dias até expiração
        if (subscriber.subscription_end) {
          const endDate = new Date(subscriber.subscription_end);
          const today = new Date();
          const diffTime = endDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysUntilExpiry(diffDays);
        }
      } else {
        // Usuário sem assinatura = teste gratuito
        // Simular 7 dias de teste (você pode ajustar conforme sua lógica)
        const signUpDate = new Date(user.created_at || Date.now());
        const trialEndDate = new Date(signUpDate.getTime() + (7 * 24 * 60 * 60 * 1000));
        const today = new Date();
        const diffTime = trialEndDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setDaysUntilExpiry(diffDays);
        setSubscriptionData({
          subscribed: false,
          subscription_tier: null,
          subscription_end: trialEndDate.toISOString()
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status da assinatura:', error);
    }
  };

  const handleGoToSubscription = () => {
    setActiveSection?.('assinatura');
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  // Não mostrar se usuário não está logado ou notificação foi dismissada
  if (!user || !isVisible || !subscriptionData || daysUntilExpiry === null) {
    return null;
  }

  // Mostrar notificação se:
  // 1. Usuário está em teste gratuito
  // 2. Assinatura expira em 3 dias ou menos
  const showTrialNotification = !subscriptionData.subscribed && daysUntilExpiry >= 0;
  const showRenewalNotification = subscriptionData.subscribed && daysUntilExpiry <= 3 && daysUntilExpiry >= 0;

  if (!showTrialNotification && !showRenewalNotification) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      {showTrialNotification && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20 shadow-lg">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-2">
                <p className="font-semibold mb-1">Teste Gratuito</p>
                <p className="text-sm">
                  {daysUntilExpiry > 0 
                    ? `Seu teste expira em ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'dia' : 'dias'}.`
                    : 'Seu teste gratuito expirou hoje.'
                  }
                </p>
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    onClick={handleGoToSubscription}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Assinar Agora
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {showRenewalNotification && (
        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 shadow-lg">
          <Calendar className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-2">
                <p className="font-semibold mb-1">Renovação da Assinatura</p>
                <p className="text-sm">
                  Sua assinatura {subscriptionData.subscription_tier} expira em {daysUntilExpiry} {daysUntilExpiry === 1 ? 'dia' : 'dias'}.
                </p>
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    onClick={handleGoToSubscription}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Renovar
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};