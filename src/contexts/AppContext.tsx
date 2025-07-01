import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Receita {
  id: number;
  data: string;
  descricao: string;
  categoria: string;
  valor: number;
  user_id?: string;
}

interface Despesa {
  id: number;
  data: string;
  descricao: string;
  categoria: string;
  fornecedor: string;
  valor: number;
  formaPagamento: string;
  user_id?: string;
}

interface Imposto {
  id: number;
  data: string;
  descricao: string;
  valor: number;
  pago: boolean;
  user_id?: string;
}

interface Configuracoes {
  tema: 'light' | 'dark';
}

interface AppContextType {
  receitas: Receita[];
  despesas: Despesa[];
  impostos: Imposto[];
  configuracoes: Configuracoes;
  addReceita: (receita: Omit<Receita, 'id'>) => Promise<void>;
  addDespesa: (despesa: Omit<Despesa, 'id'>) => Promise<void>;
  addImposto: (imposto: Omit<Imposto, 'id'>) => Promise<void>;
  removeReceita: (id: number) => Promise<void>;
  removeDespesa: (id: number) => Promise<void>;
  removeImposto: (id: number) => Promise<void>;
  updateConfiguracoes: (config: Partial<Configuracoes>) => void;
  zerarSaldo: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [impostos, setImpostos] = useState<Imposto[]>([]);
  const [configuracoes, setConfiguracoes] = useState<Configuracoes>({ tema: 'light' });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: receitasData, error: receitasError } = await supabase
        .from('receitas')
        .select('*')
        .eq('user_id', user.id)
        .order('data', { ascending: false });

      if (receitasError) throw receitasError;
      if (receitasData) setReceitas(receitasData);

      const { data: despesasData, error: despesasError } = await supabase
        .from('despesas')
        .select('*')
        .eq('user_id', user.id)
        .order('data', { ascending: false });

      if (despesasError) throw despesasError;
      if (despesasData) setDespesas(despesasData);

      const { data: impostosData, error: impostosError } = await supabase
        .from('impostos')
        .select('*')
        .eq('user_id', user.id)
        .order('data', { ascending: false });

      if (impostosError) throw impostosError;
      if (impostosData) setImpostos(impostosData);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  };

  const addReceita = async (receita: Omit<Receita, 'id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('receitas')
        .insert([{ ...receita, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setReceitas(prev => [...prev, data]);
      toast.success('Receita adicionada com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar receita:', error);
      toast.error('Erro ao adicionar receita');
    }
  };

  const addDespesa = async (despesa: Omit<Despesa, 'id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('despesas')
        .insert([{ ...despesa, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setDespesas(prev => [...prev, data]);
      toast.success('Despesa adicionada com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
      toast.error('Despesa adicionada com sucesso!');
    }
  };

  const addImposto = async (imposto: Omit<Imposto, 'id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('impostos')
        .insert([{ ...imposto, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setImpostos(prev => [...prev, data]);
      toast.success('Imposto adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar imposto:', error);
      toast.error('Imposto adicionado com sucesso!');
    }
  };

  const removeReceita = async (id: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('receitas')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setReceitas(prev => prev.filter(r => r.id !== id));
      toast.success('Receita removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover receita:', error);
      toast.error('Erro ao remover receita');
    }
  };

  const removeDespesa = async (id: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('despesas')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setDespesas(prev => prev.filter(d => d.id !== id));
      toast.success('Despesa removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover despesa:', error);
      toast.error('Erro ao remover despesa');
    }
  };

  const removeImposto = async (id: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('impostos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setImpostos(prev => prev.filter(i => i.id !== id));
      toast.success('Imposto removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover imposto:', error);
      toast.error('Erro ao remover imposto');
    }
  };

  const updateConfiguracoes = (config: Partial<Configuracoes>) => {
    setConfiguracoes(prev => ({ ...prev, ...config }));
  };

  const zerarSaldo = () => {
    setReceitas([]);
    setDespesas([]);
    setImpostos([]);
    toast.success('Saldo zerado com sucesso!');
  };

  const value: AppContextType = {
    receitas,
    despesas,
    impostos,
    configuracoes,
    addReceita,
    addDespesa,
    addImposto,
    removeReceita,
    removeDespesa,
    removeImposto,
    updateConfiguracoes,
    zerarSaldo
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
