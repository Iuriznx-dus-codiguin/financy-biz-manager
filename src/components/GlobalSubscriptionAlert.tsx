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
      // Verificar na tabela user_subscriptions (nova lógica)
      const { data: userSub, error: subError } = await supabase
        .from('user_subscriptions')
        .select('status, subscription_type, expires_at, plan_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') {
        console.error('Erro ao verificar assinatura:', subError);
        return;
      }

      if (userSub) {
        // Verificar status pending_payment
        if (userSub.status === 'pending_payment') {
          setSubscriptionData({
            subscribed: false,
            subscription_tier: 'pending',
            subscription_end: null
          });
          setDaysUntilExpiry(0); // Força exibição do alerta
          return;
        }

        // Verificar se assinatura ativa expirou
        if (userSub.status === 'active' && userSub.expires_at) {
          const endDate = new Date(userSub.expires_at);
          const today = new Date();
          const diffTime = endDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          setDaysUntilExpiry(diffDays);
          setSubscriptionData({
            subscribed: diffDays >= 0,
            subscription_tier: userSub.subscription_type,
            subscription_end: userSub.expires_at
          });
          return;
        }

        // Assinatura ativa sem data de expiração (ex: desenvolvedor)
        if (userSub.status === 'active' && !userSub.expires_at) {
          setSubscriptionData({
            subscribed: true,
            subscription_tier: userSub.subscription_type,
            subscription_end: null
          });
          setDaysUntilExpiry(null);
          return;
        }
      }

      // Sem assinatura = precisa pagar
      setSubscriptionData({
        subscribed: false,
        subscription_tier: null,
        subscription_end: null
      });
      setDaysUntilExpiry(0);
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
  // - Vermelho: pending_payment ou não assinado
  // - Laranja: próximo ao vencimento (3 dias ou menos)
  const isPendingPayment = subscriptionData.subscription_tier === 'pending' || !subscriptionData.subscribed;
  const isNearExpiry = subscriptionData.subscribed && daysUntilExpiry !== null && daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

  if (!isPendingPayment && !isNearExpiry && !isExpired) {
    return null;
  }

  const getAlertConfig = () => {
    if (isPendingPayment || isExpired) {
      return {
        variant: 'red',
        bgClass: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        iconClass: 'text-red-600 dark:text-red-400',
        textClass: 'text-red-800 dark:text-red-200',
        buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
        dismissClass: 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200',
        icon: isPendingPayment ? CreditCard : AlertTriangle,
        title: isPendingPayment ? 'Assine um Plano' : 'Assinatura Expirada',
        message: isPendingPayment 
          ? 'Escolha um plano para desbloquear todas as funcionalidades.'
          : 'Sua assinatura expirou. Renove para continuar usando todos os recursos.',
        buttonText: isPendingPayment ? 'Ver Planos' : 'Renovar Agora'
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
    <div className={`fixed top-4 left-4 right-4 z-50 ${config.bgClass} border-l-4 border-l-current px-4 py-3 rounded-lg shadow-lg`}>
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