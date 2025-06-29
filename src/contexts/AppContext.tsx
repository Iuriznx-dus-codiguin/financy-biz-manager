
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  recorrente: boolean;
}

interface Configuracoes {
  tema: 'light' | 'dark';
  moeda: 'BRL' | 'USD' | 'EUR';
  idioma: 'pt-BR' | 'en-US' | 'es-ES';
}

interface AppContextType {
  receitas: Receita[];
  despesas: Despesa[];
  impostos: Imposto[];
  configuracoes: Configuracoes;
  addReceita: (receita: Omit<Receita, 'id'>) => Promise<void>;
  addDespesa: (despesa: Omit<Despesa, 'id'>) => Promise<void>;
  addImposto: (imposto: Omit<Imposto, 'id'>) => Promise<void>;
  updateImposto: (id: number, updates: Partial<Imposto>) => Promise<void>;
  updateConfiguracoes: (configuracoes: Partial<Configuracoes>) => void;
  zerarSaldo: () => void;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [impostos, setImpostos] = useState<Imposto[]>([]);
  const [loading, setLoading] = useState(false);
  const [configuracoes, setConfiguracoes] = useState<Configuracoes>({
    tema: 'light',
    moeda: 'BRL',
    idioma: 'pt-BR'
  });

  // Aplicar tema quando mudança
  useEffect(() => {
    if (configuracoes.tema === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [configuracoes.tema]);

  // Carregar dados quando usuário estiver autenticado
  useEffect(() => {
    if (user) {
      loadData();
    } else {
      // Limpar dados quando usuário não estiver autenticado
      setReceitas([]);
      setDespesas([]);
      setImpostos([]);
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Carregar receitas
      const { data: receitasData } = await supabase
        .from('receitas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Carregar despesas
      const { data: despesasData } = await supabase
        .from('despesas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Carregar impostos
      const { data: impostosData } = await supabase
        .from('impostos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (receitasData) {
        setReceitas(receitasData.map(r => ({
          id: r.id,
          data: r.data,
          descricao: r.descricao,
          categoria: r.categoria,
          cliente: r.cliente || '',
          valor: parseFloat(r.valor.toString()),
          formaPagamento: r.forma_pagamento
        })));
      }

      if (despesasData) {
        setDespesas(despesasData.map(d => ({
          id: d.id,
          data: d.data,
          descricao: d.descricao,
          categoria: d.categoria,
          fornecedor: d.fornecedor || '',
          valor: parseFloat(d.valor.toString()),
          formaPagamento: d.forma_pagamento
        })));
      }

      if (impostosData) {
        setImpostos(impostosData.map(i => ({
          id: i.id,
          tipo: i.tipo,
          descricao: i.descricao,
          valor: parseFloat(i.valor.toString()),
          vencimento: i.vencimento,
          pago: i.pago,
          recorrente: i.recorrente
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const addReceita = async (receita: Omit<Receita, 'id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('receitas')
        .insert({
          user_id: user.id,
          data: receita.data,
          descricao: receita.descricao,
          categoria: receita.categoria,
          cliente: receita.cliente,
          valor: receita.valor,
          forma_pagamento: receita.formaPagamento
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newReceita = {
          id: data.id,
          data: data.data,
          descricao: data.descricao,
          categoria: data.categoria,
          cliente: data.cliente || '',
          valor: parseFloat(data.valor.toString()),
          formaPagamento: data.forma_pagamento
        };
        setReceitas(prev => [newReceita, ...prev]);
      }
    } catch (error) {
      console.error('Erro ao adicionar receita:', error);
    }
  };

  const addDespesa = async (despesa: Omit<Despesa, 'id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('despesas')
        .insert({
          user_id: user.id,
          data: despesa.data,
          descricao: despesa.descricao,
          categoria: despesa.categoria,
          fornecedor: despesa.fornecedor,
          valor: despesa.valor,
          forma_pagamento: despesa.formaPagamento
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newDespesa = {
          id: data.id,
          data: data.data,
          descricao: data.descricao,
          categoria: data.categoria,
          fornecedor: data.fornecedor || '',
          valor: parseFloat(data.valor.toString()),
          formaPagamento: data.forma_pagamento
        };
        setDespesas(prev => [newDespesa, ...prev]);
      }
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
    }
  };

  const addImposto = async (imposto: Omit<Imposto, 'id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('impostos')
        .insert({
          user_id: user.id,
          tipo: imposto.tipo,
          descricao: imposto.descricao,
          valor: imposto.valor,
          vencimento: imposto.vencimento,
          pago: imposto.pago,
          recorrente: imposto.recorrente
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newImposto = {
          id: data.id,
          tipo: data.tipo,
          descricao: data.descricao,
          valor: parseFloat(data.valor.toString()),
          vencimento: data.vencimento,
          pago: data.pago,
          recorrente: data.recorrente
        };
        setImpostos(prev => [newImposto, ...prev]);
      }
    } catch (error) {
      console.error('Erro ao adicionar imposto:', error);
    }
  };

  const updateImposto = async (id: number, updates: Partial<Imposto>) => {
    if (!user) return;

    try {
      const updateData: any = {};
      
      if (updates.tipo !== undefined) updateData.tipo = updates.tipo;
      if (updates.descricao !== undefined) updateData.descricao = updates.descricao;
      if (updates.valor !== undefined) updateData.valor = updates.valor;
      if (updates.vencimento !== undefined) updateData.vencimento = updates.vencimento;
      if (updates.pago !== undefined) updateData.pago = updates.pago;
      if (updates.recorrente !== undefined) updateData.recorrente = updates.recorrente;

      const { error } = await supabase
        .from('impostos')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setImpostos(prev => prev.map(imposto => 
        imposto.id === id ? { ...imposto, ...updates } : imposto
      ));
    } catch (error) {
      console.error('Erro ao atualizar imposto:', error);
    }
  };

  const updateConfiguracoes = (novasConfiguracoes: Partial<Configuracoes>) => {
    setConfiguracoes(prev => ({ ...prev, ...novasConfiguracoes }));
  };

  const zerarSaldo = () => {
    setReceitas([]);
    setDespesas([]);
    setImpostos([]);
  };

  return (
    <AppContext.Provider value={{
      receitas,
      despesas,
      impostos,
      configuracoes,
      addReceita,
      addDespesa,
      addImposto,
      updateImposto,
      updateConfiguracoes,
      zerarSaldo,
      loading
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
