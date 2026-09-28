// Recorrência de lançamentos e vencimentos. Espelha as funções SQL `proxima_ocorrencia` e
// `calcular_proxima_data` (migração 20260927120100): o front usa para pré-visualizar e o banco para gerar.

import { type DataISO, ehDataISO, somarDias, somarMeses } from './datas.ts';

export const TIPOS_RECORRENCIA = [
  'diaria',
  'semanal',
  'quinzenal',
  'mensal',
  'bimestral',
  'trimestral',
  'semestral',
  'anual',
] as const;

export type TipoRecorrencia = (typeof TIPOS_RECORRENCIA)[number];

export const ROTULOS_RECORRENCIA: Record<TipoRecorrencia, string> = {
  diaria: 'Diária',
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

const MESES: Partial<Record<TipoRecorrencia, number>> = {
  mensal: 1,
  bimestral: 2,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

const DIAS: Partial<Record<TipoRecorrencia, number>> = {
  diaria: 1,
  semanal: 7,
  quinzenal: 15,
};

export function ehTipoRecorrencia(valor: unknown): valor is TipoRecorrencia {
  return typeof valor === 'string' && (TIPOS_RECORRENCIA as readonly string[]).includes(valor);
}

/**
 * Próxima ocorrência depois de `data`. Recorrências mensais ou maiores mantêm o dia-âncora
 * (normalmente o dia da primeira ocorrência), limitado ao fim do mês: 31/01 → 28/02 → 31/03.
 * Retorna null para tipos desconhecidos.
 */
export function proximaOcorrencia(data: DataISO, tipo: string, diaAncora?: number): DataISO | null {
  if (!ehTipoRecorrencia(tipo)) return null;
  const dias = DIAS[tipo];
  if (dias) return somarDias(data, dias);
  const meses = MESES[tipo];
  return meses ? somarMeses(data, meses, diaAncora) : null;
}

export interface RecorrenciaDoLancamento {
  recorrente: boolean;
  tipo_recorrencia: TipoRecorrencia | null;
  proxima_data: DataISO | null;
}

/**
 * Campos de recorrência gravados junto com um lançamento. `proxima_data` é a próxima cópia que o banco
 * vai gerar: a data de início escolhida quando é posterior ao lançamento, senão a ocorrência seguinte a
 * ele (uma data de início igual ou anterior ao lançamento geraria uma cópia duplicada).
 */
export function recorrenciaDoLancamento(
  data: DataISO,
  recorrente: boolean | null | undefined,
  tipo: string | null | undefined,
  inicio?: string | null,
): RecorrenciaDoLancamento {
  if (!recorrente || !ehTipoRecorrencia(tipo) || !ehDataISO(data)) {
    return { recorrente: false, tipo_recorrencia: null, proxima_data: null };
  }
  const proxima = ehDataISO(inicio) && inicio > data ? inicio : proximaOcorrencia(data, tipo);
  return { recorrente: true, tipo_recorrencia: tipo, proxima_data: proxima };
}

/**
 * Todas as ocorrências de `primeira` até `limite` (inclusive), no máximo `maximo`.
 * Usado para pré-visualizar o calendário e para projeções de fluxo de caixa.
 */
export function ocorrenciasAte(
  primeira: DataISO,
  tipo: string,
  limite: DataISO,
  diaAncora?: number,
  maximo = 400,
): DataISO[] {
  const datas: DataISO[] = [];
  let atual: DataISO | null = primeira;
  while (atual && atual <= limite && datas.length < maximo) {
    datas.push(atual);
    atual = proximaOcorrencia(atual, tipo, diaAncora);
  }
  return datas;
}

export type SituacaoVencimento = 'pago' | 'vencido' | 'vence_hoje' | 'a_vencer';

/** Situação de um vencimento em relação a hoje (datas-calendário; vence no próprio dia, não na véspera). */
export function situacaoVencimento(vencimento: DataISO, pago: boolean, hoje: DataISO): SituacaoVencimento {
  if (pago) return 'pago';
  if (vencimento < hoje) return 'vencido';
  if (vencimento === hoje) return 'vence_hoje';
  return 'a_vencer';
}
