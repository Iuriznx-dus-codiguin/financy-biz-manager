import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/hooks/useTheme';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/hooks/useAuth';
import { SettingsProvider } from '@/hooks/useSettings';
import { OnboardingProvider } from '@/hooks/useOnboarding';
import { SectionTutorialsProvider } from '@/hooks/useSectionTutorials';
import { DashboardProvider } from '@/hooks/useDashboard';
import { UserContextProvider } from '@/hooks/useUserContext';
import { AppProvider } from '@/contexts/AppContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
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
              <SectionTutorialsProvider>
                <DashboardProvider>
                  <UserContextProvider>
                    <AppProvider>{children}</AppProvider>
                  </UserContextProvider>
                </DashboardProvider>
              </SectionTutorialsProvider>
            </OnboardingProvider>
          </SettingsProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
