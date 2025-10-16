import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useOnboarding } from './useOnboarding';
import { useDashboard } from './useDashboard';

export interface UserContext {
  userType: 'pessoal' | 'empresarial';
  currentDashboardType: 'personal' | 'business';
  isPersonalContext: boolean;
  isBusinessContext: boolean;
  nomePreferido: string;
  loading: boolean;
}

const UserContextContext = createContext<UserContext | undefined>(undefined);

export const UserContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { onboardingData, loading: onboardingLoading } = useOnboarding();
  const { currentDashboard, loading: dashboardLoading } = useDashboard();
  
  const contextValue = useMemo<UserContext>(() => {
    const userType = (onboardingData?.user_type as 'pessoal' | 'empresarial') || 'pessoal';
    const currentDashboardType = (currentDashboard?.type as 'personal' | 'business') || 'personal';
    
    // Contexto pessoal: usuário É pessoal OU dashboard atual é pessoal
    const isPersonalContext = userType === 'pessoal' || currentDashboardType === 'personal';
    
    // Contexto empresarial: usuário É empresarial E dashboard atual é business
    const isBusinessContext = userType === 'empresarial' && currentDashboardType === 'business';
    
    const nomePreferido = onboardingData?.nome_preferido || '';
    
    return {
      userType,
      currentDashboardType,
      isPersonalContext,
      isBusinessContext,
      nomePreferido,
      loading: onboardingLoading || dashboardLoading
    };
  }, [onboardingData, currentDashboard, onboardingLoading, dashboardLoading]);

  return (
    <UserContextContext.Provider value={contextValue}>
      {children}
    </UserContextContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContextContext);
  if (!context) {
    // Retornar valores padrão seguros se usado fora do provider
    return {
      userType: 'pessoal' as const,
      currentDashboardType: 'personal' as const,
      isPersonalContext: true,
      isBusinessContext: false,
      nomePreferido: '',
      loading: false
    };
  }
  return context;
};
