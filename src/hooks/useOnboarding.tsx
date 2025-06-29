
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface OnboardingData {
  userType: string;
  howDidYouKnow: string;
  salaryRange: string;
  revenueRange: string;
}

interface OnboardingContextType {
  onboardingData: OnboardingData | null;
  isOnboardingComplete: boolean;
  completeOnboarding: (data: OnboardingData) => void;
  skipOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(() => {
    return localStorage.getItem('financy_onboarding_complete') === 'true';
  });

  const completeOnboarding = (data: OnboardingData) => {
    setOnboardingData(data);
    setIsOnboardingComplete(true);
    localStorage.setItem('financy_onboarding_complete', 'true');
    localStorage.setItem('financy_onboarding_data', JSON.stringify(data));
  };

  const skipOnboarding = () => {
    setIsOnboardingComplete(true);
    localStorage.setItem('financy_onboarding_complete', 'true');
  };

  return (
    <OnboardingContext.Provider value={{
      onboardingData,
      isOnboardingComplete,
      completeOnboarding,
      skipOnboarding
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
