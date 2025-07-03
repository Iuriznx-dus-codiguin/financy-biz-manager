
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, Calendar, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  stripe_customer_id: string | null;
}

export const SubscriptionStatus: React.FC = () => {
  const { user } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSubscriptionStatus();
  }, [user]);

  const checkSubscriptionStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Verificar se existe registro na tabela subscribers
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
          subscription_end: subscriber.subscription_end,
          stripe_customer_id: subscriber.stripe_customer_id
        });
      } else {
        // Usuário não tem assinatura
        setSubscriptionData({
          subscribed: false,
          subscription_tier: null,
          subscription_end: null,
          stripe_customer_id: null
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status da assinatura:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = () => {
    if (!subscriptionData) return null;

    const { subscribed, subscription_tier, subscription_end } = subscriptionData;

    if (!subscribed) {
      return {
        status: 'inactive',
        title: 'Assinatura Inativa',
        description: 'Você está usando a versão gratuita',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50 border-gray-200',
        icon: <XCircle className="h-5 w-5 text-gray-500" />
      };
    }

    const endDate = subscription_end ? new Date(subscription_end) : null;
    const now = new Date();
    const daysUntilExpiry = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    if (endDate && endDate < now) {
      return {
        status: 'expired',
        title: 'Assinatura Expirada',
        description: `${subscription_tier} - Expirou em ${endDate.toLocaleDateString('pt-BR')}`,
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200',
        icon: <AlertTriangle className="h-5 w-5 text-red-500" />
      };
    }

    if (daysUntilExpiry <= 7) {
      return {
        status: 'expiring',
        title: 'Assinatura Expirando',
        description: `${subscription_tier} - Expira em ${daysUntilExpiry} dias`,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 border-orange-200',
        icon: <AlertTriangle className="h-5 w-5 text-orange-500" />
      };
    }

    return {
      status: 'active',
      title: 'Assinatura Ativa',
      description: `${subscription_tier} - Válida até ${endDate?.toLocaleDateString('pt-BR')}`,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      icon: <CheckCircle className="h-5 w-5 text-green-500" />
    };
  };

  const statusInfo = getStatusInfo();

  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!statusInfo) return null;

  return (
    <Card className={`rounded-2xl border ${statusInfo.bgColor}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {statusInfo.icon}
          Status da Assinatura
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div>
            <h3 className={`font-semibold ${statusInfo.color}`}>
              {statusInfo.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {statusInfo.description}
            </p>
          </div>
          
          {subscriptionData?.subscribed && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CreditCard className="h-3 w-3" />
              <span>Gerenciado via Stripe</span>
            </div>
          )}

          {statusInfo.status === 'inactive' && (
            <Button size="sm" className="w-full rounded-xl">
              <Calendar className="h-4 w-4 mr-2" />
              Assinar Agora
            </Button>
          )}

          {(statusInfo.status === 'expiring' || statusInfo.status === 'expired') && (
            <Button size="sm" variant="outline" className="w-full rounded-xl">
              <CreditCard className="h-4 w-4 mr-2" />
              Renovar Assinatura
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
