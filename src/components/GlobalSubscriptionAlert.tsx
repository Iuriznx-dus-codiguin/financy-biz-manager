import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

export const GlobalSubscriptionAlert: React.FC = () => {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState<number | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      try {
        const { data: userSub } = await supabase
          .from('user_subscriptions')
          .select('status, subscription_type, expires_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!userSub) {
          setSubscriptionData({ subscribed: false, subscription_tier: null, subscription_end: null });
          setDaysUntilExpiry(0);
          return;
        }

        if (userSub.status === 'pending_payment') {
          setSubscriptionData({ subscribed: false, subscription_tier: 'pending', subscription_end: null });
          setDaysUntilExpiry(0);
          return;
        }

        if (userSub.status === 'active' && userSub.expires_at) {
          const diffDays = Math.ceil((new Date(userSub.expires_at).getTime() - Date.now()) / 86400000);
          setDaysUntilExpiry(diffDays);
          setSubscriptionData({
            subscribed: diffDays >= 0,
            subscription_tier: userSub.subscription_type,
            subscription_end: userSub.expires_at
          });
          return;
        }

        if (userSub.status === 'active') {
          setSubscriptionData({ subscribed: true, subscription_tier: userSub.subscription_type, subscription_end: null });
          setDaysUntilExpiry(null);
        }
      } catch (error) {
        console.error('Erro ao verificar status da assinatura:', error);
      }
    };

    check();
  }, [user]);

  if (!user || !isVisible || !subscriptionData || daysUntilExpiry === null) return null;

  const isPendingPayment = subscriptionData.subscription_tier === 'pending' || !subscriptionData.subscribed;
  const isNearExpiry = subscriptionData.subscribed && daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
  const isExpired = daysUntilExpiry < 0;

  if (!isPendingPayment && !isNearExpiry && !isExpired) return null;

  const isUrgent = isPendingPayment || isExpired;

  const config = isUrgent ? {
    bgClass: 'bg-destructive/10 border-destructive/30',
    iconClass: 'text-destructive',
    textClass: 'text-destructive',
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
    dismissClass: 'text-destructive hover:text-destructive',
    icon: isPendingPayment ? CreditCard : AlertTriangle,
    title: isPendingPayment ? 'Assine um Plano' : 'Assinatura Expirada',
    message: isPendingPayment ? 'Escolha um plano para desbloquear todas as funcionalidades.' : 'Sua assinatura expirou. Renove para continuar.',
    buttonText: isPendingPayment ? 'Ver Planos' : 'Renovar Agora'
  } : {
    bgClass: 'bg-warning/10 border-warning/30',
    iconClass: 'text-warning',
    textClass: 'text-warning',
    buttonClass: 'bg-orange-600 hover:bg-orange-700 text-white',
    dismissClass: 'text-warning hover:text-warning',
    icon: Calendar,
    title: 'Renovação da Assinatura',
    message: `Sua assinatura expira em ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'dia' : 'dias'}.`,
    buttonText: 'Renovar'
  };

  return (
    <div className={`fixed top-4 left-4 right-4 z-50 ${config.bgClass} border-l-4 border-l-current px-4 py-3 rounded-lg shadow-lg`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <config.icon className={`h-5 w-5 ${config.iconClass}`} />
          <div className={config.textClass}>
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
              <Button size="sm" onClick={() => navigate('/assinatura')} className={`${config.buttonClass} text-xs px-3 py-1 h-7`}>
                {config.buttonText}
              </Button>
            </div>
          </div>
        </div>
        {!isPendingPayment && (
          <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)} className={`h-6 w-6 p-0 ${config.dismissClass}`}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};
