
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
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Footer from '@/components/Footer';
import { AppProvider } from '@/contexts/AppContext';
import { DashboardProvider } from '@/hooks/useDashboard';


import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { SubscriptionExpiredBanner } from '@/components/SubscriptionExpiredBanner';
import { FloatingWhatsAppButton } from '@/components/FloatingWhatsAppButton';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { isOnboardingComplete, completeOnboarding, loading: onboardingLoading } = useOnboarding();
  const { subscription, isSubscriptionExpired, loading: subscriptionLoading } = useUserSubscription();
  const [showLoading, setShowLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('painel');

  // Hook para gerenciar redirecionamentos baseados na assinatura
  useSubscriptionRedirect({ setActiveSection, currentSection: activeSection });

  // Verificar se assinatura expirou e forçar aba de assinatura
  useEffect(() => {
    if (user && subscription && isSubscriptionExpired()) {
      setActiveSection('assinatura');
    }
  }, [user, subscription, isSubscriptionExpired]);

  // Bloquear navegação se assinatura expirou
  const handleSectionChange = (newSection: string) => {
    if (user && subscription && isSubscriptionExpired() && newSection !== 'assinatura') {
      // Não permite mudança de seção se assinatura expirou
      return;
    }
    setActiveSection(newSection);
  };

  // Adicionar listener para navegação customizada dos agentes
  useEffect(() => {
    const handleNavigateToSection = (event: any) => {
      const targetSection = event.detail;
      
      // Se assinatura expirou, só permite ir para assinatura
      if (user && subscription && isSubscriptionExpired() && targetSection !== 'assinatura') {
        return;
      }
      
      setActiveSection(targetSection);
    };

    window.addEventListener('navigate-to-section', handleNavigateToSection);
    
    return () => {
      window.removeEventListener('navigate-to-section', handleNavigateToSection);
    };
  }, [user, subscription, isSubscriptionExpired]);

  if (authLoading || onboardingLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Mostrar loading screen apenas para usuários autenticados
  if (showLoading) {
    return <LoadingScreen onComplete={() => setShowLoading(false)} />;
  }

  // Mostrar onboarding para novos usuários
  if (!isOnboardingComplete) {
    return <OnboardingFlow onComplete={completeOnboarding} />;
  }

  const renderActiveSection = () => {
    // Se assinatura expirou, sempre mostrar aba de assinatura
    if (user && subscription && isSubscriptionExpired()) {
      return <Assinatura />;
    }

    switch (activeSection) {
      case 'painel':
        return <Dashboard setActiveSection={handleSectionChange} />;
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
        return <Dashboard setActiveSection={handleSectionChange} />;
    }
  };

  const isSubscriptionExpiredState = user && subscription && isSubscriptionExpired();

  return (
    <div className="h-screen bg-background">
      <SidebarProvider defaultOpen={false}>
        <div className="flex h-full w-full">
          <AppSidebar
            activeSection={isSubscriptionExpiredState ? 'assinatura' : activeSection} 
            setActiveSection={handleSectionChange}
            disabled={isSubscriptionExpiredState}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="lg:hidden">
              <MobileSidebar 
                activeSection={isSubscriptionExpiredState ? 'assinatura' : activeSection} 
                setActiveSection={handleSectionChange}
                disabled={isSubscriptionExpiredState}
              />
            </div>
            <GlobalSubscriptionAlert setActiveSection={handleSectionChange} />
            <FreeTrialNotification setActiveSection={handleSectionChange} />
            {isSubscriptionExpiredState && <SubscriptionExpiredBanner />}
            <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
              {renderActiveSection()}
            </main>
            <Footer />
          </div>
        </div>
      </SidebarProvider>
      <FloatingWhatsAppButton />
    </div>
  );
}
