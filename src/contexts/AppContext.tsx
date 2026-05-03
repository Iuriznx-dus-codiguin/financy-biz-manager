import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { logger } from '@/utils/logger';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';

export interface Receita {
  id: number;
  data: string;
  descricao: string;
  categoria: string;
  valor: number;
  cliente?: string;
  formaPagamento: string;
  dashboard_id?: string;
  status: 'paga' | 'pendente';
  recorrente?: boolean;
  tipo_recorrencia?: string;
  proxima_data?: string;
  configuracao_recorrencia?: any;
  categoria_personalizada?: string;
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
  status: 'paga' | 'pendente';
  recorrente?: boolean;
  tipo_recorrencia?: string;
  proxima_data?: string;
  configuracao_recorrencia?: any;
  categoria_personalizada?: string;
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
  recorrente?: boolean;
  tipo_recorrencia?: string;
  proxima_data?: string;
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
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  salario: number;
  status: 'ativo' | 'inativo';
  periodicidade: 'mensal' | 'semanal' | 'quinzenal';
  dataAdmissao: string;
  dashboard_id?: string;
}

export interface Configuracoes {
  tema: 'light' | 'dark';
  moeda: 'BRL' | 'USD' | 'EUR';
  idioma: 'pt-BR' | 'en-US' | 'es-ES';
}

interface DashboardCache {
  [dashboardId: string]: {
    receitas: Receita[];
    despesas: Despesa[];
    impostos: Imposto[];
    metas: Meta[];
    timestamp: number;
  };
}

interface AppContextType {
  receitas: Receita[];
  despesas: Despesa[];
  impostos: Imposto[];
  metas: Meta[];
  membrosEquipe: MembroEquipe[];
  configuracoes: Configuracoes;
  loading: boolean;
  setReceitas: React.Dispatch<React.SetStateAction<Receita[]>>;
  setDespesas: React.Dispatch<React.SetStateAction<Despesa[]>>;
  setImpostos: React.Dispatch<React.SetStateAction<Imposto[]>>;
  setMetas: React.Dispatch<React.SetStateAction<Meta[]>>;
  addReceita: (receita: Omit<Receita, 'id'>) => Promise<void>;
  addDespesa: (despesa: Omit<Despesa, 'id'>) => Promise<void>;
  addImposto: (imposto: Omit<Imposto, 'id'>) => Promise<void>;
  addMeta: (meta: Omit<Meta, 'id'>) => Promise<void>;
  addMembroEquipe: (membro: Omit<MembroEquipe, 'id'>) => Promise<void>;
  updateMembroEquipe: (id: string, membro: Partial<MembroEquipe>) => Promise<void>;
  updateMeta: (id: string, meta: Partial<Meta>) => Promise<void>;
  updateReceita: (id: number, receita: Partial<Receita>) => Promise<void>;
  updateDespesa: (id: number, despesa: Partial<Despesa>) => Promise<void>;
  deleteReceita: (id: number) => Promise<void>;
  deleteDespesa: (id: number) => Promise<void>;
  deleteImposto: (id: number) => Promise<void>;
  deleteMeta: (id: string) => Promise<void>;
  deleteMembroEquipe: (id: string) => Promise<void>;
  updateImposto: (id: number, imposto: Partial<Imposto>) => Promise<void>;
  updateConfiguracoes: (novasConfiguracoes: Partial<Configuracoes>) => void;
  clearCacheForDashboard: (dashboardId: string) => void;
  carregarDados: () => Promise<void>;
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
  const [dashboardCache, setDashboardCache] = useState<DashboardCache>({});
  const [loading, setLoading] = useState<boolean>(true);

  const { user } = useAuth();
  const { currentDashboard } = useDashboard();
  const { processRecurringTransactions } = useRecurringTransactions();
  const hasProcessedRecurringRef = useRef<string | null>(null);

  // Cache timeout de 5 minutos
  const CACHE_TIMEOUT = 5 * 60 * 1000;

  // Processar transações recorrentes quando usuário e dashboard estiverem prontos
  useEffect(() => {
    const processRecurring = async () => {
      if (!user?.id) return;
      
      const today = new Date().toISOString().split('T')[0];
      const key = `${user.id}_${today}`;
      
      // Evitar reprocessamento no mesmo dia
      if (hasProcessedRecurringRef.current === key) return;
      
      const result = await processRecurringTransactions(user.id);
      if (result && result.total > 0) {
        hasProcessedRecurringRef.current = key;
        // Invalidar cache para forçar recarregamento
        if (currentDashboard) {
          clearCacheForDashboard(currentDashboard.id);
        }
      } else if (result) {
        hasProcessedRecurringRef.current = key;
      }
    };

    processRecurring();
  }, [user?.id, processRecurringTransactions]);

  useEffect(() => {
    if (user && currentDashboard) {
      carregarDados();
    }
  }, [user, currentDashboard]);

  // Listener de realtime para invalidar cache quando houver mudanças (com debounce)
  useEffect(() => {
    if (!currentDashboard) return;

    let reloadTimeout: NodeJS.Timeout | null = null;
    
    const debouncedReload = () => {
      if (reloadTimeout) clearTimeout(reloadTimeout);
      reloadTimeout = setTimeout(() => {
        logger.info('Dados financeiros alterados, recarregando...');
        clearCacheForDashboard(currentDashboard.id);
        carregarDados();
      }, 500);
    };

    const channel = supabase
      .channel('financial-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'despesas', filter: `dashboard_id=eq.${currentDashboard.id}` },
        debouncedReload
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'receitas', filter: `dashboard_id=eq.${currentDashboard.id}` },
        debouncedReload
      )
      .subscribe();

    return () => {
      if (reloadTimeout) clearTimeout(reloadTimeout);
      supabase.removeChannel(channel);
    };
  }, [currentDashboard]);

  const carregarDados = async () => {
    if (!currentDashboard) return;

    // Verificar se existe cache válido
    const cached = dashboardCache[currentDashboard.id];
    if (cached && (Date.now() - cached.timestamp) < CACHE_TIMEOUT) {
      setReceitas(cached.receitas);
      setDespesas(cached.despesas);
      setImpostos(cached.impostos);
      setMetas(cached.metas);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (!user || !currentDashboard) return;

      // Parallelize all queries for better performance
      const [
        { data: receitasData, error: receitasError },
        { data: despesasData, error: despesasError },
        { data: impostosData, error: impostosError },
        { data: metasData, error: metasError },
        { data: membrosData, error: membrosError }
      ] = await Promise.all([
        supabase
          .from('receitas')
          .select('*')
          .eq('user_id', user.id)
          .eq('dashboard_id', currentDashboard.id)
          .order('data', { ascending: false }),
        
        supabase
          .from('despesas')
          .select('*')
          .eq('user_id', user.id)
          .eq('dashboard_id', currentDashboard.id)
          .order('data', { ascending: false }),
        
        supabase
          .from('impostos')
          .select('*')
          .eq('user_id', user.id)
          .eq('dashboard_id', currentDashboard.id)
          .order('vencimento', { ascending: true }),
        
        supabase
          .from('metas')
          .select('*')
          .eq('user_id', user.id)
          .eq('dashboard_id', currentDashboard.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('equipe_membros')
          .select('*')
          .eq('user_id', user.id)
          .eq('dashboard_id', currentDashboard.id)
          .order('created_at', { ascending: false })
      ]);

      if (receitasError) throw receitasError;
      if (despesasError) throw despesasError;
      if (impostosError) throw impostosError;
      if (metasError) throw metasError;
      if (membrosError) throw membrosError;

      const receitasFormatadas = receitasData?.map(r => ({
        id: r.id,
        data: r.data,
        descricao: r.descricao,
        categoria: r.categoria,
        valor: r.valor,
        cliente: r.cliente,
        formaPagamento: r.forma_pagamento,
        dashboard_id: r.dashboard_id,
        status: (r.status || 'paga') as 'paga' | 'pendente'
      })) || [];

      const despesasFormatadas = despesasData?.map(d => ({
        id: d.id,
        data: d.data,
        descricao: d.descricao,
        categoria: d.categoria,
        valor: d.valor,
        fornecedor: d.fornecedor,
        formaPagamento: d.forma_pagamento,
        dashboard_id: d.dashboard_id,
        status: (d.status || 'paga') as 'paga' | 'pendente'
      })) || [];

      const impostosFormatados = impostosData?.map(i => ({
        id: i.id,
        descricao: i.descricao,
        tipo: i.tipo,
        valor: i.valor,
        valorTipo: 'fixo' as const,
        vencimento: i.vencimento,
        pago: i.pago || false,
        tipoRecorrencia: (i.recorrente ? 'recorrente' : 'unico') as 'unico' | 'recorrente',
        dashboard_id: i.dashboard_id
      })) || [];

      const metasFormatadas = metasData?.map(m => ({
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
      })) || [];

      const membrosFormatados = membrosData?.map(m => ({
        id: m.id,
        nome: m.nome,
        email: m.email,
        telefone: m.telefone || '',
        cargo: m.cargo,
        salario: m.salario,
        status: m.status as 'ativo' | 'inativo',
        periodicidade: m.periodicidade as 'mensal' | 'semanal' | 'quinzenal',
        dataAdmissao: m.data_admissao,
        dashboard_id: m.dashboard_id
      })) || [];

      // Atualizar estados
      setReceitas(receitasFormatadas);
      setDespesas(despesasFormatadas);
      setImpostos(impostosFormatados);
      setMetas(metasFormatadas);
      setMembrosEquipe(membrosFormatados);

      // Atualizar cache (incluindo membros da equipe)
      setDashboardCache(prev => ({
        ...prev,
        [currentDashboard.id]: {
          receitas: receitasFormatadas,
          despesas: despesasFormatadas,
          impostos: impostosFormatados,
          metas: metasFormatadas,
          timestamp: Date.now()
        }
      }));

    } catch (error) {
      logger.error('Erro ao carregar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  const addReceita = async (receita: Omit<Receita, 'id'>) => {
    if (!user || !currentDashboard) return;
    const tempId = Date.now() * -1;
    const optimistic = { ...receita, id: tempId } as Receita;
    setReceitas(prev => [optimistic, ...prev]);
    try {
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
          forma_pagamento: receita.formaPagamento,
          status: receita.status || 'paga'
        })
        .select()
        .single();
      if (error) throw error;
      setReceitas(prev => prev.map(r => r.id === tempId ? {
        id: data.id,
        data: data.data,
        descricao: data.descricao,
        categoria: data.categoria,
        valor: data.valor,
        cliente: data.cliente,
        formaPagamento: data.forma_pagamento,
        dashboard_id: data.dashboard_id,
        status: (data.status || 'paga') as 'paga' | 'pendente'
      } : r));
      clearCacheForDashboard(currentDashboard.id);
    } catch (error) {
      setReceitas(prev => prev.filter(r => r.id !== tempId));
      logger.error('Erro ao adicionar receita:', error);
      throw error;
    }
  };

  const addDespesa = async (despesa: Omit<Despesa, 'id'>) => {
    if (!user || !currentDashboard) return;
    const tempId = Date.now() * -1;
    const optimistic = { ...despesa, id: tempId } as Despesa;
    setDespesas(prev => [optimistic, ...prev]);
    try {
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
          forma_pagamento: despesa.formaPagamento,
          status: despesa.status || 'paga'
        })
        .select()
        .single();
      if (error) throw error;
      setDespesas(prev => prev.map(d => d.id === tempId ? {
        id: data.id,
        data: data.data,
        descricao: data.descricao,
        categoria: data.categoria,
        valor: data.valor,
        fornecedor: data.fornecedor,
        formaPagamento: data.forma_pagamento,
        dashboard_id: data.dashboard_id,
        status: (data.status || 'paga') as 'paga' | 'pendente'
      } : d));
      clearCacheForDashboard(currentDashboard.id);
    } catch (error) {
      setDespesas(prev => prev.filter(d => d.id !== tempId));
      logger.error('Erro ao adicionar despesa:', error);
      throw error;
    }
  };

  const addImposto = async (imposto: Omit<Imposto, 'id'>) => {
    if (!user || !currentDashboard) return;
    const tempId = Date.now() * -1;
    const optimistic = { ...imposto, id: tempId } as Imposto;
    setImpostos(prev => [optimistic, ...prev]);
    try {
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
      if (error) throw error;
      setImpostos(prev => prev.map(i => i.id === tempId ? {
        id: data.id,
        descricao: data.descricao,
        tipo: data.tipo,
        valor: data.valor,
        valorTipo: imposto.valorTipo,
        vencimento: data.vencimento,
        pago: data.pago || false,
        tipoRecorrencia: imposto.tipoRecorrencia,
        dashboard_id: data.dashboard_id
      } : i));
    } catch (error) {
      setImpostos(prev => prev.filter(i => i.id !== tempId));
      console.error('Erro ao adicionar imposto:', error);
      throw error;
    }
  };

  const addMeta = async (meta: Omit<Meta, 'id'>) => {
    if (!user || !currentDashboard) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic = { ...meta, id: tempId } as Meta;
    setMetas(prev => [optimistic, ...prev]);
    try {
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
      if (error) throw error;
      setMetas(prev => prev.map(m => m.id === tempId ? {
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
      } : m));
    } catch (error) {
      setMetas(prev => prev.filter(m => m.id !== tempId));
      console.error('Erro ao adicionar meta:', error);
      throw error;
    }
  };

  const addMembroEquipe = async (membro: Omit<MembroEquipe, 'id'>) => {
    if (!user || !currentDashboard) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic = { ...membro, id: tempId } as MembroEquipe;
    setMembrosEquipe(prev => [optimistic, ...prev]);
    try {
      const { data, error } = await supabase
        .from('equipe_membros')
        .insert({
          user_id: user.id,
          dashboard_id: currentDashboard.id,
          nome: membro.nome,
          email: membro.email,
          telefone: membro.telefone || '',
          cargo: membro.cargo,
          salario: membro.salario,
          status: membro.status || 'ativo',
          periodicidade: membro.periodicidade,
          data_admissao: membro.dataAdmissao
        })
        .select()
        .single();
      if (error) throw error;
      setMembrosEquipe(prev => prev.map(m => m.id === tempId ? {
        id: data.id,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone || '',
        cargo: data.cargo,
        salario: data.salario,
        status: data.status as 'ativo' | 'inativo',
        periodicidade: data.periodicidade as 'mensal' | 'semanal' | 'quinzenal',
        dataAdmissao: data.data_admissao,
        dashboard_id: data.dashboard_id
      } : m));
    } catch (error) {
      setMembrosEquipe(prev => prev.filter(m => m.id !== tempId));
      console.error('Erro ao adicionar membro da equipe:', error);
      throw error;
    }
  };

  const updateMembroEquipe = async (id: string, membro: Partial<MembroEquipe>) => {
    const previous = membrosEquipe;
    setMembrosEquipe(prev => prev.map(m => m.id === id ? { ...m, ...membro } : m));
    try {
      const { error } = await supabase
        .from('equipe_membros')
        .update({
          nome: membro.nome,
          email: membro.email,
          telefone: membro.telefone,
          cargo: membro.cargo,
          salario: membro.salario,
          status: membro.status,
          periodicidade: membro.periodicidade,
          data_admissao: membro.dataAdmissao
        })
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      setMembrosEquipe(previous);
      console.error('Erro ao atualizar membro da equipe:', error);
      throw error;
    }
  };

  const updateReceita = async (id: number, receita: Partial<Receita>) => {
    const previous = receitas;
    setReceitas(prev => prev.map(r => r.id === id ? { ...r, ...receita } : r));
    try {
      const { error } = await supabase
        .from('receitas')
        .update({
          data: receita.data,
          descricao: receita.descricao,
          categoria: receita.categoria,
          valor: receita.valor,
          cliente: receita.cliente,
          forma_pagamento: receita.formaPagamento,
          status: receita.status
        })
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      setReceitas(previous);
      console.error('Erro ao atualizar receita:', error);
      throw error;
    }
  };

  const updateDespesa = async (id: number, despesa: Partial<Despesa>) => {
    const previous = despesas;
    setDespesas(prev => prev.map(d => d.id === id ? { ...d, ...despesa } : d));
    try {
      const { error } = await supabase
        .from('despesas')
        .update({
          data: despesa.data,
          descricao: despesa.descricao,
          categoria: despesa.categoria,
          valor: despesa.valor,
          fornecedor: despesa.fornecedor,
          forma_pagamento: despesa.formaPagamento,
          status: despesa.status
        })
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      setDespesas(previous);
      console.error('Erro ao atualizar despesa:', error);
      throw error;
    }
  };

  const updateMeta = async (id: string, meta: Partial<Meta>) => {
    const previous = metas;
    setMetas(prev => prev.map(m => m.id === id ? { ...m, ...meta } : m));
    try {
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
      if (error) throw error;
    } catch (error) {
      setMetas(previous);
      console.error('Erro ao atualizar meta:', error);
      throw error;
    }
  };

  const deleteReceita = async (id: number) => {
    const previous = receitas;
    setReceitas(prev => prev.filter(r => r.id !== id));
    try {
      const { error } = await supabase.from('receitas').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      setReceitas(previous);
      console.error('Erro ao deletar receita:', error);
      throw error;
    }
  };

  const deleteDespesa = async (id: number) => {
    const previous = despesas;
    setDespesas(prev => prev.filter(d => d.id !== id));
    try {
      const { error } = await supabase.from('despesas').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      setDespesas(previous);
      console.error('Erro ao deletar despesa:', error);
      throw error;
    }
  };

  const deleteImposto = async (id: number) => {
    const previous = impostos;
    setImpostos(prev => prev.filter(i => i.id !== id));
    try {
      const { error } = await supabase.from('impostos').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      setImpostos(previous);
      console.error('Erro ao deletar imposto:', error);
      throw error;
    }
  };

  const deleteMeta = async (id: string) => {
    const previous = metas;
    setMetas(prev => prev.filter(m => m.id !== id));
    try {
      const { error } = await supabase.from('metas').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      setMetas(previous);
      console.error('Erro ao deletar meta:', error);
      throw error;
    }
  };

  const deleteMembroEquipe = async (id: string) => {
    const previous = membrosEquipe;
    setMembrosEquipe(prev => prev.filter(m => m.id !== id));
    try {
      const { error } = await supabase.from('equipe_membros').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      setMembrosEquipe(previous);
      console.error('Erro ao deletar membro da equipe:', error);
      throw error;
    }
  };

  const updateImposto = async (id: number, imposto: Partial<Imposto>) => {
    const previous = impostos;
    setImpostos(prev => prev.map(i => i.id === id ? { ...i, ...imposto } : i));
    try {
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
      if (error) throw error;
    } catch (error) {
      setImpostos(previous);
      console.error('Erro ao atualizar imposto:', error);
      throw error;
    }
  };

  const updateConfiguracoes = (novasConfiguracoes: Partial<Configuracoes>) => {
    setConfiguracoes(prev => ({ ...prev, ...novasConfiguracoes }));
  };

  const clearCacheForDashboard = (dashboardId: string) => {
    setDashboardCache(prev => {
      const newCache = { ...prev };
      delete newCache[dashboardId];
      return newCache;
    });
  };

  return (
    <AppContext.Provider value={{
      receitas,
      despesas,
      impostos,
      metas,
      membrosEquipe,
      configuracoes,
      loading,
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
      updateReceita,
      updateDespesa,
      deleteReceita,
      deleteDespesa,
      deleteImposto,
      deleteMeta,
      deleteMembroEquipe,
      updateImposto,
      updateConfiguracoes,
      clearCacheForDashboard,
      carregarDados
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
