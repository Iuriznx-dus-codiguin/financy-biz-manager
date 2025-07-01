import { useEffect, useState } from 'react';
import { AuthPage } from '@/components/AuthPage';
import Dashboard from '@/components/sections/Dashboard';
import Receitas from '@/components/sections/Receitas';
import Despesas from '@/components/sections/Despesas';
import Impostos from '@/components/sections/Impostos';
import Relatorios from '@/components/sections/Relatorios';
import Fechamento from '@/components/sections/Fechamento';
import Ajuda from '@/components/sections/Ajuda';
import OnboardingFlow from '@/components/OnboardingFlow';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { AppProvider } from '@/contexts/AppContext';
import { useUser } from '@clerk/nextjs';

export default function Index() {
  const [activeSection, setActiveSection] = useState('painel');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user) {
      const hasCompletedOnboarding = user.publicMetadata?.hasCompletedOnboarding === true;
      setShowOnboarding(!hasCompletedOnboarding);
    }
  }, [user, isLoaded]);

  const renderSection = () => {
    switch (activeSection) {
      case 'painel':
        return <Dashboard />;
      case 'receitas':
        return <Receitas />;
      case 'despesas':
        return <Despesas />;
      case 'impostos':
        return <Impostos />;
      case 'relatorios':
        return <Relatorios />;
      case 'fechamento':
        return <Fechamento />;
      case 'ajuda':
        return <Ajuda />;
      default:
        return <Dashboard />;
    }
  };

  if (showOnboarding) {
    return <OnboardingFlow />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar onSectionChange={setActiveSection} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto p-8">
              {renderSection()}
            </main>
            <Footer />
          </div>
        </div>
      </AppProvider>
    </div>
  );
}
