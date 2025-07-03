
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingData } from '@/types/onboarding';

interface OnboardingContextType {
  isOnboardingComplete: boolean;
  completeOnboarding: (data: OnboardingData) => Promise<void>;
  loading: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('onboarding_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar onboarding:', error);
      }

      // Se existe dados de onboarding, considera como completo
      setIsOnboardingComplete(!!data);
    } catch (error) {
      console.error('Erro ao verificar onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async (data: OnboardingData) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('onboarding_data')
        .insert({
          user_id: user.id,
          user_type: data.user_type,
          how_did_you_know: data.how_did_you_know,
          salary_range: data.salary_range,
          revenue_range: data.revenue_range
        });

      if (error) {
        console.error('Erro ao salvar dados de onboarding:', error);
        throw error;
      }

      setIsOnboardingComplete(true);
    } catch (error) {
      console.error('Erro ao completar onboarding:', error);
      throw error;
    }
  };

  return (
    <OnboardingContext.Provider value={{ 
      isOnboardingComplete, 
      completeOnboarding, 
      loading 
    }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
