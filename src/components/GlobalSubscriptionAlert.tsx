import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

interface GlobalSubscriptionAlertProps {
  setActiveSection?: (section: string) => void;
}

export const GlobalSubscriptionAlert: React.FC<GlobalSubscriptionAlertProps> = ({ setActiveSection }) => {
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
        // Usuário sem assinatura = teste gratuito de 7 dias
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

  // Lógica de exibição:
  // - Vermelho: plano gratuito (não assinado)
  // - Laranja: próximo ao vencimento (3 dias ou menos)
  const isFreePlan = !subscriptionData.subscribed;
  const isNearExpiry = subscriptionData.subscribed && daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
  const isExpired = daysUntilExpiry < 0;

  if (!isFreePlan && !isNearExpiry && !isExpired) {
    return null;
  }

  const getAlertConfig = () => {
    if (isFreePlan || isExpired) {
      return {
        variant: 'red',
        bgClass: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        iconClass: 'text-red-600 dark:text-red-400',
        textClass: 'text-red-800 dark:text-red-200',
        buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
        dismissClass: 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200',
        icon: isExpired ? CreditCard : AlertTriangle,
        title: isExpired ? 'Assinatura Expirada' : 'Teste Gratuito',
        message: isExpired 
          ? 'Sua assinatura expirou. Renove para continuar usando todos os recursos.'
          : daysUntilExpiry > 0 
            ? `Seu teste expira em ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'dia' : 'dias'}.`
            : 'Seu teste gratuito expirou hoje.',
        buttonText: isExpired ? 'Renovar Agora' : 'Assinar Agora'
      };
    } else {
      return {
        variant: 'orange',
        bgClass: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
        iconClass: 'text-orange-600 dark:text-orange-400',
        textClass: 'text-orange-800 dark:text-orange-200',
        buttonClass: 'bg-orange-600 hover:bg-orange-700 text-white',
        dismissClass: 'text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200',
        icon: Calendar,
        title: 'Renovação da Assinatura',
        message: `Sua assinatura ${subscriptionData.subscription_tier} expira em ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'dia' : 'dias'}.`,
        buttonText: 'Renovar'
      };
    }
  };

  const config = getAlertConfig();

  return (
    <div className={`w-full ${config.bgClass} border-l-4 border-l-current px-4 py-3 mb-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <config.icon className={`h-5 w-5 ${config.iconClass}`} />
          <div className={`${config.textClass}`}>
            <div className="flex items-center gap-4">
              <div>
                <span className="font-semibold">{config.title}:</span>
                <span className="ml-2">{config.message}</span>
                {subscriptionData.subscription_end && (
                  <span className="ml-2 text-sm opacity-80">
                    (Vence: {new Date(subscriptionData.subscription_end).toLocaleDateString('pt-BR')})
                  </span>
                )}
              </div>
              <Button 
                size="sm" 
                onClick={handleGoToSubscription}
                className={`${config.buttonClass} text-xs px-3 py-1 h-7`}
              >
                {config.buttonText}
              </Button>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className={`h-6 w-6 p-0 ${config.dismissClass}`}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};