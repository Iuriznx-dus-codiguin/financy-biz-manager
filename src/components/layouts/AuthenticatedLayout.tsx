import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useDashboard } from '@/hooks/useDashboard';
import { usePaymentSuccess } from '@/hooks/usePaymentSuccess';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileSidebar } from '@/components/MobileSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import Footer from '@/components/Footer';
import { SubscriptionBanners } from '@/components/SubscriptionBanners';
import { FloatingWhatsAppButton } from '@/components/FloatingWhatsAppButton';
import { LoadingScreen } from '@/components/LoadingScreen';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { useState } from 'react';

// Mapeamento de rotas para IDs de seção
const routeToSection: Record<string, string> = {
  '/dashboard': 'painel',
  '/receitas': 'receitas',
  '/despesas': 'despesas',
  '/categorias': 'categorias',
  '/impostos': 'impostos',
  '/equipe': 'equipe',
  '/metas': 'metas',
  '/relatorios': 'relatorios',
  '/fechamento': 'fechamento',
  '/agentes-ia': 'agentes-ia',
  '/assinatura': 'assinatura',
  '/configuracoes': 'configuracoes',
  '/ajuda': 'ajuda',
};

// Mapeamento de seção para rota
const sectionToRoute: Record<string, string> = {
  'painel': '/dashboard',
  'receitas': '/receitas',
  'despesas': '/despesas',
  'categorias': '/categorias',
  'impostos': '/impostos',
  'equipe': '/equipe',
  'metas': '/metas',
  'relatorios': '/relatorios',
  'fechamento': '/fechamento',
  'agentes-ia': '/agentes-ia',
  'assinatura': '/assinatura',
  'configuracoes': '/configuracoes',
  'ajuda': '/ajuda',
};

// Seções permitidas quando assinatura está expirada ou pendente
const ALLOWED_SECTIONS_WHEN_BLOCKED = ['assinatura', 'configuracoes', 'ajuda'];

export const AuthenticatedLayout = () => {
  const { user, loading: authLoading } = useAuth();
  const { isOnboardingComplete, completeOnboarding, loading: onboardingLoading } = useOnboarding();
  const { subscription, isSubscriptionExpired, loading: subscriptionLoading } = useUserSubscription();
  const { currentDashboard } = useDashboard();
  const [showLoading, setShowLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Hook para detectar pagamentos bem-sucedidos
  usePaymentSuccess();

  // Obter seção atual baseada na rota
  const activeSection = routeToSection[location.pathname] || 'painel';

  // Verificar se usuário está bloqueado (assinatura expirada ou pendente)
  const isBlocked = user && subscription && isSubscriptionExpired();

  // Redirecionar para assinatura se bloqueado e tentando acessar seção restrita
  useEffect(() => {
    if (isBlocked && !ALLOWED_SECTIONS_WHEN_BLOCKED.includes(activeSection)) {
      navigate('/assinatura', { replace: true });
    }
  }, [isBlocked, activeSection, navigate]);

  // Bloquear navegação para seções empresariais se dashboard é pessoal
  useEffect(() => {
    if (currentDashboard?.type === 'personal' && ['equipe', 'fechamento'].includes(activeSection)) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentDashboard, activeSection, navigate]);

  // Função para navegar entre seções
  const handleSectionChange = (section: string) => {
    // Bloquear se assinatura expirada (exceto seções permitidas)
    if (isBlocked && !ALLOWED_SECTIONS_WHEN_BLOCKED.includes(section)) {
      return;
    }

    // Bloquear seções empresariais para dashboard pessoal
    if (currentDashboard?.type === 'personal' && ['equipe', 'fechamento'].includes(section)) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const route = sectionToRoute[section] || '/dashboard';
    navigate(route);
  };

  // Listener para navegação customizada dos agentes
  useEffect(() => {
    const handleNavigateToSection = (event: CustomEvent<string>) => {
      const targetSection = event.detail;
      
      if (isBlocked && !ALLOWED_SECTIONS_WHEN_BLOCKED.includes(targetSection)) {
        return;
      }
      
      const route = sectionToRoute[targetSection] || '/dashboard';
      navigate(route);
    };

    window.addEventListener('navigate-to-section', handleNavigateToSection as EventListener);
    
    return () => {
      window.removeEventListener('navigate-to-section', handleNavigateToSection as EventListener);
    };
  }, [isBlocked, navigate]);

  // Loading state
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

  // Mostrar loading screen apenas para usuários autenticados
  if (showLoading && user) {
    return <LoadingScreen onComplete={() => setShowLoading(false)} />;
  }

  // Mostrar onboarding para novos usuários
  if (user && !isOnboardingComplete) {
    return <OnboardingFlow onComplete={completeOnboarding} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <SidebarProvider defaultOpen={false}>
        <div className="flex w-full">
          <AppSidebar
            activeSection={activeSection}
            setActiveSection={handleSectionChange}
            disabled={isBlocked}
          />
          <div className="flex-1 flex flex-col min-w-0">
            <div className="lg:hidden">
              <MobileSidebar
                activeSection={activeSection}
                setActiveSection={handleSectionChange}
                disabled={isBlocked}
              />
            </div>
            {isBlocked && <SubscriptionBanners />}
            <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
              <Outlet />
            </main>
            <Footer />
          </div>
        </div>
      </SidebarProvider>
      <FloatingWhatsAppButton />
    </div>
  );
};
