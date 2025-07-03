
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
            <AppSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <main className="flex-1 overflow-y-auto">
                <section id="painel" className="h-screen p-8 overflow-y-auto">
                  <Dashboard />
                </section>
                
                <section id="receitas" className="h-screen p-8 border-t overflow-y-auto">
                  <Receitas />
                </section>
                
                <section id="despesas" className="h-screen p-8 border-t overflow-y-auto">
                  <Despesas />
                </section>
                
                <section id="impostos" className="h-screen p-8 border-t overflow-y-auto">
                  <Impostos />
                </section>
                
                <section id="equipe" className="h-screen p-8 border-t overflow-y-auto">
                  <Equipe />
                </section>
                
                <section id="metas" className="h-screen p-8 border-t overflow-y-auto">
                  <Metas />
                </section>
                
                <section id="relatorios" className="h-screen p-8 border-t overflow-y-auto">
                  <Relatorios />
                </section>
                
                <section id="fechamento" className="h-screen p-8 border-t overflow-y-auto">
                  <Fechamento />
                </section>
                
                <section id="assinatura" className="h-screen p-8 border-t overflow-y-auto">
                  <Assinatura />
                </section>
                
                <section id="configuracoes" className="h-screen p-8 border-t overflow-y-auto">
                  <Configuracoes />
                </section>
                
                <section id="ajuda" className="h-screen p-8 border-t overflow-y-auto">
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
