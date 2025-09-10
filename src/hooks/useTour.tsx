import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TourStep {
  id: string;
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
}

interface Tour {
  name: string;
  steps: TourStep[];
  required: boolean;
}

interface TourProgress {
  tourName: string;
  stepCompleted: number;
  completed: boolean;
}

const TOURS: Record<string, Tour> = {
  onboarding: {
    name: 'onboarding',
    required: true,
    steps: [
      {
        id: 'welcome',
        target: '[data-tour="dashboard"]',
        title: '🎉 Bem-vindo ao Financy!',
        content: 'Vamos fazer um tour rápido para você conhecer as principais funcionalidades.',
        position: 'bottom'
      },
      {
        id: 'sidebar',
        target: '[data-tour="sidebar"]',
        title: '📋 Menu Principal',
        content: 'Aqui você encontra todas as seções: Dashboard, Receitas, Despesas, Relatórios e muito mais.',
        position: 'right'
      },
      {
        id: 'receitas',
        target: '[data-tour="receitas-button"]',
        title: '💰 Receitas',
        content: 'Registre suas receitas aqui. Você pode categorizá-las e até criar receitas recorrentes.',
        position: 'bottom'
      },
      {
        id: 'despesas',
        target: '[data-tour="despesas-button"]',
        title: '📊 Despesas',
        content: 'Controle seus gastos registrando todas as despesas por categoria.',
        position: 'bottom'
      },
      {
        id: 'metas',
        target: '[data-tour="metas-button"]',
        title: '🎯 Metas',
        content: 'Defina metas financeiras e acompanhe seu progresso.',
        position: 'bottom'
      },
      {
        id: 'relatorios',
        target: '[data-tour="relatorios-button"]',
        title: '📈 Relatórios',
        content: 'Visualize gráficos e relatórios detalhados das suas finanças.',
        position: 'bottom'
      },
      {
        id: 'complete',
        target: '[data-tour="dashboard"]',
        title: '✅ Tour Concluído!',
        content: 'Agora você está pronto para gerenciar suas finanças com o Financy!',
        position: 'bottom'
      }
    ]
  },
  advanced: {
    name: 'advanced',
    required: false,
    steps: [
      {
        id: 'categories',
        target: '[data-tour="categorias-button"]',
        title: '🏷️ Categorias Personalizadas',
        content: 'Crie suas próprias categorias com cores personalizadas para melhor organização.',
        position: 'bottom'
      },
      {
        id: 'team',
        target: '[data-tour="equipe-button"]',
        title: '👥 Gestão de Equipe',
        content: 'Gerencie sua equipe financeira e controle permissões de acesso.',
        position: 'bottom'
      },
      {
        id: 'ai',
        target: '[data-tour="ia-button"]',
        title: '🤖 Agentes de IA',
        content: 'Use nossos agentes de IA para suporte financeiro, fiscal e contábil.',
        position: 'bottom'
      }
    ]
  }
};

export const useTour = () => {
  const { user } = useAuth();
  const [currentTour, setCurrentTour] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [progress, setProgress] = useState<Record<string, TourProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTourProgress();
    }
  }, [user]);

  const loadTourProgress = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_tour_progress')
        .select('*')
        .eq('user_id', user!.id);

      if (error) throw error;

      const progressMap = (data || []).reduce((acc, item) => {
        acc[item.tour_name] = {
          tourName: item.tour_name,
          stepCompleted: item.step_completed,
          completed: item.completed
        };
        return acc;
      }, {} as Record<string, TourProgress>);

      setProgress(progressMap);

      // Auto-start onboarding tour for new users
      const hasOnboardingProgress = progressMap.onboarding;
      if (!hasOnboardingProgress) {
        setTimeout(() => startTour('onboarding'), 2000);
      }
    } catch (error) {
      console.error('Erro ao carregar progresso do tour:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTourProgress = async (tourName: string, stepCompleted: number, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('user_tour_progress')
        .upsert({
          user_id: user!.id,
          tour_name: tourName,
          step_completed: stepCompleted,
          completed
        }, {
          onConflict: 'user_id,tour_name'
        });

      if (error) throw error;

      setProgress(prev => ({
        ...prev,
        [tourName]: {
          tourName,
          stepCompleted,
          completed
        }
      }));
    } catch (error) {
      console.error('Erro ao salvar progresso do tour:', error);
    }
  };

  const startTour = useCallback((tourName: string) => {
    if (!TOURS[tourName]) return;
    
    const tourProgress = progress[tourName];
    const startStep = tourProgress?.completed ? 0 : (tourProgress?.stepCompleted || 0);
    
    setCurrentTour(tourName);
    setCurrentStep(startStep);
    setIsActive(true);
  }, [progress]);

  const nextStep = useCallback(async () => {
    if (!currentTour) return;
    
    const tour = TOURS[currentTour];
    const nextStepIndex = currentStep + 1;
    
    if (nextStepIndex >= tour.steps.length) {
      // Tour completed
      await completeTour();
    } else {
      setCurrentStep(nextStepIndex);
      await saveTourProgress(currentTour, nextStepIndex, false);
    }
  }, [currentTour, currentStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const skipTour = useCallback(async () => {
    if (!currentTour) return;
    
    await saveTourProgress(currentTour, TOURS[currentTour].steps.length, true);
    setIsActive(false);
    setCurrentTour(null);
    setCurrentStep(0);
  }, [currentTour]);

  const completeTour = useCallback(async () => {
    if (!currentTour) return;
    
    await saveTourProgress(currentTour, TOURS[currentTour].steps.length, true);
    setIsActive(false);
    setCurrentTour(null);
    setCurrentStep(0);
  }, [currentTour]);

  const resetTour = async (tourName: string) => {
    try {
      await supabase
        .from('user_tour_progress')
        .delete()
        .eq('user_id', user!.id)
        .eq('tour_name', tourName);

      setProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[tourName];
        return newProgress;
      });
    } catch (error) {
      console.error('Erro ao resetar tour:', error);
    }
  };

  const getCurrentTourData = useCallback(() => {
    if (!currentTour || !isActive) return null;
    
    const tour = TOURS[currentTour];
    const step = tour.steps[currentStep];
    
    return {
      tour,
      step,
      stepIndex: currentStep,
      totalSteps: tour.steps.length,
      isFirst: currentStep === 0,
      isLast: currentStep === tour.steps.length - 1
    };
  }, [currentTour, currentStep, isActive]);

  return {
    isActive,
    currentTour,
    currentStep,
    progress,
    loading,
    tours: TOURS,
    startTour,
    nextStep,
    previousStep,
    skipTour,
    completeTour,
    resetTour,
    getCurrentTourData
  };
};