import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserSubscription {
  id: string;
  user_id: string;
  email: string;
  subscription_type: string;
  plan_name: string;
  plan_id?: string;
  status: string;
  created_at: string;
  started_at: string;
  expires_at?: string;
  renewed_at?: string;
  cancelled_at?: string;
  amount: number;
  currency: string;
  billing_period: string;
  payment_method?: string;
  cakto_subscription_id?: string;
  cakto_customer_id?: string;
  features: {
    max_dashboards?: number;
    ai_requests_per_month?: number;
    team_members?: number;
    whatsapp_integration?: boolean;
    advanced_analytics?: boolean;
    export_data?: boolean;
  };
  metadata: Record<string, any>;
  updated_at: string;
}

export const useUserSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchSubscription();
  }, [user]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      // PRIMEIRO: Verificar se é desenvolvedor na tabela subscribers
      const { data: subscriberData } = await supabase
        .from('subscribers')
        .select('subscription_tier, subscribed, subscription_end')
        .eq('user_id', user!.id)
        .maybeSingle();

      // Se é desenvolvedor, retornar acesso ilimitado
      if (subscriberData?.subscription_tier === 'developer' && subscriberData.subscribed) {
        console.log('✅ Acesso de desenvolvedor detectado - acesso ilimitado concedido');
        
        // Buscar subscription completa (já foi sincronizada pela migration)
        const { data } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user!.id)
          .maybeSingle();
        
        if (data) {
          setSubscription(data as UserSubscription);
        }
        return;
      }

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar assinatura:', error);
        setError('Erro ao carregar dados da assinatura');
        return;
      }

      // Se não encontrou assinatura, criar automaticamente (fallback)
      if (!data) {
        console.warn('⚠️ Assinatura não encontrada para o usuário. Criando teste gratuito automaticamente...');
        
        // Chamar função do banco que cria assinatura de teste gratuito
        const { error: ensureError } = await supabase.rpc('ensure_user_has_subscription', {
          p_user_id: user!.id
        });

        if (ensureError) {
          console.error('Erro ao criar assinatura automática:', ensureError);
        }

        // Buscar novamente após criar
        const { data: newData, error: refetchError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user!.id)
          .maybeSingle();

        if (refetchError) {
          console.error('Erro ao buscar assinatura após criação:', refetchError);
          setError('Erro ao carregar dados da assinatura');
          return;
        }

        setSubscription(newData as UserSubscription | null);
      } else {
        setSubscription(data as UserSubscription | null);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Erro inesperado ao carregar assinatura');
    } finally {
      setLoading(false);
    }
  };

  const hasFeature = (feature: string): boolean => {
    if (!subscription || subscription.status !== 'active') return false;
    
    const now = new Date();
    if (subscription.expires_at && new Date(subscription.expires_at) < now) {
      return false;
    }

    return subscription.features[feature] === true || 
           (typeof subscription.features[feature] === 'number' && subscription.features[feature] > 0);
  };

  const getFeatureLimit = (feature: string): number => {
    if (!subscription || subscription.status !== 'active') return 0;
    
    const now = new Date();
    if (subscription.expires_at && new Date(subscription.expires_at) < now) {
      return 0;
    }

    return subscription.features[feature] || 0;
  };

  const isSubscriptionExpired = (): boolean => {
    // IMPORTANTE: Desenvolvedores NUNCA expiram
    if (subscription?.subscription_type === 'developer') {
      return false;
    }

    // Se não tem assinatura, verificar se o teste gratuito de 7 dias expirou
    if (!subscription) {
      if (!user?.created_at) return true;
      
      const userCreatedAt = new Date(user.created_at);
      const trialEndDate = new Date(userCreatedAt.getTime() + (7 * 24 * 60 * 60 * 1000));
      const isExpired = trialEndDate < new Date();
      
      if (isExpired) {
        console.warn('🔒 Teste gratuito expirado para usuário sem assinatura', {
          userId: user.id,
          createdAt: user.created_at,
          trialEndDate
        });
      }
      
      return isExpired;
    }
    
    // Se tem assinatura, verificar data de expiração
    if (!subscription.expires_at) return false;
    
    const isExpired = new Date(subscription.expires_at) < new Date();
    
    if (isExpired) {
      console.warn('🔒 Assinatura expirada', {
        userId: user?.id,
        subscriptionId: subscription.id,
        expiresAt: subscription.expires_at
      });
    }
    
    return isExpired;
  };

  const isFreeTrial = (): boolean => {
    return subscription?.subscription_type === 'free_trial';
  };

  const isPremium = (): boolean => {
    // Desenvolvedores sempre têm acesso premium
    if (subscription?.subscription_type === 'developer') {
      return true;
    }
    return subscription?.subscription_type === 'premium' || subscription?.subscription_type === 'enterprise';
  };

  const getDaysUntilExpiration = (): number | null => {
    if (!subscription || !subscription.expires_at) return null;
    
    const now = new Date();
    const expirationDate = new Date(subscription.expires_at);
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const renewSubscription = async (newExpiresAt?: string, amount?: number) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('renew_subscription', {
        p_user_id: user.id,
        p_new_expires_at: newExpiresAt || null,
        p_amount: amount || null
      });

      if (error) {
        console.error('Erro ao renovar assinatura:', error);
        return false;
      }

      await fetchSubscription(); // Recarregar dados
      return true;
    } catch (err) {
      console.error('Erro inesperado ao renovar:', err);
      return false;
    }
  };

  const updateSubscription = async (updates: Partial<UserSubscription>) => {
    if (!user || !subscription) return false;

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao atualizar assinatura:', error);
        return false;
      }

      await fetchSubscription(); // Recarregar dados
      return true;
    } catch (err) {
      console.error('Erro inesperado ao atualizar:', err);
      return false;
    }
  };

  return {
    subscription,
    loading,
    error,
    hasFeature,
    getFeatureLimit,
    isSubscriptionExpired,
    isFreeTrial,
    isPremium,
    getDaysUntilExpiration,
    renewSubscription,
    updateSubscription,
    refetch: fetchSubscription
  };
};