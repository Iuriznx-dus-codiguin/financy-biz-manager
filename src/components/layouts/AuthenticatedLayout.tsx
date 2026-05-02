import { useEffect, useState } from 'react';
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
import {
  ROUTE_TO_SECTION,
  SECTION_TO_ROUTE,
  ALLOWED_SECTIONS_WHEN_BLOCKED,
  BUSINESS_ONLY_SECTIONS,
  isSectionAllowedWhenBlocked,
  isBusinessOnlySection,
  getRouteForSection,
  getSectionForRoute,
} from '@/constants/routes';

export const AuthenticatedLayout = () => {
  const { user, loading: authLoading } = useAuth();
  const { isOnboardingComplete, completeOnboarding, loading: onboardingLoading } = useOnboarding();
  const { subscription, isSubscriptionExpired, loading: subscriptionLoading } = useUserSubscription();
  const { currentDashboard } = useDashboard();
  const [showLoading, setShowLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  usePaymentSuccess();

  const activeSection = getSectionForRoute(location.pathname);
  const isBlocked = user && subscription && (
    isSubscriptionExpired() ||
    !subscription.subscription_type ||
    subscription.status === 'pending_payment' ||
    subscription.status === 'cancelled'
  );

  // Redirecionar para assinatura se bloqueado e tentando acessar seção restrita
  useEffect(() => {
    if (!subscriptionLoading && user && isBlocked && !isSectionAllowedWhenBlocked(activeSection)) {
      navigate('/assinatura', { replace: true });
    }
  }, [isBlocked, activeSection, navigate, subscriptionLoading, user]);

  // Garantir gating após carregamento completo (auth + onboarding + subscription)
  useEffect(() => {
    if (!authLoading && !onboardingLoading && !subscriptionLoading && user && isOnboardingComplete) {
      if (isBlocked && !isSectionAllowedWhenBlocked(activeSection)) {
        navigate('/assinatura', { replace: true });
      }
    }
  }, [authLoading, onboardingLoading, subscriptionLoading, user, isOnboardingComplete, isBlocked, activeSection, navigate]);

  // Bloquear navegação para seções empresariais se dashboard é pessoal
  useEffect(() => {
    if (currentDashboard?.type === 'personal' && isBusinessOnlySection(activeSection)) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentDashboard, activeSection, navigate]);

  const handleSectionChange = (section: string) => {
    if (isBlocked && !isSectionAllowedWhenBlocked(section)) return;
    if (currentDashboard?.type === 'personal' && isBusinessOnlySection(section)) {
      navigate('/dashboard', { replace: true });
      return;
    }
    navigate(getRouteForSection(section));
  };

  // Listener para navegação customizada dos agentes
  useEffect(() => {
    const handleNavigateToSection = (event: CustomEvent<string>) => {
      const targetSection = event.detail;
      if (isBlocked && !isSectionAllowedWhenBlocked(targetSection)) return;
      navigate(getRouteForSection(targetSection));
    };

    window.addEventListener('navigate-to-section', handleNavigateToSection as EventListener);
    return () => {
      window.removeEventListener('navigate-to-section', handleNavigateToSection as EventListener);
    };
  }, [isBlocked, navigate]);

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

  if (showLoading && user) {
    return <LoadingScreen onComplete={() => setShowLoading(false)} />;
  }

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
            {activeSection === 'agentes-ia' ? (
              <main className="flex-1 overflow-hidden h-[calc(100dvh-3.5rem)] lg:h-screen">
                <Outlet />
              </main>
            ) : (
              <>
                <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
                  <Outlet />
                </main>
                <Footer />
              </>
            )}
          </div>
        </div>
      </SidebarProvider>
      <FloatingWhatsAppButton />
    </div>
  );
};
