
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
import { AppProvider } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function Index() {
  const [activeSection, setActiveSection] = useState('painel');
  const { user, loading: authLoading } = useAuth();
  const { isOnboardingComplete, completeOnboarding, loading: onboardingLoading } = useOnboarding();

  // Detecta qual seção está visível no viewport
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observa todas as seções
    const sections = [
      'painel', 'receitas', 'despesas', 'impostos', 'equipe', 
      'relatorios', 'fechamento', 'assinatura', 'configuracoes', 'ajuda'
    ];

    sections.forEach(sectionId => {
      const element = document.getElementById(sectionId);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
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

  if (!user) {
    return <AuthPage />;
  }

  if (!isOnboardingComplete) {
    return <OnboardingFlow onComplete={completeOnboarding} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppProvider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
            <div className="flex-1 flex flex-col">
              <main className="flex-1">
                {/* Seção Painel */}
                <section id="painel" className="min-h-screen p-8">
                  <Dashboard />
                </section>

                {/* Seção Receitas */}
                <section id="receitas" className="min-h-screen p-8 border-t">
                  <Receitas />
                </section>

                {/* Seção Despesas */}
                <section id="despesas" className="min-h-screen p-8 border-t">
                  <Despesas />
                </section>

                {/* Seção Impostos */}
                <section id="impostos" className="min-h-screen p-8 border-t">
                  <Impostos />
                </section>

                {/* Seção Equipe */}
                <section id="equipe" className="min-h-screen p-8 border-t">
                  <Equipe />
                </section>

                {/* Seção Relatórios */}
                <section id="relatorios" className="min-h-screen p-8 border-t">
                  <Relatorios />
                </section>

                {/* Seção Fechamento */}
                <section id="fechamento" className="min-h-screen p-8 border-t">
                  <Fechamento />
                </section>

                {/* Seção Assinatura */}
                <section id="assinatura" className="min-h-screen p-8 border-t">
                  <Assinatura />
                </section>

                {/* Seção Configurações */}
                <section id="configuracoes" className="min-h-screen p-8 border-t">
                  <Configuracoes />
                </section>

                {/* Seção Ajuda */}
                <section id="ajuda" className="min-h-screen p-8 border-t">
                  <Ajuda />
                </section>
              </main>
              <Footer />
            </div>
          </div>
        </SidebarProvider>
      </AppProvider>
    </div>
  );
}
