
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Configuracoes {
  tema: 'light' | 'dark';
  moeda: string;
  idioma: string;
  notificacoes: boolean;
}

interface AppContextType {
  configuracoes: Configuracoes;
  updateConfiguracoes: (novasConfiguracoes: Partial<Configuracoes>) => void;
}

const defaultConfiguracoes: Configuracoes = {
  tema: 'light',
  moeda: 'BRL',
  idioma: 'pt',
  notificacoes: true,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [configuracoes, setConfiguracoes] = useState<Configuracoes>(defaultConfiguracoes);

  // Carregar configurações salvas
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('financy-configuracoes');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfiguracoes({ ...defaultConfiguracoes, ...parsed });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }, []);

  // Aplicar tema no documento
  useEffect(() => {
    const applyTheme = (theme: 'light' | 'dark') => {
      try {
        const root = document.documentElement;
        const body = document.body;
        
        // Remove classes existentes
        root.classList.remove('light', 'dark');
        body.classList.remove('light', 'dark');
        
        // Adiciona nova classe
        root.classList.add(theme);
        body.classList.add(theme);
        
        // Define atributo data-theme
        root.setAttribute('data-theme', theme);
        
        console.log('Tema aplicado:', theme);
      } catch (error) {
        console.error('Erro ao aplicar tema:', error);
      }
    };

    applyTheme(configuracoes.tema);
  }, [configuracoes.tema]);

  const updateConfiguracoes = (novasConfiguracoes: Partial<Configuracoes>) => {
    try {
      const configuracoesAtualizadas = { ...configuracoes, ...novasConfiguracoes };
      setConfiguracoes(configuracoesAtualizadas);
      
      // Salvar no localStorage
      localStorage.setItem('financy-configuracoes', JSON.stringify(configuracoesAtualizadas));
      
      console.log('Configurações atualizadas:', configuracoesAtualizadas);
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
    }
  };

  const contextValue: AppContextType = {
    configuracoes,
    updateConfiguracoes
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext deve ser usado dentro de um AppProvider');
  }
  return context;
};
