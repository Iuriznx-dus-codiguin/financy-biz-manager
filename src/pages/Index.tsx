
import { useEffect, useState } from 'react';
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

export default function Index() {
  const [activeSection, setActiveSection] = useState('painel');
  const { user, loading: authLoading } = useAuth();
  const { isOnboardingComplete, completeOnboarding, loading: onboardingLoading } = useOnboarding();

  const renderSection = () => {
    try {
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
          return <Dashboard />;
      }
    } catch (error) {
      console.error('Erro ao renderizar seção:', error);
      return <Dashboard />;
    }
  };

  // Loading state
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
    <div className="min-h-screen bg-background">
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
          <div className="flex-1 flex flex-col">
            <main className="flex-1 p-8">
              {renderSection()}
            </main>
            <Footer />
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
