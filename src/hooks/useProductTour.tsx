import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getTourSteps, TourId, TourStep } from '@/config/tourSteps';
import { useIsMobile } from './use-mobile';


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

export const ProductTourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [seenTours, setSeenTours] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [currentTourId, setCurrentTourId] = useState<TourId | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const persistingRef = useRef(false);

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
      setSeenTours((prev) => new Set(prev).add(tourId));
      try {
        await supabase.from('section_tutorials').upsert(
          {
            user_id: user.id,
            section_name: tourId,
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
    [user]
  );

  const startTour = useCallback((tourId: TourId) => {
    const steps = getTourSteps(tourId);
    if (!steps.length) return;
    setCurrentTourId(tourId);
    setCurrentStep(0);
  }, []);

  const hasTourBeenSeen = useCallback((tourId: TourId) => seenTours.has(tourId), [seenTours]);

  const close = useCallback(() => {
    setCurrentTourId(null);
    setCurrentStep(0);
  }, []);

  const next = useCallback(() => {
    if (!currentTourId) return;
    const steps = getTourSteps(currentTourId);
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      persistSeen(currentTourId, false);
      close();
    }
  }, [currentTourId, currentStep, persistSeen, close]);

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

  // Keyboard
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

  const steps = currentTourId ? getTourSteps(currentTourId) : [];
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
