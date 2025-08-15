
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';

export interface Receita {
  id: number;
  data: string;
  descricao: string;
  categoria: string;
  valor: number;
  cliente?: string;
  formaPagamento: string;
  dashboard_id?: string;
}

export interface Despesa {
  id: number;
  data: string;
  descricao: string;
  categoria: string;
  valor: number;
  fornecedor?: string;
  formaPagamento: string;
  dashboard_id?: string;
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
  dashboard_id?: string;
}

export interface Meta {
  id: string;
  titulo: string;
  valorMeta: number;
  valorAtual: number;
  progresso: number;
  prazo: string;
  categoria: string;
  status: 'em_andamento' | 'concluida' | 'atrasada';
  cor: string;
  dashboard_id?: string;
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

export interface Configuracoes {
  tema: 'light' | 'dark';
  moeda: 'BRL' | 'USD' | 'EUR';
  idioma: 'pt-BR' | 'en-US' | 'es-ES';
}

interface AppContextType {
  receitas: Receita[];
  despesas: Despesa[];
  impostos: Imposto[];
  metas: Meta[];
  membrosEquipe: MembroEquipe[];
  configuracoes: Configuracoes;
  setReceitas: React.Dispatch<React.SetStateAction<Receita[]>>;
  setDespesas: React.Dispatch<React.SetStateAction<Despesa[]>>;
  setImpostos: React.Dispatch<React.SetStateAction<Imposto[]>>;
  setMetas: React.Dispatch<React.SetStateAction<Meta[]>>;
  addReceita: (receita: Omit<Receita, 'id'>) => Promise<void>;
  addDespesa: (despesa: Omit<Despesa, 'id'>) => Promise<void>;
  addImposto: (imposto: Omit<Imposto, 'id'>) => Promise<void>;
  addMeta: (meta: Omit<Meta, 'id'>) => Promise<void>;
  addMembroEquipe: (membro: Omit<MembroEquipe, 'id'>) => Promise<void>;
  updateMembroEquipe: (id: number, membro: Partial<MembroEquipe>) => Promise<void>;
  updateMeta: (id: string, meta: Partial<Meta>) => Promise<void>;
  deleteReceita: (id: number) => Promise<void>;
  deleteDespesa: (id: number) => Promise<void>;
  deleteImposto: (id: number) => Promise<void>;
  deleteMeta: (id: string) => Promise<void>;
  deleteMembroEquipe: (id: number) => Promise<void>;
  updateImposto: (id: number, imposto: Partial<Imposto>) => Promise<void>;
  updateConfiguracoes: (novasConfiguracoes: Partial<Configuracoes>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [impostos, setImpostos] = useState<Imposto[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [membrosEquipe, setMembrosEquipe] = useState<MembroEquipe[]>([]);
  const [configuracoes, setConfiguracoes] = useState<Configuracoes>({
    tema: 'light',
    moeda: 'BRL',
    idioma: 'pt-BR'
  });

  const { user } = useAuth();
  const { currentDashboard } = useDashboard();

  useEffect(() => {
    // Não recarregar dados se já foram carregados pela tela de loading
    if (user && currentDashboard && receitas.length === 0 && despesas.length === 0 && impostos.length === 0 && metas.length === 0) {
      carregarDados();
    }
  }, [user, currentDashboard, receitas.length, despesas.length, impostos.length, metas.length]);

  const carregarDados = async () => {
    try {
      // Carregar receitas
      const { data: receitasData } = await supabase
        .from('receitas')
        .select('*')
        .eq('dashboard_id', currentDashboard?.id)
        .order('data', { ascending: false });

      if (receitasData) {
        const receitasFormatadas = receitasData.map(r => ({
          id: r.id,
          data: r.data,
          descricao: r.descricao,
          categoria: r.categoria,
          valor: r.valor,
          cliente: r.cliente,
          formaPagamento: r.forma_pagamento,
          dashboard_id: r.dashboard_id
        }));
        setReceitas(receitasFormatadas);
      }

      // Carregar despesas
      const { data: despesasData } = await supabase
        .from('despesas')
        .select('*')
        .eq('dashboard_id', currentDashboard?.id)
        .order('data', { ascending: false });

      if (despesasData) {
        const despesasFormatadas = despesasData.map(d => ({
          id: d.id,
          data: d.data,
          descricao: d.descricao,
          categoria: d.categoria,
          valor: d.valor,
          fornecedor: d.fornecedor,
          formaPagamento: d.forma_pagamento,
          dashboard_id: d.dashboard_id
        }));
        setDespesas(despesasFormatadas);
      }

      // Carregar impostos
      const { data: impostosData } = await supabase
        .from('impostos')
        .select('*')
        .eq('dashboard_id', currentDashboard?.id)
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
          tipoRecorrencia: (i.recorrente ? 'recorrente' : 'unico') as 'unico' | 'recorrente',
          dashboard_id: i.dashboard_id
        }));
        setImpostos(impostosFormatados);
      }

      // Carregar metas
      const { data: metasData } = await supabase
        .from('metas')
        .select('*')
        .eq('dashboard_id', currentDashboard?.id)
        .order('created_at', { ascending: false });

      if (metasData) {
        const metasFormatadas = metasData.map(m => ({
          id: m.id,
          titulo: m.titulo,
          valorMeta: m.valor_meta,
          valorAtual: m.valor_atual,
          progresso: m.progresso,
          prazo: m.prazo,
          categoria: m.categoria,
          status: m.status as 'em_andamento' | 'concluida' | 'atrasada',
          cor: m.cor,
          dashboard_id: m.dashboard_id
        }));
        setMetas(metasFormatadas);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const addReceita = async (receita: Omit<Receita, 'id'>) => {
    if (!user || !currentDashboard) return;

    const { data, error } = await supabase
      .from('receitas')
      .insert({
        user_id: user.id,
        dashboard_id: currentDashboard.id,
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
        formaPagamento: data.forma_pagamento,
        dashboard_id: data.dashboard_id
      };
      setReceitas(prev => [novaReceita, ...prev]);
    }
  };

  const addDespesa = async (despesa: Omit<Despesa, 'id'>) => {
    if (!user || !currentDashboard) return;

    const { data, error } = await supabase
      .from('despesas')
      .insert({
        user_id: user.id,
        dashboard_id: currentDashboard.id,
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
        formaPagamento: data.forma_pagamento,
        dashboard_id: data.dashboard_id
      };
      setDespesas(prev => [novaDespesa, ...prev]);
    }
  };

  const addImposto = async (imposto: Omit<Imposto, 'id'>) => {
    if (!user || !currentDashboard) return;

    const { data, error } = await supabase
      .from('impostos')
      .insert({
        user_id: user.id,
        dashboard_id: currentDashboard.id,
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
        tipoRecorrencia: imposto.tipoRecorrencia,
        dashboard_id: data.dashboard_id
      };
      setImpostos(prev => [novoImposto, ...prev]);
    }
  };

  const addMeta = async (meta: Omit<Meta, 'id'>) => {
    if (!user || !currentDashboard) return;

    const { data, error } = await supabase
      .from('metas')
      .insert({
        user_id: user.id,
        dashboard_id: currentDashboard.id,
        titulo: meta.titulo,
        valor_meta: meta.valorMeta,
        valor_atual: meta.valorAtual,
        progresso: meta.progresso,
        prazo: meta.prazo,
        categoria: meta.categoria,
        status: meta.status,
        cor: meta.cor
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar meta:', error);
      return;
    }

    if (data) {
      const novaMeta: Meta = {
        id: data.id,
        titulo: data.titulo,
        valorMeta: data.valor_meta,
        valorAtual: data.valor_atual,
        progresso: data.progresso,
        prazo: data.prazo,
        categoria: data.categoria,
        status: data.status as 'em_andamento' | 'concluida' | 'atrasada',
        cor: data.cor,
        dashboard_id: data.dashboard_id
      };
      setMetas(prev => [novaMeta, ...prev]);
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

  const updateMeta = async (id: string, meta: Partial<Meta>) => {
    const { error } = await supabase
      .from('metas')
      .update({
        titulo: meta.titulo,
        valor_meta: meta.valorMeta,
        valor_atual: meta.valorAtual,
        progresso: meta.progresso,
        prazo: meta.prazo,
        categoria: meta.categoria,
        status: meta.status,
        cor: meta.cor
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar meta:', error);
      return;
    }

    setMetas(prev => 
      prev.map(m => m.id === id ? { ...m, ...meta } : m)
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

  const deleteMeta = async (id: string) => {
    const { error } = await supabase
      .from('metas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar meta:', error);
      return;
    }

    setMetas(prev => prev.filter(m => m.id !== id));
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

  const updateConfiguracoes = (novasConfiguracoes: Partial<Configuracoes>) => {
    setConfiguracoes(prev => ({ ...prev, ...novasConfiguracoes }));
  };

  return (
    <AppContext.Provider value={{
      receitas,
      despesas,
      impostos,
      metas,
      membrosEquipe,
      configuracoes,
      setReceitas,
      setDespesas,
      setImpostos,
      setMetas,
      addReceita,
      addDespesa,
      addImposto,
      addMeta,
      addMembroEquipe,
      updateMembroEquipe,
      updateMeta,
      deleteReceita,
      deleteDespesa,
      deleteImposto,
      deleteMeta,
      deleteMembroEquipe,
      updateImposto,
      updateConfiguracoes
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
