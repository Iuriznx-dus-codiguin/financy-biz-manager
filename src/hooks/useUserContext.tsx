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
    
    // Contexto é definido pelo tipo do dashboard ATUAL, não pelo userType
    // Isso permite que usuários empresariais vejam contexto pessoal em dashboards pessoais
    const isPersonalContext = currentDashboardType === 'personal';
    const isBusinessContext = currentDashboardType === 'business';
    
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
