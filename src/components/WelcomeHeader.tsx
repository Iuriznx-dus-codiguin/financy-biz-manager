import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Calendar, 
  AlertTriangle, 
  CreditCard, 
  Clock,
  Crown,
  Sparkles,
  X 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface WelcomeHeaderProps {
  setActiveSection?: (section: string) => void;
}

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ setActiveSection }) => {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(true);
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

  const getUserName = () => {
    if (user?.user_metadata?.nome_completo) {
      return user.user_metadata.nome_completo.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Usuário';
  };

  const getSubscriptionStatus = () => {
    if (!subscriptionData) return null;
    
    const isFreePlan = !subscriptionData.subscribed;
    const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
    const isNearExpiry = subscriptionData.subscribed && daysUntilExpiry !== null && daysUntilExpiry <= 3 && daysUntilExpiry >= 0;

    if (isExpired) {
      return {
        type: 'expired',
        message: 'Assinatura Expirada',
        submessage: 'Renove para continuar usando',
        variant: 'destructive',
        icon: AlertTriangle,
        action: 'Renovar Assinatura'
      };
    }

    if (isFreePlan) {
      return {
        type: 'trial',
        message: 'Teste Gratuito',
        submessage: daysUntilExpiry && daysUntilExpiry > 0 
          ? `Expira em ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'dia' : 'dias'}`
          : 'Expirou hoje',
        variant: 'secondary',
        icon: Clock,
        action: 'Assinar Agora'
      };
    }

    if (isNearExpiry) {
      return {
        type: 'renew',
        message: `Plano ${subscriptionData.subscription_tier}`,
        submessage: `Expira em ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'dia' : 'dias'}`,
        variant: 'outline',
        icon: Calendar,
        action: 'Renovar'
      };
    }

    // Assinatura ativa e não próxima do vencimento
    return {
      type: 'active',
      message: `Plano ${subscriptionData.subscription_tier}`,
      submessage: subscriptionData.subscription_end 
        ? `Válido até ${new Date(subscriptionData.subscription_end).toLocaleDateString('pt-BR')}`
        : 'Plano ativo',
      variant: 'default',
      icon: subscriptionData.subscription_tier?.includes('premium') || subscriptionData.subscription_tier?.includes('enterprise') ? Crown : Sparkles,
      action: null
    };
  };

  const handleGoToSubscription = () => {
    setActiveSection?.('assinatura');
  };

  const subscriptionStatus = getSubscriptionStatus();

  if (!user || !isVisible) {
    return null;
  }

  return (
    <Card className="mb-6 border-l-4 border-l-primary/20 bg-gradient-to-r from-background to-muted/20 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">
                  Olá, {getUserName()}! 👋
                </h2>
                <Badge variant="outline" className="text-xs">
                  Dashboard Principal
                </Badge>
              </div>
              
              {subscriptionStatus && (
                <div className="flex items-center gap-2">
                  <subscriptionStatus.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {subscriptionStatus.message}
                  </span>
                  <span className="text-xs text-muted-foreground/80">
                    • {subscriptionStatus.submessage}
                  </span>
                  {subscriptionStatus.action && (
                    <Button 
                      size="sm" 
                      variant={subscriptionStatus.variant as any}
                      onClick={handleGoToSubscription}
                      className="h-6 text-xs px-2 ml-2"
                    >
                      {subscriptionStatus.action}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Este Mês
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};