import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

interface UseSubscriptionRedirectProps {
  setActiveSection: (section: string) => void;
  currentSection: string;
}

export const useSubscriptionRedirect = ({ setActiveSection, currentSection }: UseSubscriptionRedirectProps) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkAndRedirect = async () => {
      try {
        // Primeiro verificar se é desenvolvedor (bypass completo)
        const { data: subscriber } = await supabase
          .from('subscribers')
          .select('subscription_tier, subscribed')
          .eq('user_id', user.id)
          .maybeSingle();

        // Desenvolvedores têm acesso total
        if (subscriber?.subscription_tier === 'developer' && subscriber?.subscribed === true) {
          return;
        }

        // Verificar status na tabela user_subscriptions
        const { data: userSub, error } = await supabase
          .from('user_subscriptions')
          .select('status, subscription_type, expires_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao verificar assinatura:', error);
          return;
        }

        let shouldRedirectToSubscription = false;

        if (!userSub) {
          // Usuário sem assinatura = precisa pagar
          shouldRedirectToSubscription = true;
        } else if (userSub.status === 'pending_payment') {
          // NOVO: Status pending_payment = precisa pagar
          shouldRedirectToSubscription = true;
        } else if (userSub.status === 'active') {
          // Verificar se assinatura expirou
          if (userSub.expires_at) {
            const endDate = new Date(userSub.expires_at);
            const today = new Date();
            if (endDate < today) {
              shouldRedirectToSubscription = true;
            }
          }
          // Se não tem expires_at mas é active, está OK (ex: desenvolvedor)
        } else if (userSub.status === 'expired' || userSub.status === 'cancelled') {
          // Assinatura expirada ou cancelada
          shouldRedirectToSubscription = true;
        }

        // Redirecionar para assinatura se necessário e bloquear outras seções
        if (shouldRedirectToSubscription) {
          // Bloquear acesso a outras seções quando assinatura expirou, mas permitir acesso à assinatura, configurações e ajuda
          const restrictedSections = ['painel', 'receitas', 'despesas', 'impostos', 'metas', 'relatorios', 'fechamento', 'agentes-ia', 'equipe', 'categorias'];
          if (restrictedSections.includes(currentSection)) {
            setActiveSection('assinatura');
          }
        }

      } catch (error) {
        console.error('Erro ao verificar status da assinatura:', error);
      }
    };

    checkAndRedirect();
  }, [user, setActiveSection, currentSection]);
};