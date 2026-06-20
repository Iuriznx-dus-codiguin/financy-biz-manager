import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getTourSteps, TourId, TourStep, TourContext as TourCtx } from '@/config/tourSteps';
import { useIsBelowLg, isBelowLgNow } from './use-mobile';
import { useDashboard } from './useDashboard';
import { useFeatureAccess } from './useFeatureAccess';


interface ProductTourContextType {
  isActive: boolean;
  currentTourId: TourId | null;
  currentStep: number;
  currentStepData: TourStep | null;
  totalSteps: number;
  progress: number;
  next: () => void;
  prev: () => void;
  skip: () => void;
  complete: () => void;
  startTour: (tourId: TourId) => void;
  hasTourBeenSeen: (tourId: TourId) => boolean;
  loading: boolean;
}

const ProductTourContext = createContext<ProductTourContextType | undefined>(undefined);

// Escopo de "tour visto" por contexto (usuário + tipo de dashboard).
// O tour 'general' é único por usuário; tours de seção variam por contexto pessoal/empresarial.
const scopeKey = (tourId: TourId, dashboardType: 'personal' | 'business' | null | undefined): string => {
  if (tourId === 'general') return tourId;
  const prefix = dashboardType === 'business' ? 'business' : dashboardType === 'personal' ? 'personal' : 'global';
  return `${prefix}:${tourId}`;
};

export const ProductTourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isMobile = useIsBelowLg();
  const { currentDashboard } = useDashboard();
  const { isFeatureAvailable } = useFeatureAccess();
  const [seenTours, setSeenTours] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [currentTourId, setCurrentTourId] = useState<TourId | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const persistingRef = useRef(false);

  const tourCtx: TourCtx = useMemo(() => ({
    hasAdvancedIA: isFeatureAvailable('inteligencia_avancada'),
    hasBasicIA: isFeatureAvailable('inteligencia_basica'),
    hasMultiDashboard: isFeatureAvailable('multi_dashboard'),
  }), [isFeatureAvailable]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from('section_tutorials')
          .select('section_name')
          .eq('user_id', user.id);
        if (data) setSeenTours(new Set(data.map((r) => r.section_name)));
      } catch (e) {
        console.error('[ProductTour] erro ao carregar:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const persistSeen = useCallback(
    async (tourId: TourId, skipped: boolean) => {
      if (!user || persistingRef.current) return;
      persistingRef.current = true;
      const key = scopeKey(tourId, currentDashboard?.type);
      setSeenTours((prev) => new Set(prev).add(key));
      try {
        await supabase.from('section_tutorials').upsert(
          {
            user_id: user.id,
            section_name: key,
            viewed_at: new Date().toISOString(),
            last_viewed: new Date().toISOString(),
            skipped,
            progress: 100,
          },
          { onConflict: 'user_id,section_name' }
        );
      } catch (e) {
        console.error('[ProductTour] erro ao persistir:', e);
      } finally {
        persistingRef.current = false;
      }
    },
    [user, currentDashboard]
  );

  const startTour = useCallback((tourId: TourId) => {
    const mobileNow = isBelowLgNow();
    const steps = getTourSteps(tourId, mobileNow, tourCtx);
    if (!steps.length) return;
    setCurrentTourId(tourId);
    setCurrentStep(0);
  }, [tourCtx]);

  const hasTourBeenSeen = useCallback(
    (tourId: TourId) => {
      const key = scopeKey(tourId, currentDashboard?.type);
      // Compatibilidade retro: rows antigas usavam apenas o tourId puro.
      return seenTours.has(key) || seenTours.has(tourId);
    },
    [seenTours, currentDashboard]
  );

  const close = useCallback(() => {
    setCurrentTourId(null);
    setCurrentStep(0);
  }, []);

  const next = useCallback(() => {
    if (!currentTourId) return;
    const steps = getTourSteps(currentTourId, isMobile, tourCtx);
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      persistSeen(currentTourId, false);
      close();
    }
  }, [currentTourId, currentStep, persistSeen, close, isMobile, tourCtx]);

  const prev = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const skip = useCallback(() => {
    if (currentTourId) persistSeen(currentTourId, true);
    close();
  }, [currentTourId, persistSeen, close]);

  const complete = useCallback(() => {
    if (currentTourId) persistSeen(currentTourId, false);
    close();
  }, [currentTourId, persistSeen, close]);

  useEffect(() => {
    if (!currentTourId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentTourId, next, prev, skip]);

  const steps = currentTourId ? getTourSteps(currentTourId, isMobile, tourCtx) : [];
  const currentStepData = steps[currentStep] || null;

  return (
    <ProductTourContext.Provider
      value={{
        isActive: !!currentTourId,
        currentTourId,
        currentStep,
        currentStepData,
        totalSteps: steps.length,
        progress: steps.length ? ((currentStep + 1) / steps.length) * 100 : 0,
        next,
        prev,
        skip,
        complete,
        startTour,
        hasTourBeenSeen,
        loading,
      }}
    >
      {children}
    </ProductTourContext.Provider>
  );
};

export const useProductTour = () => {
  const ctx = useContext(ProductTourContext);
  if (!ctx) throw new Error('useProductTour must be used within ProductTourProvider');
  return ctx;
};
