
import { useEffect, useState } from 'react';
import { AuthPage } from '@/components/auth/AuthPage';
import Dashboard from '@/components/sections/Dashboard';
import Receitas from '@/components/sections/Receitas';
import Despesas from '@/components/sections/Despesas';
import Impostos from '@/components/sections/Impostos';
import Relatorios from '@/components/sections/Relatorios';
import Fechamento from '@/components/sections/Fechamento';
import Equipe from '@/components/sections/Equipe';
import Metas from '@/components/sections/Metas';
import Assinatura from '@/components/sections/Assinatura';
import AgentesIA from '@/components/sections/AgentesIA';
import Configuracoes from '@/components/sections/Configuracoes';
import Ajuda from '@/components/sections/Ajuda';
import { Categorias } from '@/components/sections/Categorias';

import { GlobalSubscriptionAlert } from '@/components/GlobalSubscriptionAlert';
import { FreeTrialNotification } from '@/components/FreeTrialNotification';
import { useSubscriptionRedirect } from '@/hooks/useSubscriptionRedirect';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { OnboardingData } from '@/types/onboarding';
import { LoadingScreen } from '@/components/LoadingScreen';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileSidebar } from '@/components/MobileSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import Footer from '@/components/Footer';
import { AppProvider } from '@/contexts/AppContext';
import { DashboardProvider } from '@/hooks/useDashboard';

import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { isOnboardingComplete, completeOnboarding, loading: onboardingLoading } = useOnboarding();
  const [showLoading, setShowLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('painel');

  // Hook para gerenciar redirecionamentos baseados na assinatura
  useSubscriptionRedirect({ setActiveSection, currentSection: activeSection });

  // Adicionar listener para navegação customizada dos agentes
  useEffect(() => {
    const handleNavigateToSection = (event: any) => {
      setActiveSection(event.detail);
    };

    window.addEventListener('navigate-to-section', handleNavigateToSection);
    
    return () => {
      window.removeEventListener('navigate-to-section', handleNavigateToSection);
    };
  }, []);

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

  // Mostrar loading screen primeiro
  if (showLoading) {
    return <LoadingScreen onComplete={() => setShowLoading(false)} />;
  }

  if (!user) {
    return <AuthPage />;
  }

  // Mostrar onboarding para novos usuários
  if (!isOnboardingComplete) {
    return <OnboardingFlow onComplete={completeOnboarding} />;
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'painel':
        return <Dashboard setActiveSection={setActiveSection} />;
      case 'receitas':
        return <Receitas />;
      case 'despesas':
        return <Despesas />;
      case 'categorias':
        return <Categorias />;
      case 'impostos':
        return <Impostos />;
      case 'equipe':
        return <Equipe />;
      case 'metas':
        return <Metas />;
      case 'relatorios':
        return <Relatorios />;
      case 'fechamento':
        return <Fechamento />;
      case 'agentes-ia':
        return <AgentesIA />;
      case 'assinatura':
        return <Assinatura />;
      case 'configuracoes':
        return <Configuracoes />;
      case 'ajuda':
        return <Ajuda />;
      default:
        return <Dashboard setActiveSection={setActiveSection} />;
    }
  };

  return (
    <div className="h-screen bg-background">
      <SidebarProvider defaultOpen={false}>
        <div className="flex h-full w-full">
          <AppSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="lg:hidden">
              <MobileSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
            </div>
            <GlobalSubscriptionAlert setActiveSection={setActiveSection} />
            <FreeTrialNotification setActiveSection={setActiveSection} />
            <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
              {renderActiveSection()}
            </main>
            <Footer />
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
