
import { useState, useCallback, useMemo } from 'react';
import { AuthPage } from '@/components/auth/AuthPage';
import Dashboard from '@/components/sections/Dashboard';
import Receitas from '@/components/sections/Receitas';
import Despesas from '@/components/sections/Despesas';
import Impostos from '@/components/sections/Impostos';
import Relatorios from '@/components/sections/Relatorios';
import Fechamento from '@/components/sections/Fechamento';
import Equipe from '@/components/sections/Equipe';
import Assinatura from '@/components/sections/Assinatura';
import Configuracoes from '@/components/sections/Configuracoes';
import Ajuda from '@/components/sections/Ajuda';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const SECTION_COMPONENTS = {
  painel: Dashboard,
  receitas: Receitas,
  despesas: Despesas,
  impostos: Impostos,
  equipe: Equipe,
  relatorios: Relatorios,
  fechamento: Fechamento,
  assinatura: Assinatura,
  configuracoes: Configuracoes,
  ajuda: Ajuda,
} as const;

type SectionKey = keyof typeof SECTION_COMPONENTS;

export default function Index() {
  const [activeSection, setActiveSection] = useState<SectionKey>('painel');
  const { user, loading: authLoading } = useAuth();
  const { isOnboardingComplete, completeOnboarding, loading: onboardingLoading } = useOnboarding();

  const handleSectionChange = useCallback((section: string) => {
    console.log('Changing section to:', section);
    if (section in SECTION_COMPONENTS) {
      setActiveSection(section as SectionKey);
    } else {
      console.warn('Invalid section:', section);
      setActiveSection('painel');
    }
  }, []);

  const CurrentComponent = useMemo(() => {
    const Component = SECTION_COMPONENTS[activeSection];
    return Component || Dashboard;
  }, [activeSection]);

  // Loading states
  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Auth page
  if (!user) {
    return <AuthPage />;
  }

  // Onboarding
  if (!isOnboardingComplete) {
    return <OnboardingFlow onComplete={completeOnboarding} />;
  }

  // Main app
  return (
    <ErrorBoundary>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar 
            activeSection={activeSection} 
            onSectionChange={handleSectionChange} 
          />
          <div className="flex-1 flex flex-col">
            <main className="flex-1 p-8">
              <ErrorBoundary>
                <CurrentComponent />
              </ErrorBoundary>
            </main>
            <Footer />
          </div>
        </div>
      </SidebarProvider>
    </ErrorBoundary>
  );
}
