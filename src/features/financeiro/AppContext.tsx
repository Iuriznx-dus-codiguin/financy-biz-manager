import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useAuth } from '@/features/auth/useAuth';
import { useDashboard } from '@/features/dashboards/useDashboard';
import { logger } from '@/shared/lib/logger';
import { useRecurringTransactions } from '@/features/lancamentos/useRecurringTransactions';
import { hojeISO } from '@/shared/lib/datas';
import { ehColunaAusente } from '@/shared/lib/erros';
import { buscarTodas } from '@/shared/lib/paginacao';
import { ehTipoRecorrencia, proximaOcorrencia, recorrenciaDoLancamento } from '@/shared/lib/recorrencia';

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
  configuracao_recorrencia?: unknown;
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
  configuracao_recorrencia?: unknown;
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

interface DadosDoDashboard {
  receitas: Receita[];
  despesas: Despesa[];
  impostos: Imposto[];
  metas: Meta[];
  membrosEquipe: MembroEquipe[];
  timestamp: number;
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

// ------------------------------------------------------------------ mapeamento banco ⇄ tela

type LinhaReceita = Tables<'receitas'>;
type LinhaDespesa = Tables<'despesas'>;
// valor_tipo, tipo_recorrencia e proxima_data de impostos chegam com a migração 20260927120200.
type LinhaImposto = Tables<'impostos'> & { valor_tipo?: string | null; tipo_recorrencia?: string | null; proxima_data?: string | null };

const status = (valor: string | null) => (valor === 'pendente' ? 'pendente' : 'paga') as 'paga' | 'pendente';

const mapearReceita = (r: LinhaReceita): Receita => ({
  id: r.id,
  data: r.data,
  descricao: r.descricao,
  categoria: r.categoria,
  valor: Number(r.valor),
  cliente: r.cliente ?? undefined,
  formaPagamento: r.forma_pagamento,
  dashboard_id: r.dashboard_id ?? undefined,
  status: status(r.status),
  recorrente: r.recorrente ?? false,
  tipo_recorrencia: r.tipo_recorrencia ?? undefined,
  proxima_data: r.proxima_data ?? undefined,
  configuracao_recorrencia: r.configuracao_recorrencia ?? undefined,
  categoria_personalizada: r.categoria_personalizada ?? undefined,
});

const mapearDespesa = (d: LinhaDespesa): Despesa => ({
  id: d.id,
  data: d.data,
  descricao: d.descricao,
  categoria: d.categoria,
  valor: Number(d.valor),
  fornecedor: d.fornecedor ?? undefined,
  formaPagamento: d.forma_pagamento,
  dashboard_id: d.dashboard_id ?? undefined,
  status: status(d.status),
  recorrente: d.recorrente ?? false,
  tipo_recorrencia: d.tipo_recorrencia ?? undefined,
  proxima_data: d.proxima_data ?? undefined,
  configuracao_recorrencia: d.configuracao_recorrencia ?? undefined,
  categoria_personalizada: d.categoria_personalizada ?? undefined,
});

const mapearImposto = (i: LinhaImposto): Imposto => ({
  id: i.id,
  descricao: i.descricao,
  tipo: i.tipo,
  valor: Number(i.valor),
  // Antes era sempre 'fixo': percentuais cadastrados voltavam como valor em reais.
  valorTipo: i.valor_tipo === 'porcentagem' ? 'porcentagem' : 'fixo',
  vencimento: i.vencimento,
  pago: i.pago ?? false,
  tipoRecorrencia: i.recorrente ? 'recorrente' : 'unico',
  dashboard_id: i.dashboard_id ?? undefined,
  recorrente: i.recorrente ?? false,
  tipo_recorrencia: i.tipo_recorrencia ?? undefined,
  proxima_data: i.proxima_data ?? undefined,
});

const mapearMeta = (m: Tables<'metas'>): Meta => ({
  id: m.id,
  titulo: m.titulo,
  valorMeta: Number(m.valor_meta),
  valorAtual: Number(m.valor_atual),
  progresso: m.progresso,
  prazo: m.prazo,
  categoria: m.categoria,
  status: m.status as Meta['status'],
  cor: m.cor,
  dashboard_id: m.dashboard_id ?? undefined,
});

const mapearMembro = (m: Tables<'equipe_membros'>): MembroEquipe => ({
  id: m.id,
  nome: m.nome,
  email: m.email,
  telefone: m.telefone || '',
  cargo: m.cargo,
  salario: Number(m.salario),
  status: m.status as MembroEquipe['status'],
  periodicidade: m.periodicidade as MembroEquipe['periodicidade'],
  dataAdmissao: m.data_admissao,
  dashboard_id: m.dashboard_id ?? undefined,
});

/** Só os campos informados (undefined some do JSON, mas deixar explícito evita apagar colunas). */
function definidos<T extends Record<string, unknown>>(campos: T): Partial<T> {
  return Object.fromEntries(Object.entries(campos).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Recorrência de um lançamento vinda do formulário (aceita os nomes antigos em camelCase). */
function recorrenciaDoFormulario(l: Partial<Receita | Despesa> & { tipoRecorrencia?: string; proximaData?: string }) {
  return recorrenciaDoLancamento(
    l.data ?? hojeISO(),
    l.recorrente,
    l.tipo_recorrencia ?? l.tipoRecorrencia,
    l.proxima_data ?? l.proximaData,
  );
}

/** Campos novos de impostos; ausentes no banco antes da migração 20260927120200. */
function camposNovosDoImposto(imposto: Partial<Imposto>) {
  const recorrente = imposto.tipoRecorrencia === undefined ? undefined : imposto.tipoRecorrencia === 'recorrente';
  const tipo = ehTipoRecorrencia(imposto.tipo_recorrencia) ? imposto.tipo_recorrencia : null;
  return definidos({
    valor_tipo: imposto.valorTipo,
    tipo_recorrencia: recorrente === undefined ? undefined : recorrente ? tipo : null,
    proxima_data:
      recorrente === undefined
        ? undefined
        : recorrente && tipo && imposto.vencimento
          ? imposto.proxima_data || proximaOcorrencia(imposto.vencimento, tipo)
          : null,
  });
}

const CACHE_TIMEOUT = 5 * 60 * 1000;

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
  const [loading, setLoading] = useState<boolean>(true);

  const { user } = useAuth();
  const { currentDashboard } = useDashboard();
  const { processRecurringTransactions } = useRecurringTransactions();

  // Cache em ref: o carregamento disparado pelo realtime lia um cache de estado antigo (closure) e
  // podia devolver dados desatualizados em vez de recarregar.
  const cacheRef = useRef<Record<string, DadosDoDashboard>>({});
  const dashboardAtualRef = useRef<string | null>(null);
  dashboardAtualRef.current = currentDashboard?.id ?? null;
  const dashboardId = currentDashboard?.id ?? null;
  const userId = user?.id ?? null;

  const clearCacheForDashboard = useCallback((id: string) => {
    delete cacheRef.current[id];
  }, []);

  const invalidarAtual = useCallback(() => {
    if (dashboardAtualRef.current) delete cacheRef.current[dashboardAtualRef.current];
  }, []);

  const aplicar = (dados: Omit<DadosDoDashboard, 'timestamp'>) => {
    setReceitas(dados.receitas);
    setDespesas(dados.despesas);
    setImpostos(dados.impostos);
    setMetas(dados.metas);
    setMembrosEquipe(dados.membrosEquipe);
  };

  const carregarDados = useCallback(async () => {
    const id = dashboardAtualRef.current;
    if (!userId || !id) return;

    const cached = cacheRef.current[id];
    if (cached && Date.now() - cached.timestamp < CACHE_TIMEOUT) {
      aplicar(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const doDashboard = <T,>(tabela: 'receitas' | 'despesas', coluna: string) =>
        buscarTodas<T>((de, ate) =>
          supabase
            .from(tabela)
            .select('*')
            .eq('user_id', userId)
            .eq('dashboard_id', id)
            .order(coluna, { ascending: false })
            .order('id', { ascending: false })
            .range(de, ate) as unknown as PromiseLike<{ data: T[] | null; error: null }>,
        );

      const [receitasData, despesasData, impostosRes, metasRes, membrosRes] = await Promise.all([
        doDashboard<LinhaReceita>('receitas', 'data'),
        doDashboard<LinhaDespesa>('despesas', 'data'),
        supabase.from('impostos').select('*').eq('user_id', userId).eq('dashboard_id', id).order('vencimento', { ascending: true }),
        supabase.from('metas').select('*').eq('user_id', userId).eq('dashboard_id', id).order('created_at', { ascending: false }),
        supabase.from('equipe_membros').select('*').eq('user_id', userId).eq('dashboard_id', id).order('created_at', { ascending: false }),
      ]);
      if (impostosRes.error) throw impostosRes.error;
      if (metasRes.error) throw metasRes.error;
      if (membrosRes.error) throw membrosRes.error;

      const dados = {
        receitas: receitasData.map(mapearReceita),
        despesas: despesasData.map(mapearDespesa),
        impostos: (impostosRes.data as LinhaImposto[]).map(mapearImposto),
        metas: (metasRes.data ?? []).map(mapearMeta),
        membrosEquipe: (membrosRes.data ?? []).map(mapearMembro),
      };
      cacheRef.current[id] = { ...dados, timestamp: Date.now() };
      // O usuário pode ter trocado de dashboard enquanto a consulta rodava.
      if (dashboardAtualRef.current === id) aplicar(dados);
    } catch (error) {
      logger.error('Erro ao carregar dados financeiros:', error);
    } finally {
      if (dashboardAtualRef.current === id) setLoading(false);
    }
  }, [userId]);

  const recarregar = useCallback(async () => {
    invalidarAtual();
    await carregarDados();
  }, [invalidarAtual, carregarDados]);

  const recarregarRef = useRef(recarregar);
  recarregarRef.current = recarregar;

  useEffect(() => {
    if (userId && dashboardId) carregarDados();
  }, [userId, dashboardId, carregarDados]);

  // Recorrências vencidas do usuário (uma vez por dia de Brasília); recarrega se algo foi gerado.
  useEffect(() => {
    if (!userId) return;
    let ativo = true;
    processRecurringTransactions(userId).then((resultado) => {
      if (ativo && resultado && resultado.total > 0) {
        cacheRef.current = {};
        recarregarRef.current();
      }
    });
    return () => {
      ativo = false;
    };
  }, [userId, processRecurringTransactions]);

  // Mudanças feitas fora desta aba (WhatsApp/n8n, outra aba, cron) recarregam o dashboard atual.
  useEffect(() => {
    if (!dashboardId) return;
    let espera: ReturnType<typeof setTimeout> | null = null;
    const agendar = () => {
      if (espera) clearTimeout(espera);
      espera = setTimeout(() => {
        logger.info('Dados financeiros alterados, recarregando...');
        recarregarRef.current();
      }, 500);
    };

    const filtro = `dashboard_id=eq.${dashboardId}`;
    // Nome único por assinatura: reaproveitar o mesmo nome entre dashboards misturava as inscrições.
    const canal = supabase
      .channel(`financeiro-${dashboardId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'despesas', filter: filtro }, agendar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receitas', filter: filtro }, agendar)
      .subscribe();

    return () => {
      if (espera) clearTimeout(espera);
      supabase.removeChannel(canal);
    };
  }, [dashboardId]);

  // ---------------------------------------------------------------- lançamentos

  const addReceita = async (receita: Omit<Receita, 'id'>) => {
    if (!user || !currentDashboard) return;
    const tempId = Date.now() * -1;
    setReceitas(prev => [{ ...receita, id: tempId } as Receita, ...prev]);
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
          status: receita.status || 'paga',
          categoria_personalizada: receita.categoria_personalizada || null,
          // Antes a recorrência escolhida no formulário não era gravada.
          ...recorrenciaDoFormulario(receita),
        })
        .select()
        .single();
      if (error) throw error;
      setReceitas(prev => prev.map(r => (r.id === tempId ? mapearReceita(data) : r)));
      invalidarAtual();
    } catch (error) {
      setReceitas(prev => prev.filter(r => r.id !== tempId));
      logger.error('Erro ao adicionar receita:', error);
      throw error;
    }
  };

  const addDespesa = async (despesa: Omit<Despesa, 'id'>) => {
    if (!user || !currentDashboard) return;
    const tempId = Date.now() * -1;
    setDespesas(prev => [{ ...despesa, id: tempId } as Despesa, ...prev]);
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
          status: despesa.status || 'paga',
          categoria_personalizada: despesa.categoria_personalizada || null,
          ...recorrenciaDoFormulario(despesa),
        })
        .select()
        .single();
      if (error) throw error;
      setDespesas(prev => prev.map(d => (d.id === tempId ? mapearDespesa(data) : d)));
      invalidarAtual();
    } catch (error) {
      setDespesas(prev => prev.filter(d => d.id !== tempId));
      logger.error('Erro ao adicionar despesa:', error);
      throw error;
    }
  };

  const updateReceita = async (id: number, receita: Partial<Receita>) => {
    const previous = receitas;
    setReceitas(prev => prev.map(r => (r.id === id ? { ...r, ...receita } : r)));
    try {
      const { error } = await supabase
        .from('receitas')
        .update(definidos({
          data: receita.data,
          descricao: receita.descricao,
          categoria: receita.categoria,
          valor: receita.valor,
          cliente: receita.cliente,
          forma_pagamento: receita.formaPagamento,
          status: receita.status,
        }) as TablesUpdate<'receitas'>)
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
      invalidarAtual();
    } catch (error) {
      setReceitas(previous);
      logger.error('Erro ao atualizar receita:', error);
      throw error;
    }
  };

  const updateDespesa = async (id: number, despesa: Partial<Despesa>) => {
    const previous = despesas;
    setDespesas(prev => prev.map(d => (d.id === id ? { ...d, ...despesa } : d)));
    try {
      const { error } = await supabase
        .from('despesas')
        .update(definidos({
          data: despesa.data,
          descricao: despesa.descricao,
          categoria: despesa.categoria,
          valor: despesa.valor,
          fornecedor: despesa.fornecedor,
          forma_pagamento: despesa.formaPagamento,
          status: despesa.status,
        }) as TablesUpdate<'despesas'>)
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
      invalidarAtual();
    } catch (error) {
      setDespesas(previous);
      logger.error('Erro ao atualizar despesa:', error);
      throw error;
    }
  };

  const deleteReceita = async (id: number) => {
    const previous = receitas;
    setReceitas(prev => prev.filter(r => r.id !== id));
    try {
      const { error } = await supabase.from('receitas').delete().eq('id', id).eq('user_id', user!.id);
      if (error) throw error;
      invalidarAtual();
    } catch (error) {
      setReceitas(previous);
      logger.error('Erro ao excluir receita:', error);
      throw error;
    }
  };

  const deleteDespesa = async (id: number) => {
    const previous = despesas;
    setDespesas(prev => prev.filter(d => d.id !== id));
    try {
      const { error } = await supabase.from('despesas').delete().eq('id', id).eq('user_id', user!.id);
      if (error) throw error;
      invalidarAtual();
    } catch (error) {
      setDespesas(previous);
      logger.error('Erro ao excluir despesa:', error);
      throw error;
    }
  };

  // ---------------------------------------------------------------- impostos

  const addImposto = async (imposto: Omit<Imposto, 'id'>) => {
    if (!user || !currentDashboard) return;
    const tempId = Date.now() * -1;
    setImpostos(prev => [{ ...imposto, id: tempId } as Imposto, ...prev]);
    const basicos: TablesInsert<'impostos'> = {
      user_id: user.id,
      dashboard_id: currentDashboard.id,
      descricao: imposto.descricao,
      tipo: imposto.tipo,
      valor: imposto.valor,
      vencimento: imposto.vencimento,
      pago: imposto.pago || false,
      recorrente: imposto.tipoRecorrencia === 'recorrente',
    };
    try {
      let resposta = await supabase
        .from('impostos')
        .insert({ ...basicos, ...camposNovosDoImposto(imposto) } as TablesInsert<'impostos'>)
        .select()
        .single();
      // Banco ainda sem as colunas novas: grava o básico, como antes.
      if (resposta.error && ehColunaAusente(resposta.error)) {
        resposta = await supabase.from('impostos').insert(basicos).select().single();
      }
      if (resposta.error) throw resposta.error;
      const salvo = mapearImposto(resposta.data as LinhaImposto);
      // Sem a coluna valor_tipo, mantém na tela o tipo escolhido até recarregar.
      setImpostos(prev => prev.map(i => (i.id === tempId ? { ...salvo, valorTipo: imposto.valorTipo } : i)));
      invalidarAtual();
    } catch (error) {
      setImpostos(prev => prev.filter(i => i.id !== tempId));
      logger.error('Erro ao adicionar imposto:', error);
      throw error;
    }
  };

  const updateImposto = async (id: number, imposto: Partial<Imposto>) => {
    const previous = impostos;
    setImpostos(prev => prev.map(i => (i.id === id ? { ...i, ...imposto } : i)));
    // Só o que foi informado: marcar como pago não desliga mais a recorrência (antes enviava recorrente=false).
    const basicos = definidos({
      pago: imposto.pago,
      descricao: imposto.descricao,
      tipo: imposto.tipo,
      valor: imposto.valor,
      vencimento: imposto.vencimento,
      recorrente: imposto.tipoRecorrencia === undefined ? undefined : imposto.tipoRecorrencia === 'recorrente',
    }) as TablesUpdate<'impostos'>;
    try {
      const novos = camposNovosDoImposto(imposto);
      let { error } = await supabase
        .from('impostos')
        .update({ ...basicos, ...novos } as TablesUpdate<'impostos'>)
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error && ehColunaAusente(error) && Object.keys(basicos).length) {
        ({ error } = await supabase.from('impostos').update(basicos).eq('id', id).eq('user_id', user!.id));
      }
      if (error) throw error;
      invalidarAtual();
    } catch (error) {
      setImpostos(previous);
      logger.error('Erro ao atualizar imposto:', error);
      throw error;
    }
  };

  const deleteImposto = async (id: number) => {
    const previous = impostos;
    setImpostos(prev => prev.filter(i => i.id !== id));
    try {
      const { error } = await supabase.from('impostos').delete().eq('id', id).eq('user_id', user!.id);
      if (error) throw error;
      invalidarAtual();
    } catch (error) {
      setImpostos(previous);
      logger.error('Erro ao excluir imposto:', error);
      throw error;
    }
  };

  // ---------------------------------------------------------------- metas

  const addMeta = async (meta: Omit<Meta, 'id'>) => {
    if (!user || !currentDashboard) return;
    const tempId = `temp-${Date.now()}`;
    setMetas(prev => [{ ...meta, id: tempId } as Meta, ...prev]);
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
      setMetas(prev => prev.map(m => (m.id === tempId ? mapearMeta(data) : m)));
      invalidarAtual();
    } catch (error) {
      setMetas(prev => prev.filter(m => m.id !== tempId));
      logger.error('Erro ao adicionar meta:', error);
      throw error;
    }
  };

  const updateMeta = async (id: string, meta: Partial<Meta>) => {
    const previous = metas;
    setMetas(prev => prev.map(m => (m.id === id ? { ...m, ...meta } : m)));
    try {
      const { error } = await supabase
        .from('metas')
        .update(definidos({
          titulo: meta.titulo,
          valor_meta: meta.valorMeta,
          valor_atual: meta.valorAtual,
          progresso: meta.progresso,
          prazo: meta.prazo,
          categoria: meta.categoria,
          status: meta.status,
          cor: meta.cor
        }) as TablesUpdate<'metas'>)
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
      invalidarAtual();
    } catch (error) {
      setMetas(previous);
      logger.error('Erro ao atualizar meta:', error);
      throw error;
    }
  };

  const deleteMeta = async (id: string) => {
    const previous = metas;
    setMetas(prev => prev.filter(m => m.id !== id));
    try {
      const { error } = await supabase.from('metas').delete().eq('id', id).eq('user_id', user!.id);
      if (error) throw error;
      invalidarAtual();
    } catch (error) {
      setMetas(previous);
      logger.error('Erro ao excluir meta:', error);
      throw error;
    }
  };

  // ---------------------------------------------------------------- equipe

  const addMembroEquipe = async (membro: Omit<MembroEquipe, 'id'>) => {
    if (!user || !currentDashboard) return;
    const tempId = `temp-${Date.now()}`;
    setMembrosEquipe(prev => [{ ...membro, id: tempId } as MembroEquipe, ...prev]);
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
      setMembrosEquipe(prev => prev.map(m => (m.id === tempId ? mapearMembro(data) : m)));
      invalidarAtual();
    } catch (error) {
      setMembrosEquipe(prev => prev.filter(m => m.id !== tempId));
      logger.error('Erro ao adicionar membro da equipe:', error);
      throw error;
    }
  };

  const updateMembroEquipe = async (id: string, membro: Partial<MembroEquipe>) => {
    const previous = membrosEquipe;
    setMembrosEquipe(prev => prev.map(m => (m.id === id ? { ...m, ...membro } : m)));
    try {
      const { error } = await supabase
        .from('equipe_membros')
        .update(definidos({
          nome: membro.nome,
          email: membro.email,
          telefone: membro.telefone,
          cargo: membro.cargo,
          salario: membro.salario,
          status: membro.status,
          periodicidade: membro.periodicidade,
          data_admissao: membro.dataAdmissao
        }) as TablesUpdate<'equipe_membros'>)
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
      invalidarAtual();
    } catch (error) {
      setMembrosEquipe(previous);
      logger.error('Erro ao atualizar membro da equipe:', error);
      throw error;
    }
  };

  const deleteMembroEquipe = async (id: string) => {
    const previous = membrosEquipe;
    setMembrosEquipe(prev => prev.filter(m => m.id !== id));
    try {
      const { error } = await supabase.from('equipe_membros').delete().eq('id', id).eq('user_id', user!.id);
      if (error) throw error;
      invalidarAtual();
    } catch (error) {
      setMembrosEquipe(previous);
      logger.error('Erro ao excluir membro da equipe:', error);
      throw error;
    }
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
      carregarDados: recarregar
    }}>
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
