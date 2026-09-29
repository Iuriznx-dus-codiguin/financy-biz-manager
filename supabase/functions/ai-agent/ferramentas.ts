// Ferramentas do assistente: definição para o modelo, validação dos argumentos e execução.
// Tudo é filtrado por usuário e, quando informado, pelo dashboard (antes, excluir/alterar ignorava o
// dashboard e aceitava valores negativos, datas inválidas e textos sem limite).
import { lancamentosDoPeriodo } from '../_shared/consultas.ts';
import { ehDataISO, hojeISO } from '../_shared/datas.ts';
import { arredondarReais, formatarBRL, interpretarValor, somarReais } from '../_shared/dinheiro.ts';
import type { SupabaseClient } from '../_shared/supabase.ts';
import { invalidarContexto } from './contexto.ts';
import { intervaloDoPeriodo, PERIODOS } from './periodos.ts';

export interface ResultadoFerramenta {
  success: boolean;
  type?: string;
  message?: string;
  error?: string;
  id?: number;
  data?: unknown;
}

type Args = Record<string, unknown>;
type Linha = Record<string, unknown> & { id: number; valor: number; categoria: string; data: string; descricao: string };

const FORMAS_PAGAMENTO = 'Dinheiro, Cartão de Crédito, Cartão de Débito, Pix, Boleto, Transferência';
const TIPOS_CONSULTA = ['receitas', 'despesas', 'lucro', 'saldo', 'por_categoria', 'por_periodo', 'impostos', 'metas', 'todas_transacoes'];

const lancamento = (nome: string, rotulo: string, extra: [string, string]) => ({
  type: 'function',
  function: {
    name: nome,
    description: `Registrar ${rotulo} no sistema financeiro do usuário`,
    parameters: {
      type: 'object',
      properties: {
        descricao: { type: 'string', description: 'Descrição curta' },
        valor: { type: 'number', description: 'Valor em reais, positivo' },
        categoria: { type: 'string', description: 'Categoria' },
        data: { type: 'string', description: 'Data AAAA-MM-DD. Omita para usar hoje.' },
        forma_pagamento: { type: 'string', description: `Forma de pagamento: ${FORMAS_PAGAMENTO}` },
        [extra[0]]: { type: 'string', description: extra[1] },
      },
      required: ['descricao', 'valor', 'categoria'],
      additionalProperties: false,
    },
  },
});

export const FERRAMENTAS = [
  lancamento('register_expense', 'uma nova despesa/gasto', ['fornecedor', 'Fornecedor ou estabelecimento (opcional)']),
  lancamento('register_revenue', 'uma nova receita/entrada', ['cliente', 'Nome do cliente (opcional)']),
  {
    type: 'function',
    function: {
      name: 'query_financial_data',
      description:
        'Consultar dados financeiros do usuário (receitas, despesas, lucro, saldo, impostos, metas). Use SEMPRE que o usuário perguntar sobre valores. Inclui lançamentos feitos na plataforma e pelo WhatsApp.',
      parameters: {
        type: 'object',
        properties: {
          query_type: { type: 'string', enum: TIPOS_CONSULTA, description: "Tipo de consulta. 'todas_transacoes' lista receitas e despesas juntas." },
          periodo: { type: 'string', enum: [...PERIODOS], description: "Período. 'tudo' = todo o histórico." },
          categoria: { type: 'string', description: 'Filtrar por categoria (opcional)' },
        },
        required: ['query_type'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_transaction',
      description: 'Excluir uma receita ou despesa pelo ID',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['receita', 'despesa'] },
          id: { type: 'number', description: 'ID da transação' },
        },
        required: ['type', 'id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_transaction',
      description: 'Alterar uma receita ou despesa existente',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['receita', 'despesa'] },
          id: { type: 'number', description: 'ID da transação' },
          descricao: { type: 'string', description: 'Nova descrição (opcional)' },
          valor: { type: 'number', description: 'Novo valor (opcional)' },
          categoria: { type: 'string', description: 'Nova categoria (opcional)' },
          data: { type: 'string', description: 'Nova data AAAA-MM-DD (opcional)' },
        },
        required: ['type', 'id'],
        additionalProperties: false,
      },
    },
  },
];

export const NOMES_FERRAMENTAS = new Set(FERRAMENTAS.map((f) => f.function.name));

// ---------------------------------------------------------------- validação

class ArgumentoInvalido extends Error {}

function texto(valor: unknown, campo: string, maximo: number, obrigatorio = false): string | undefined {
  if (valor === undefined || valor === null || valor === '') {
    if (obrigatorio) throw new ArgumentoInvalido(`Informe ${campo}.`);
    return undefined;
  }
  if (typeof valor !== 'string' && typeof valor !== 'number') throw new ArgumentoInvalido(`${campo} inválido.`);
  const limpo = String(valor).trim().slice(0, maximo);
  if (!limpo && obrigatorio) throw new ArgumentoInvalido(`Informe ${campo}.`);
  return limpo || undefined;
}

function valorPositivo(valor: unknown, obrigatorio = true): number | undefined {
  if ((valor === undefined || valor === null || valor === '') && !obrigatorio) return undefined;
  const numero = interpretarValor(valor);
  if (numero === null || numero <= 0 || numero > 1_000_000_000) {
    throw new ArgumentoInvalido('O valor precisa ser um número positivo.');
  }
  return arredondarReais(numero);
}

function data(valor: unknown, padrao?: string): string | undefined {
  if (valor === undefined || valor === null || valor === '') return padrao;
  if (!ehDataISO(valor)) throw new ArgumentoInvalido('Data inválida. Use o formato AAAA-MM-DD.');
  return valor;
}

function idTransacao(valor: unknown): number {
  const id = Number(valor);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ArgumentoInvalido('ID de transação inválido.');
  return id;
}

function tabelaDoTipo(tipo: unknown): 'receitas' | 'despesas' {
  if (tipo === 'receita') return 'receitas';
  if (tipo === 'despesa') return 'despesas';
  throw new ArgumentoInvalido("Tipo deve ser 'receita' ou 'despesa'.");
}

// ---------------------------------------------------------------- execução

interface Escopo {
  supabase: SupabaseClient;
  userId: string;
  dashboardId: string | null;
}

async function registrar(escopo: Escopo, tabela: 'receitas' | 'despesas', args: Args): Promise<ResultadoFerramenta> {
  const despesa = tabela === 'despesas';
  const registro: Record<string, unknown> = {
    user_id: escopo.userId,
    descricao: texto(args.descricao, 'a descrição', 200, true),
    valor: valorPositivo(args.valor),
    categoria: texto(args.categoria, 'a categoria', 60) ?? 'outros',
    data: data(args.data, hojeISO()),
    forma_pagamento: texto(args.forma_pagamento, 'a forma de pagamento', 40) ?? 'Pix',
    status: 'paga',
  };
  if (escopo.dashboardId) registro.dashboard_id = escopo.dashboardId;
  const contraparte = texto(despesa ? args.fornecedor : args.cliente, despesa ? 'o fornecedor' : 'o cliente', 120);
  if (contraparte) registro[despesa ? 'fornecedor' : 'cliente'] = contraparte;

  const { data: criado, error } = await escopo.supabase.from(tabela).insert(registro).select('id').single();
  if (error) throw new Error(`Erro ao registrar ${despesa ? 'despesa' : 'receita'}: ${error.message}`);
  await invalidarContexto(escopo.supabase, escopo.userId, escopo.dashboardId);
  return {
    success: true,
    type: despesa ? 'expense_created' : 'revenue_created',
    message: `✅ ${despesa ? 'Despesa' : 'Receita'} "${registro.descricao}" de ${formatarBRL(registro.valor as number)} registrada.`,
    id: criado.id,
  };
}

// Filtro de dono e dashboard. `any` evita a instanciação profunda dos tipos do supabase-js (TS2589).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function doEscopo(consulta: any, escopo: Escopo): any {
  const doUsuario = consulta.eq('user_id', escopo.userId);
  return escopo.dashboardId ? doUsuario.eq('dashboard_id', escopo.dashboardId) : doUsuario;
}

async function excluir(escopo: Escopo, args: Args): Promise<ResultadoFerramenta> {
  const tabela = tabelaDoTipo(args.type);
  const id = idTransacao(args.id);
  const { data: apagados, error } = await doEscopo(escopo.supabase.from(tabela).delete().eq('id', id), escopo).select('id');
  if (error) throw new Error(`Erro ao excluir: ${error.message}`);
  const rotulo = tabela === 'receitas' ? 'Receita' : 'Despesa';
  if (!apagados?.length) return { success: false, error: `${rotulo} #${id} não encontrada neste perfil.` };
  await invalidarContexto(escopo.supabase, escopo.userId, escopo.dashboardId);
  return { success: true, type: 'transaction_deleted', message: `✅ ${rotulo} #${id} excluída.` };
}

async function alterar(escopo: Escopo, args: Args): Promise<ResultadoFerramenta> {
  const tabela = tabelaDoTipo(args.type);
  const id = idTransacao(args.id);
  const campos: Record<string, unknown> = {};
  const descricao = texto(args.descricao, 'a descrição', 200);
  const valor = valorPositivo(args.valor, false);
  const categoria = texto(args.categoria, 'a categoria', 60);
  const novaData = data(args.data);
  if (descricao) campos.descricao = descricao;
  if (valor !== undefined) campos.valor = valor;
  if (categoria) campos.categoria = categoria;
  if (novaData) campos.data = novaData;
  if (!Object.keys(campos).length) return { success: false, error: 'Nenhum campo para atualizar.' };

  const { data: alterados, error } = await doEscopo(escopo.supabase.from(tabela).update(campos).eq('id', id), escopo).select('id');
  if (error) throw new Error(`Erro ao atualizar: ${error.message}`);
  const rotulo = tabela === 'receitas' ? 'Receita' : 'Despesa';
  if (!alterados?.length) return { success: false, error: `${rotulo} #${id} não encontrada neste perfil.` };
  await invalidarContexto(escopo.supabase, escopo.userId, escopo.dashboardId);
  return { success: true, type: 'transaction_updated', message: `✅ ${rotulo} #${id} atualizada.` };
}

function somaPorCategoria(linhas: Linha[]): Record<string, number> {
  const grupos: Record<string, number[]> = {};
  for (const l of linhas) (grupos[l.categoria ?? 'outros'] ??= []).push(Number(l.valor));
  return Object.fromEntries(Object.entries(grupos).map(([c, v]) => [c, somarReais(v)]));
}

const resumo = (l: Linha, tipo?: string) => ({
  id: l.id, data: l.data, descricao: l.descricao, categoria: l.categoria, valor: Number(l.valor), ...(tipo ? { tipo } : {}),
});

async function consultar(escopo: Escopo, args: Args): Promise<ResultadoFerramenta> {
  const tipo = String(args.query_type ?? '');
  if (!TIPOS_CONSULTA.includes(tipo)) return { success: false, error: 'Tipo de consulta não suportado' };
  const { inicio, fim } = intervaloDoPeriodo(typeof args.periodo === 'string' ? args.periodo : undefined);
  const periodo = `${inicio} a ${fim}`;

  if (tipo === 'impostos') {
    const { data: linhas, error } = await doEscopo(escopo.supabase.from('impostos').select('*'), escopo)
      .gte('vencimento', inicio).lte('vencimento', fim).order('vencimento', { ascending: true }).limit(200);
    if (error) throw new Error(`Erro ao consultar impostos: ${error.message}`);
    const impostos = (linhas ?? []) as Record<string, unknown>[];
    // Percentuais incidem sobre receitas e não somam como valor em reais.
    const fixos = impostos.filter((i) => (i.valor_tipo ?? 'fixo') !== 'porcentagem');
    return {
      success: true,
      data: {
        total_pago: somarReais(fixos.filter((i) => i.pago).map((i) => Number(i.valor))),
        total_pendente: somarReais(fixos.filter((i) => !i.pago).map((i) => Number(i.valor))),
        count: impostos.length,
        periodo,
        impostos: impostos.map((i: Record<string, unknown>) => ({
          descricao: i.descricao, tipo: i.tipo, valor: Number(i.valor), valor_tipo: i.valor_tipo ?? 'fixo',
          vencimento: i.vencimento, pago: i.pago,
        })),
      },
    };
  }

  if (tipo === 'metas') {
    const { data: linhas, error } = await doEscopo(escopo.supabase.from('metas').select('titulo, valor_meta, valor_atual, progresso, prazo, status'), escopo).limit(50);
    if (error) throw new Error(`Erro ao consultar metas: ${error.message}`);
    return {
      success: true,
      data: { metas: ((linhas ?? []) as Record<string, unknown>[]).map((m) => ({ ...m, valor_meta: Number(m.valor_meta), valor_atual: Number(m.valor_atual) })) },
    };
  }

  const filtro = {
    userId: escopo.userId,
    dashboardId: escopo.dashboardId,
    inicio,
    fim,
    categoria: texto(args.categoria, 'a categoria', 60) ?? null,
  };
  const colunas = 'id, data, descricao, categoria, valor';
  const [receitas, despesas] = await Promise.all([
    lancamentosDoPeriodo<Linha>(escopo.supabase, 'receitas', colunas, filtro),
    lancamentosDoPeriodo<Linha>(escopo.supabase, 'despesas', colunas, filtro),
  ]);
  const totalReceitas = somarReais(receitas.map((r) => r.valor));
  const totalDespesas = somarReais(despesas.map((d) => d.valor));
  const totais = { total_receitas: totalReceitas, total_despesas: totalDespesas, lucro: arredondarReais(totalReceitas - totalDespesas), periodo };

  if (['receitas', 'despesas', 'lucro', 'saldo'].includes(tipo)) return { success: true, data: totais };
  if (tipo === 'por_categoria') {
    return {
      success: true,
      data: { ...totais, receitas_por_categoria: somaPorCategoria(receitas), despesas_por_categoria: somaPorCategoria(despesas) },
    };
  }
  if (tipo === 'todas_transacoes') {
    return {
      success: true,
      data: {
        ...totais,
        receitas: receitas.slice(0, 20).map((r) => resumo(r, 'receita')),
        despesas: despesas.slice(0, 20).map((d) => resumo(d, 'despesa')),
        num_receitas: receitas.length,
        num_despesas: despesas.length,
      },
    };
  }
  return {
    success: true,
    data: {
      ...totais,
      num_receitas: receitas.length,
      num_despesas: despesas.length,
      ultimas_receitas: receitas.slice(0, 10).map((r) => resumo(r)),
      ultimas_despesas: despesas.slice(0, 10).map((d) => resumo(d)),
    },
  };
}

/** Executa uma ferramenta. Erros de validação voltam como { success: false } para o modelo explicar. */
export async function executarFerramenta(escopo: Escopo, nome: string, args: Args): Promise<ResultadoFerramenta> {
  try {
    switch (nome) {
      case 'register_expense':
        return await registrar(escopo, 'despesas', args);
      case 'register_revenue':
        return await registrar(escopo, 'receitas', args);
      case 'query_financial_data':
        return await consultar(escopo, args);
      case 'delete_transaction':
        return await excluir(escopo, args);
      case 'update_transaction':
        return await alterar(escopo, args);
      default:
        return { success: false, error: `Ferramenta desconhecida: ${nome}` };
    }
  } catch (erro) {
    if (erro instanceof ArgumentoInvalido) return { success: false, error: erro.message };
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    // Sem assinatura ativa a RLS recusa a escrita; a mensagem do banco não ajuda o usuário.
    if (/row-level security/i.test(mensagem)) return { success: false, error: 'Operação não permitida para esta conta.' };
    return { success: false, error: mensagem };
  }
}
