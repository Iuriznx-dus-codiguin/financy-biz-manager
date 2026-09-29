import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/features/configuracoes/useTheme';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/features/auth/useAuth';
import { SettingsProvider } from '@/features/configuracoes/useSettings';
import { OnboardingProvider } from '@/features/onboarding/useOnboarding';
import { ProductTourProvider } from '@/features/onboarding/tour/useProductTour';
import { DashboardProvider } from '@/features/dashboards/useDashboard';
import { UserContextProvider } from '@/features/dashboards/useUserContext';
import { AppProvider } from '@/features/financeiro/AppContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: (failureCount, error) => {
        const status = (error as { status?: number } | null)?.status ?? 0;
        if (status >= 400 && status < 500 && status !== 429) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <SettingsProvider>
            <OnboardingProvider>
              <DashboardProvider>
                <ProductTourProvider>
                  <UserContextProvider>
                    <AppProvider>{children}</AppProvider>
                  </UserContextProvider>
                </ProductTourProvider>
              </DashboardProvider>
            </OnboardingProvider>
          </SettingsProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
