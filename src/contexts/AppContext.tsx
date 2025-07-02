
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Receita {
  id: number;
  data: string;
  descricao: string;
  categoria: string;
  valor: number;
  cliente?: string;
  formaPagamento: string;
}

export interface Despesa {
  id: number;
  data: string;
  descricao: string;
  categoria: string;
  valor: number;
  fornecedor?: string;
  formaPagamento: string;
}

export interface Imposto {
  id: number;
  descricao: string;
  tipo: string;
  valor: number;
  valorTipo: 'fixo' | 'porcentagem';
  vencimento: string;
  pago: boolean;
  tipoRecorrencia: 'unico' | 'recorrente';
}

export interface MembroEquipe {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  salario: number;
  status: 'ativo' | 'inativo';
  periodicidade: 'mensal' | 'semanal' | 'quinzenal';
  dataAdmissao: string;
}

interface AppContextType {
  receitas: Receita[];
  despesas: Despesa[];
  impostos: Imposto[];
  membrosEquipe: MembroEquipe[];
  addReceita: (receita: Omit<Receita, 'id'>) => Promise<void>;
  addDespesa: (despesa: Omit<Despesa, 'id'>) => Promise<void>;
  addImposto: (imposto: Omit<Imposto, 'id'>) => Promise<void>;
  addMembroEquipe: (membro: Omit<MembroEquipe, 'id'>) => Promise<void>;
  updateMembroEquipe: (id: number, membro: Partial<MembroEquipe>) => Promise<void>;
  deleteReceita: (id: number) => Promise<void>;
  deleteDespesa: (id: number) => Promise<void>;
  deleteImposto: (id: number) => Promise<void>;
  deleteMembroEquipe: (id: number) => Promise<void>;
  updateImposto: (id: number, imposto: Partial<Imposto>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [impostos, setImpostos] = useState<Imposto[]>([]);
  const [membrosEquipe, setMembrosEquipe] = useState<MembroEquipe[]>([]);

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      carregarDados();
    }
  }, [user]);

  const carregarDados = async () => {
    try {
      // Carregar receitas
      const { data: receitasData } = await supabase
        .from('receitas')
        .select('*')
        .order('data', { ascending: false });

      if (receitasData) {
        const receitasFormatadas = receitasData.map(r => ({
          id: r.id,
          data: r.data,
          descricao: r.descricao,
          categoria: r.categoria,
          valor: r.valor,
          cliente: r.cliente,
          formaPagamento: r.forma_pagamento
        }));
        setReceitas(receitasFormatadas);
      }

      // Carregar despesas
      const { data: despesasData } = await supabase
        .from('despesas')
        .select('*')
        .order('data', { ascending: false });

      if (despesasData) {
        const despesasFormatadas = despesasData.map(d => ({
          id: d.id,
          data: d.data,
          descricao: d.descricao,
          categoria: d.categoria,
          valor: d.valor,
          fornecedor: d.fornecedor,
          formaPagamento: d.forma_pagamento
        }));
        setDespesas(despesasFormatadas);
      }

      // Carregar impostos
      const { data: impostosData } = await supabase
        .from('impostos')
        .select('*')
        .order('vencimento', { ascending: false });

      if (impostosData) {
        const impostosFormatados = impostosData.map(i => ({
          id: i.id,
          descricao: i.descricao,
          tipo: i.tipo,
          valor: i.valor,
          valorTipo: 'fixo' as const,
          vencimento: i.vencimento,
          pago: i.pago || false,
          tipoRecorrencia: (i.recorrente ? 'recorrente' : 'unico') as 'unico' | 'recorrente'
        }));
        setImpostos(impostosFormatados);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const addReceita = async (receita: Omit<Receita, 'id'>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('receitas')
      .insert({
        user_id: user.id,
        data: receita.data,
        descricao: receita.descricao,
        categoria: receita.categoria,
        valor: receita.valor,
        cliente: receita.cliente,
        forma_pagamento: receita.formaPagamento
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar receita:', error);
      return;
    }

    if (data) {
      const novaReceita = {
        id: data.id,
        data: data.data,
        descricao: data.descricao,
        categoria: data.categoria,
        valor: data.valor,
        cliente: data.cliente,
        formaPagamento: data.forma_pagamento
      };
      setReceitas(prev => [novaReceita, ...prev]);
    }
  };

  const addDespesa = async (despesa: Omit<Despesa, 'id'>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('despesas')
      .insert({
        user_id: user.id,
        data: despesa.data,
        descricao: despesa.descricao,
        categoria: despesa.categoria,
        valor: despesa.valor,
        fornecedor: despesa.fornecedor,
        forma_pagamento: despesa.formaPagamento
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar despesa:', error);
      return;
    }

    if (data) {
      const novaDespesa = {
        id: data.id,
        data: data.data,
        descricao: data.descricao,
        categoria: data.categoria,
        valor: data.valor,
        fornecedor: data.fornecedor,
        formaPagamento: data.forma_pagamento
      };
      setDespesas(prev => [novaDespesa, ...prev]);
    }
  };

  const addImposto = async (imposto: Omit<Imposto, 'id'>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('impostos')
      .insert({
        user_id: user.id,
        descricao: imposto.descricao,
        tipo: imposto.tipo,
        valor: imposto.valor,
        vencimento: imposto.vencimento,
        pago: imposto.pago || false,
        recorrente: imposto.tipoRecorrencia === 'recorrente'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar imposto:', error);
      return;
    }

    if (data) {
      const novoImposto = {
        id: data.id,
        descricao: data.descricao,
        tipo: data.tipo,
        valor: data.valor,
        valorTipo: imposto.valorTipo,
        vencimento: data.vencimento,
        pago: data.pago || false,
        tipoRecorrencia: imposto.tipoRecorrencia
      };
      setImpostos(prev => [novoImposto, ...prev]);
    }
  };

  const addMembroEquipe = async (membro: Omit<MembroEquipe, 'id'>) => {
    const novoMembro = {
      ...membro,
      id: Date.now()
    };
    setMembrosEquipe(prev => [...prev, novoMembro]);
  };

  const updateMembroEquipe = async (id: number, membro: Partial<MembroEquipe>) => {
    setMembrosEquipe(prev => 
      prev.map(m => m.id === id ? { ...m, ...membro } : m)
    );
  };

  const deleteReceita = async (id: number) => {
    const { error } = await supabase
      .from('receitas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar receita:', error);
      return;
    }

    setReceitas(prev => prev.filter(r => r.id !== id));
  };

  const deleteDespesa = async (id: number) => {
    const { error } = await supabase
      .from('despesas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar despesa:', error);
      return;
    }

    setDespesas(prev => prev.filter(d => d.id !== id));
  };

  const deleteImposto = async (id: number) => {
    const { error } = await supabase
      .from('impostos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar imposto:', error);
      return;
    }

    setImpostos(prev => prev.filter(i => i.id !== id));
  };

  const deleteMembroEquipe = async (id: number) => {
    setMembrosEquipe(prev => prev.filter(m => m.id !== id));
  };

  const updateImposto = async (id: number, imposto: Partial<Imposto>) => {
    const { error } = await supabase
      .from('impostos')
      .update({
        pago: imposto.pago,
        descricao: imposto.descricao,
        tipo: imposto.tipo,
        valor: imposto.valor,
        vencimento: imposto.vencimento,
        recorrente: imposto.tipoRecorrencia === 'recorrente'
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar imposto:', error);
      return;
    }

    setImpostos(prev => 
      prev.map(i => i.id === id ? { ...i, ...imposto } : i)
    );
  };

  return (
    <AppContext.Provider value={{
      receitas,
      despesas,
      impostos,
      membrosEquipe,
      addReceita,
      addDespesa,
      addImposto,
      addMembroEquipe,
      updateMembroEquipe,
      deleteReceita,
      deleteDespesa,
      deleteImposto,
      deleteMembroEquipe,
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
