import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface TutorialProgress {
  section: string;
  current_step: number;
  completed: boolean;
  skipped: boolean;
}

export const useInteractiveTutorial = (section: string) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // Carregar progresso
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadProgress();
  }, [user, section]);

  const loadProgress = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('section_tutorials')
        .select('*')
        .eq('user_id', user.id)
        .eq('section_name', section)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar progresso do tutorial:', error);
      }

      if (data) {
        setCurrentStep(data.progress || 0);
        setCompletedSteps(data.viewed_at ? [section] : []);
      }
    } catch (error) {
      console.error('Erro ao carregar progresso:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = useCallback(async (stepIndex: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('section_tutorials')
        .upsert({
          user_id: user.id,
          section_name: section,
          progress: stepIndex,
          last_viewed: new Date().toISOString()
        }, {
          onConflict: 'user_id,section_name'
        });

      if (error) {
        console.error('Erro ao salvar progresso:', error);
      }
    } catch (error) {
      console.error('Erro ao salvar progresso:', error);
    }
  }, [user, section]);

  const startTutorial = useCallback(() => {
    setIsActive(true);
    setCurrentStep(0);
  }, []);

  const endTutorial = useCallback(async (completed: boolean) => {
    setIsActive(false);
    
    if (!user) return;

    try {
      if (completed) {
        // Marcar como completado
        await supabase
          .from('section_tutorials')
          .upsert({
            user_id: user.id,
            section_name: section,
            progress: 0,
            viewed_at: new Date().toISOString(),
            skipped: false
          }, {
            onConflict: 'user_id,section_name'
          });
        setCompletedSteps([...completedSteps, section]);
      } else {
        // Marcar como pulado
        await supabase
          .from('section_tutorials')
          .upsert({
            user_id: user.id,
            section_name: section,
            progress: currentStep,
            skipped: true,
            last_viewed: new Date().toISOString()
          }, {
            onConflict: 'user_id,section_name'
          });
      }
    } catch (error) {
      console.error('Erro ao finalizar tutorial:', error);
    }
  }, [user, section, currentStep, completedSteps]);

  const nextStep = useCallback((totalSteps: number) => {
    const newStep = currentStep + 1;
    setCurrentStep(newStep);
    saveProgress(newStep);
    
    if (newStep >= totalSteps) {
      endTutorial(true);
    }
  }, [currentStep, saveProgress, endTutorial]);

  const previousStep = useCallback(() => {
    const newStep = Math.max(0, currentStep - 1);
    setCurrentStep(newStep);
    saveProgress(newStep);
  }, [currentStep, saveProgress]);

  const skipTutorial = useCallback(() => {
    endTutorial(false);
  }, [endTutorial]);

  const restartTutorial = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('section_tutorials')
        .delete()
        .eq('user_id', user.id)
        .eq('section_name', section);

      setCurrentStep(0);
      setCompletedSteps(completedSteps.filter(s => s !== section));
      setIsActive(true);
    } catch (error) {
      console.error('Erro ao reiniciar tutorial:', error);
    }
  }, [user, section, completedSteps]);

  return {
    currentStep,
    isActive,
    loading,
    completedSteps,
    startTutorial,
    endTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    saveProgress,
    restartTutorial
  };
};
