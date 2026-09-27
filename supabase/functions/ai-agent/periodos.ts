// Períodos aceitos pela ferramenta de consulta do assistente, em datas de Brasília.
import { hojeISO, type Intervalo, intervaloDoFiltro } from '../_shared/datas.ts';

export const PERIODOS = [
  'hoje', 'ontem', 'esta_semana', 'este_mes', 'mes_passado', 'ultimos_30_dias', 'ultimos_90_dias',
  'este_ano', 'ano_passado', 'tudo',
] as const;

export type Periodo = (typeof PERIODOS)[number];

export function intervaloDoPeriodo(periodo: string | undefined, hoje = hojeISO()): Intervalo {
  if (periodo === 'tudo') return { inicio: '2000-01-01', fim: hoje };
  const filtro = (PERIODOS as readonly string[]).includes(periodo ?? '') ? periodo!.replaceAll('_', '-') : 'este-mes';
  return intervaloDoFiltro(filtro, hoje);
}
