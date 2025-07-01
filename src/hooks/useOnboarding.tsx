
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingData {
  userType: string;
  howDidYouKnow: string;
  salaryRange: string;
  revenueRange: string;
}

interface OnboardingContextType {
  onboardingData: OnboardingData | null;
  isOnboardingComplete: boolean;
  completeOnboarding: (data: OnboardingData) => Promise<void>;
  skipOnboarding: () => Promise<void>;
  loading: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    } else {
      setLoading(false);
      setIsOnboardingComplete(false);
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('onboarding_data')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar onboarding:', error);
        return;
      }

      if (data) {
        setOnboardingData({
          userType: data.user_type,
          howDidYouKnow: data.how_did_you_know,
          salaryRange: data.salary_range || '',
          revenueRange: data.revenue_range || ''
        });
        setIsOnboardingComplete(true);
      } else {
        setIsOnboardingComplete(false);
      }
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
          user_type: data.userType,
          how_did_you_know: data.howDidYouKnow,
          salary_range: data.userType === 'personal' ? data.salaryRange : null,
          revenue_range: data.userType !== 'personal' ? data.revenueRange : null
        });

      if (error) throw error;

      setOnboardingData(data);
      setIsOnboardingComplete(true);
    } catch (error) {
      console.error('Erro ao salvar onboarding:', error);
      throw error;
    }
  };

  const skipOnboarding = async () => {
    if (!user) return;

    try {
      const defaultData = {
        userType: 'personal',
        howDidYouKnow: 'other',
        salaryRange: '0-2000',
        revenueRange: ''
      };

      await completeOnboarding(defaultData);
    } catch (error) {
      console.error('Erro ao pular onboarding:', error);
    }
  };

  return (
    <OnboardingContext.Provider value={{
      onboardingData,
      isOnboardingComplete,
      completeOnboarding,
      skipOnboarding,
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
