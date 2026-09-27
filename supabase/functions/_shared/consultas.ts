// Consultas paginadas. O PostgREST devolve no máximo `max_rows` (1000) linhas por requisição mesmo com
// .limit() maior — antes, os totais de quem tinha mais de mil lançamentos no período saíam errados.
import { somarReais } from './dinheiro.ts';
import type { SupabaseClient } from './supabase.ts';

export const TAMANHO_PAGINA = 1000;

export interface FiltroLancamentos {
  userId: string;
  dashboardId?: string | null;
  inicio: string;
  fim: string;
  categoria?: string | null;
}

/** Busca todas as linhas (até `maximoPaginas` páginas) de receitas ou despesas no período. */
export async function lancamentosDoPeriodo<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  tabela: 'receitas' | 'despesas',
  colunas: string,
  filtro: FiltroLancamentos,
  maximoPaginas = 20,
): Promise<T[]> {
  const linhas: T[] = [];
  for (let pagina = 0; pagina < maximoPaginas; pagina++) {
    let consulta = supabase
      .from(tabela)
      .select(colunas)
      .eq('user_id', filtro.userId)
      .gte('data', filtro.inicio)
      .lte('data', filtro.fim);
    if (filtro.dashboardId) consulta = consulta.eq('dashboard_id', filtro.dashboardId);
    if (filtro.categoria) consulta = consulta.eq('categoria', filtro.categoria);
    const de = pagina * TAMANHO_PAGINA;
    const { data, error } = await consulta.order('data', { ascending: false }).order('id').range(de, de + TAMANHO_PAGINA - 1);
    if (error) throw new Error(`Erro ao consultar ${tabela}: ${error.message}`);
    linhas.push(...((data ?? []) as T[]));
    if (!data || data.length < TAMANHO_PAGINA) break;
  }
  return linhas;
}

export async function totalDoPeriodo(
  supabase: SupabaseClient,
  tabela: 'receitas' | 'despesas',
  filtro: FiltroLancamentos,
): Promise<number> {
  const linhas = await lancamentosDoPeriodo<{ valor: number }>(supabase, tabela, 'id, valor', filtro);
  return somarReais(linhas.map((l) => l.valor));
}
