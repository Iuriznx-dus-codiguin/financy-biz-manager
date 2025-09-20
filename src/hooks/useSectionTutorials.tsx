import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SectionTutorialsContextType {
  shouldShowTutorial: (section: string) => boolean;
  markTutorialAsViewed: (section: string) => Promise<void>;
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
  const [viewedTutorials, setViewedTutorials] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadViewedTutorials();
  }, [user]);

  const loadViewedTutorials = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('section_tutorials')
        .select('section_name')
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao carregar tutoriais visualizados:', error);
      } else {
        setViewedTutorials(data?.map(item => item.section_name) || []);
      }
    } catch (error) {
      console.error('Erro ao carregar tutoriais:', error);
    } finally {
      setLoading(false);
    }
  };

  const shouldShowTutorial = (section: string) => {
    return !viewedTutorials.includes(section) && TUTORIAL_SECTIONS.includes(section);
  };

  const markTutorialAsViewed = async (section: string) => {
    if (!user || viewedTutorials.includes(section)) return;

    try {
      const { error } = await supabase
        .from('section_tutorials')
        .insert({
          user_id: user.id,
          section_name: section,
          viewed_at: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao marcar tutorial como visualizado:', error);
      } else {
        setViewedTutorials(prev => [...prev, section]);
      }
    } catch (error) {
      console.error('Erro ao salvar tutorial:', error);
    }
  };

  const resetTutorials = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('section_tutorials')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao resetar tutoriais:', error);
      } else {
        setViewedTutorials([]);
      }
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