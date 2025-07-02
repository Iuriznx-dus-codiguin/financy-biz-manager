
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface Configuracoes {
  tema: 'light' | 'dark';
  moeda: string;
  idioma: string;
  notificacoes: boolean;
}

export interface Receita {
  id: number;
  data: string;
  descricao: string;
  categoria: string;
  cliente: string;
  valor: number;
  formaPagamento: string;
}

export interface Despesa {
  id: number;
  data: string;
  descricao: string;
  categoria: string;
  fornecedor: string;
  valor: number;
  formaPagamento: string;
}

export interface Imposto {
  id: number;
  tipo: string;
  descricao: string;
  valor: number;
  vencimento: string;
  pago: boolean;
  recorrente: boolean;
}

export interface MembroEquipe {
  id: number;
  nome: string;
  cargo: string;
  salario: number;
  periodicidade: 'mensal' | 'semanal' | 'quinzenal';
  status: 'ativo' | 'inativo';
  dataAdmissao: string;
}

interface AppContextType {
  configuracoes: Configuracoes;
  updateConfiguracoes: (novasConfiguracoes: Partial<Configuracoes>) => void;
  receitas: Receita[];
  despesas: Despesa[];
  impostos: Imposto[];
  membrosEquipe: MembroEquipe[];
  addReceita: (receita: Omit<Receita, 'id'>) => void;
  addDespesa: (despesa: Omit<Despesa, 'id'>) => void;
  deleteDespesa: (id: number) => Promise<void>;
  addImposto: (imposto: Omit<Imposto, 'id'>) => void;
  updateImposto: (id: number, imposto: Partial<Imposto>) => void;
  addMembroEquipe: (membro: Omit<MembroEquipe, 'id'>) => void;
  updateMembroEquipe: (id: number, membro: Partial<MembroEquipe>) => void;
  deleteMembroEquipe: (id: number) => void;
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
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [impostos, setImpostos] = useState<Imposto[]>([]);
  const [membrosEquipe, setMembrosEquipe] = useState<MembroEquipe[]>([]);
  const { toast } = useToast();

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
        toast({
          title: "Erro",
          description: "Falha ao aplicar tema",
          variant: "destructive",
        });
      }
    };

    applyTheme(configuracoes.tema);
  }, [configuracoes.tema, toast]);

  const updateConfiguracoes = (novasConfiguracoes: Partial<Configuracoes>) => {
    try {
      const configuracoesAtualizadas = { ...configuracoes, ...novasConfiguracoes };
      setConfiguracoes(configuracoesAtualizadas);
      
      // Salvar no localStorage
      localStorage.setItem('financy-configuracoes', JSON.stringify(configuracoesAtualizadas));
      
      console.log('Configurações atualizadas:', configuracoesAtualizadas);
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar configurações",
        variant: "destructive",
      });
    }
  };

  const addReceita = (receita: Omit<Receita, 'id'>) => {
    try {
      const novaReceita = { ...receita, id: Date.now() };
      setReceitas(prev => [...prev, novaReceita]);
      toast({
        title: "Sucesso",
        description: "Receita adicionada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao adicionar receita:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar receita",
        variant: "destructive",
      });
    }
  };

  const addDespesa = (despesa: Omit<Despesa, 'id'>) => {
    try {
      const novaDespesa = { ...despesa, id: Date.now() };
      setDespesas(prev => [...prev, novaDespesa]);
      toast({
        title: "Sucesso",
        description: "Despesa adicionada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar despesa",
        variant: "destructive",
      });
    }
  };

  const deleteDespesa = async (id: number) => {
    try {
      setDespesas(prev => prev.filter(d => d.id !== id));
      toast({
        title: "Sucesso",
        description: "Despesa removida com sucesso",
      });
    } catch (error) {
      console.error('Erro ao deletar despesa:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover despesa",
        variant: "destructive",
      });
    }
  };

  const addImposto = (imposto: Omit<Imposto, 'id'>) => {
    try {
      const novoImposto = { ...imposto, id: Date.now() };
      setImpostos(prev => [...prev, novoImposto]);
      toast({
        title: "Sucesso",
        description: "Imposto adicionado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao adicionar imposto:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar imposto",
        variant: "destructive",
      });
    }
  };

  const updateImposto = (id: number, imposto: Partial<Imposto>) => {
    try {
      setImpostos(prev => prev.map(i => i.id === id ? { ...i, ...imposto } : i));
      toast({
        title: "Sucesso",
        description: "Imposto atualizado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao atualizar imposto:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar imposto",
        variant: "destructive",
      });
    }
  };

  const addMembroEquipe = (membro: Omit<MembroEquipe, 'id'>) => {
    try {
      const novoMembro = { ...membro, id: Date.now() };
      setMembrosEquipe(prev => [...prev, novoMembro]);
      toast({
        title: "Sucesso",
        description: "Membro da equipe adicionado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar membro da equipe",
        variant: "destructive",
      });
    }
  };

  const updateMembroEquipe = (id: number, membro: Partial<MembroEquipe>) => {
    try {
      setMembrosEquipe(prev => prev.map(m => m.id === id ? { ...m, ...membro } : m));
      toast({
        title: "Sucesso",
        description: "Membro da equipe atualizado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao atualizar membro:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar membro da equipe",
        variant: "destructive",
      });
    }
  };

  const deleteMembroEquipe = (id: number) => {
    try {
      setMembrosEquipe(prev => prev.filter(m => m.id !== id));
      toast({
        title: "Sucesso",
        description: "Membro da equipe removido com sucesso",
      });
    } catch (error) {
      console.error('Erro ao deletar membro:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover membro da equipe",
        variant: "destructive",
      });
    }
  };

  const contextValue: AppContextType = {
    configuracoes,
    updateConfiguracoes,
    receitas,
    despesas,
    impostos,
    membrosEquipe,
    addReceita,
    addDespesa,
    deleteDespesa,
    addImposto,
    updateImposto,
    addMembroEquipe,
    updateMembroEquipe,
    deleteMembroEquipe,
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
