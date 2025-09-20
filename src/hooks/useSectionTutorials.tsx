import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './useAuth';

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
      // Usar localStorage como backup enquanto a migração não é aplicada
      const storageKey = `section_tutorials_${user.id}`;
      const storedTutorials = localStorage.getItem(storageKey);
      
      if (storedTutorials) {
        setViewedTutorials(JSON.parse(storedTutorials));
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
      const storageKey = `section_tutorials_${user.id}`;
      const newViewedTutorials = [...viewedTutorials, section];
      
      // Salvar no localStorage
      localStorage.setItem(storageKey, JSON.stringify(newViewedTutorials));
      setViewedTutorials(newViewedTutorials);
    } catch (error) {
      console.error('Erro ao salvar tutorial:', error);
    }
  };

  const resetTutorials = async () => {
    if (!user) return;

    try {
      const storageKey = `section_tutorials_${user.id}`;
      localStorage.removeItem(storageKey);
      setViewedTutorials([]);
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