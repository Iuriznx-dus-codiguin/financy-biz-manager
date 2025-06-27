
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Receita {
  id: number;
  data: string;
  descricao: string;
  categoria: string;
  cliente: string;
  valor: number;
  formaPagamento: string;
}

interface Despesa {
  id: number;
  data: string;
  descricao: string;
  categoria: string;
  fornecedor: string;
  valor: number;
  formaPagamento: string;
}

interface Imposto {
  id: number;
  tipo: string;
  descricao: string;
  valor: number;
  vencimento: string;
  pago: boolean;
}

interface AppContextType {
  receitas: Receita[];
  despesas: Despesa[];
  impostos: Imposto[];
  addReceita: (receita: Omit<Receita, 'id'>) => void;
  addDespesa: (despesa: Omit<Despesa, 'id'>) => void;
  addImposto: (imposto: Omit<Imposto, 'id'>) => void;
  updateImposto: (id: number, updates: Partial<Imposto>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [impostos, setImpostos] = useState<Imposto[]>([]);

  const addReceita = (receita: Omit<Receita, 'id'>) => {
    const newReceita = { ...receita, id: Date.now() };
    setReceitas(prev => [...prev, newReceita]);
  };

  const addDespesa = (despesa: Omit<Despesa, 'id'>) => {
    const newDespesa = { ...despesa, id: Date.now() };
    setDespesas(prev => [...prev, newDespesa]);
  };

  const addImposto = (imposto: Omit<Imposto, 'id'>) => {
    const newImposto = { ...imposto, id: Date.now() };
    setImpostos(prev => [...prev, newImposto]);
  };

  const updateImposto = (id: number, updates: Partial<Imposto>) => {
    setImpostos(prev => prev.map(imposto => 
      imposto.id === id ? { ...imposto, ...updates } : imposto
    ));
  };

  return (
    <AppContext.Provider value={{
      receitas,
      despesas,
      impostos,
      addReceita,
      addDespesa,
      addImposto,
      updateImposto
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
