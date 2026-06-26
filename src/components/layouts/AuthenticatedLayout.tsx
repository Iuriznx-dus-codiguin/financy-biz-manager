import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
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
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { ProductTour } from '@/components/onboarding/ProductTour';
import { celebrate } from '@/utils/celebration';
import {
  isSectionAllowedWhenBlocked,
  isBusinessOnlySection,
  getRouteForSection,
  getSectionForRoute,
} from '@/constants/routes';

const CELEBRATE_FLAG = 'financy-onboarding-celebrate';

export const AuthenticatedLayout = () => {
  const { user, loading: authLoading } = useAuth();
  const { isOnboardingComplete, completeOnboarding, loading: onboardingLoading } = useOnboarding();
  const { isBlocked: isSubscriptionBlocked, loading: subscriptionLoading } = useUserSubscription();
  const { currentDashboard } = useDashboard();
  const navigate = useNavigate();
  const location = useLocation();

  usePaymentSuccess();

  const activeSection = getSectionForRoute(location.pathname);
  const isBlocked = !!user && isSubscriptionBlocked();

  // Bloquear navegação para seções empresariais se dashboard é pessoal
  useEffect(() => {
    if (currentDashboard?.type === 'personal' && isBusinessOnlySection(activeSection)) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentDashboard, activeSection, navigate]);

  // Confetes pós-onboarding: a página já atualizou; agora soltamos o efeito
  // de forma equilibrada — duas rajadas laterais simétricas, dispara uma única vez.
  useEffect(() => {
    if (authLoading || onboardingLoading) return;
    if (!isOnboardingComplete) return;
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(CELEBRATE_FLAG) !== '1') return;

    sessionStorage.removeItem(CELEBRATE_FLAG);
    celebrate({ dedupeKey: `onboarding:${user?.id ?? 'anon'}`, delay: 240 });
  }, [authLoading, onboardingLoading, isOnboardingComplete, user?.id]);

  const handleSectionChange = (section: string) => {
    if (isBlocked && !isSectionAllowedWhenBlocked(section)) return;
    if (currentDashboard?.type === 'personal' && isBusinessOnlySection(section)) {
      navigate('/dashboard', { replace: true });
      return;
    }
    navigate(getRouteForSection(section));
  };

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

  if (user && !isOnboardingComplete) {
    return <OnboardingFlow onComplete={completeOnboarding} />;
  }

  // Gating render-time: bloqueia o flash de UI antes do redirect via useEffect
  if (isBlocked && !isSectionAllowedWhenBlocked(activeSection)) {
    return <Navigate to="/assinatura" replace />;
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
      <ProductTour />
    </div>
  );
};
