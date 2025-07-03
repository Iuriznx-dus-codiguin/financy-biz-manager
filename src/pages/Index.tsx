
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
import Configuracoes from '@/components/sections/Configuracoes';
import Ajuda from '@/components/sections/Ajuda';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import Footer from '@/components/Footer';
import { AppProvider } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { isOnboardingComplete, completeOnboarding, loading: onboardingLoading } = useOnboarding();
  const [activeSection, setActiveSection] = useState('painel');

  // Debug log para verificar qual seção está ativa
  console.log('Active section:', activeSection);

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

  if (!user) {
    return <AuthPage />;
  }

  if (!isOnboardingComplete) {
    return <OnboardingFlow onComplete={completeOnboarding} />;
  }

  const renderActiveSection = () => {
    console.log('Rendering section:', activeSection);
    
    switch (activeSection) {
      case 'painel':
        return <Dashboard />;
      case 'receitas':
        return <Receitas />;
      case 'despesas':
        return <Despesas />;
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
      case 'assinatura':
        return <Assinatura />;
      case 'configuracoes':
        return <Configuracoes />;
      case 'ajuda':
        return <Ajuda />;
      default:
        console.warn('Seção não encontrada:', activeSection);
        return <Dashboard />;
    }
  };

  return (
    <AppProvider>
      <div className="h-screen bg-background">
        <SidebarProvider>
          <div className="flex h-full w-full">
            <AppSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
            <div className="flex-1 flex flex-col overflow-hidden">
              <main className="flex-1 overflow-y-auto p-8">
                <div className="min-h-full">
                  {renderActiveSection()}
                </div>
              </main>
              <Footer />
            </div>
          </div>
        </SidebarProvider>
      </div>
    </AppProvider>
  );
}
