
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
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
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
            <div className="flex-1 flex flex-col">
              <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
                <div className="container flex h-14 items-center">
                  <SidebarTrigger />
                </div>
              </header>
              <main className="flex-1">
                <section id="painel" className="min-h-screen p-8">
                  <Dashboard />
                </section>
                
                <section id="receitas" className="min-h-screen p-8 border-t">
                  <Receitas />
                </section>
                
                <section id="despesas" className="min-h-screen p-8 border-t">
                  <Despesas />
                </section>
                
                <section id="impostos" className="min-h-screen p-8 border-t">
                  <Impostos />
                </section>
                
                <section id="equipe" className="min-h-screen p-8 border-t">
                  <Equipe />
                </section>
                
                <section id="relatorios" className="min-h-screen p-8 border-t">
                  <Relatorios />
                </section>
                
                <section id="fechamento" className="min-h-screen p-8 border-t">
                  <Fechamento />
                </section>
                
                <section id="assinatura" className="min-h-screen p-8 border-t">
                  <Assinatura />
                </section>
                
                <section id="configuracoes" className="min-h-screen p-8 border-t">
                  <Configuracoes />
                </section>
                
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
