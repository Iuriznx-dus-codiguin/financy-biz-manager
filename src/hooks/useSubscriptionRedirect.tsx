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
        const { data: subscriber, error } = await supabase
          .from('subscribers')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao verificar assinatura:', error);
          return;
        }

        let shouldRedirectToSubscription = false;

        if (!subscriber) {
          // Usuário sem assinatura = teste gratuito
          const signUpDate = new Date(user.created_at || Date.now());
          const trialEndDate = new Date(signUpDate.getTime() + (7 * 24 * 60 * 60 * 1000));
          const today = new Date();
          const diffTime = trialEndDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Se teste expirou, redirecionar para assinatura
          if (diffDays < 0) {
            shouldRedirectToSubscription = true;
          }
        } else if (subscriber.subscribed && subscriber.subscription_end) {
          // Verificar se assinatura expirou
          const endDate = new Date(subscriber.subscription_end);
          const today = new Date();
          const diffTime = endDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Se assinatura expirou, redirecionar para assinatura
          if (diffDays < 0) {
            shouldRedirectToSubscription = true;
          }
        } else if (!subscriber.subscribed) {
          // Usuário sem assinatura ativa
          shouldRedirectToSubscription = true;
        }

        // Redirecionar para assinatura se necessário e bloquear outras seções
        if (shouldRedirectToSubscription) {
          // Bloquear acesso a outras seções quando assinatura expirou, mas permitir acesso à assinatura, configurações e ajuda
          const restrictedSections = ['painel', 'receitas', 'despesas', 'impostos', 'metas', 'relatorios', 'fechamento', 'agentes-ia', 'equipe'];
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