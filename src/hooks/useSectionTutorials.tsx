import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SectionTutorialsContextType {
  shouldShowTutorial: (section: string) => boolean;
  markTutorialAsViewed: (section: string, completed?: boolean) => Promise<void>;
  resetTutorials: () => Promise<void>;
  loading: boolean;
}

const SectionTutorialsContext = createContext<SectionTutorialsContextType | undefined>(undefined);

const TUTORIAL_SECTIONS = [
  'painel',
  'receitas', 
  'despesas',
  'categorias',
  'impostos',
  'equipe',
  'metas',
  'relatorios',
  'fechamento'
];

export const SectionTutorialsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);
  const [skippedTutorials, setSkippedTutorials] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTutorialStatus();
  }, [user]);

  const loadTutorialStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Carregar do banco de dados
      const { data, error } = await supabase
        .from('section_tutorials')
        .select('section_name')
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao carregar tutoriais do banco:', error);
        // Fallback para localStorage
        loadFromLocalStorage();
        return;
      }

      if (data) {
        setCompletedTutorials(data.map(item => item.section_name));
      }

      // Carregar tutoriais pulados do localStorage (temporário para esta sessão)
      const skippedKey = `skipped_tutorials_${user.id}`;
      const storedSkipped = localStorage.getItem(skippedKey);
      if (storedSkipped) {
        setSkippedTutorials(JSON.parse(storedSkipped));
      }
    } catch (error) {
      console.error('Erro ao carregar status dos tutoriais:', error);
      loadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  const loadFromLocalStorage = () => {
    const storageKey = `section_tutorials_${user.id}`;
    const storedTutorials = localStorage.getItem(storageKey);
    
    if (storedTutorials) {
      setCompletedTutorials(JSON.parse(storedTutorials));
    }
  };

  const shouldShowTutorial = (section: string) => {
    // Não mostrar se já foi completado
    if (completedTutorials.includes(section)) return false;
    
    // Não mostrar se foi pulado (permanentemente)
    if (skippedTutorials.includes(section)) return false;
    
    // Mostrar apenas se está na lista de seções válidas
    return TUTORIAL_SECTIONS.includes(section);
  };

  const markTutorialAsViewed = async (section: string, completed: boolean = true) => {
    if (!user) return;

    try {
      if (completed) {
        // Marcar como completado permanentemente
        const { error } = await supabase
          .from('section_tutorials')
          .upsert({
            user_id: user.id,
            section_name: section,
            viewed_at: new Date().toISOString(),
            skipped: false,
            progress: 0
          }, {
            onConflict: 'user_id,section_name'
          });

        if (error) {
          console.error('Erro ao salvar tutorial no banco:', error);
          // Fallback para localStorage
          const storageKey = `section_tutorials_${user.id}`;
          const newCompletedTutorials = [...completedTutorials, section];
          localStorage.setItem(storageKey, JSON.stringify(newCompletedTutorials));
          setCompletedTutorials(newCompletedTutorials);
        } else {
          setCompletedTutorials(prev => [...prev, section]);
        }

        // Remover dos pulados se estava lá
        const newSkippedTutorials = skippedTutorials.filter(s => s !== section);
        setSkippedTutorials(newSkippedTutorials);
        const skippedKey = `skipped_tutorials_${user.id}`;
        localStorage.setItem(skippedKey, JSON.stringify(newSkippedTutorials));
      } else {
        // Marcar como pulado PERMANENTEMENTE
        const { error } = await supabase
          .from('section_tutorials')
          .upsert({
            user_id: user.id,
            section_name: section,
            skipped: true,
            last_viewed: new Date().toISOString()
          }, {
            onConflict: 'user_id,section_name'
          });

        if (error) {
          console.error('Erro ao marcar como pulado:', error);
        }

        const newSkippedTutorials = [...skippedTutorials, section];
        setSkippedTutorials(newSkippedTutorials);
        
        const skippedKey = `skipped_tutorials_${user.id}`;
        localStorage.setItem(skippedKey, JSON.stringify(newSkippedTutorials));
      }
    } catch (error) {
      console.error('Erro ao salvar status do tutorial:', error);
    }
  };

  const resetTutorials = async () => {
    if (!user) return;

    try {
      // Remover do banco de dados
      await supabase
        .from('section_tutorials')
        .delete()
        .eq('user_id', user.id);

      // Remover do localStorage
      const storageKey = `section_tutorials_${user.id}`;
      const skippedKey = `skipped_tutorials_${user.id}`;
      localStorage.removeItem(storageKey);
      localStorage.removeItem(skippedKey);
      
      setCompletedTutorials([]);
      setSkippedTutorials([]);
    } catch (error) {
      console.error('Erro ao resetar tutoriais:', error);
    }
  };

  return (
    <SectionTutorialsContext.Provider value={{
      shouldShowTutorial,
      markTutorialAsViewed,
      resetTutorials,
      loading
    }}>
      {children}
    </SectionTutorialsContext.Provider>
  );
};

export const useSectionTutorials = () => {
  const context = useContext(SectionTutorialsContext);
  if (context === undefined) {
    throw new Error('useSectionTutorials must be used within a SectionTutorialsProvider');
  }
  return context;
};