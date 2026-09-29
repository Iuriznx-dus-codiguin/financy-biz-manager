// Filtros de período das telas. Datas de lançamento são datas-calendário (AAAA-MM-DD) e "hoje" é o de
// Brasília: antes, `new Date('AAAA-MM-DD')` (meia-noite UTC) e `toISOString()` deslocavam os lançamentos
// um dia depois das 21h e jogavam o dia 1º no mês anterior (AUDITORIA A-13).
import { dataNoIntervalo, hojeISO, type Intervalo, intervaloDoFiltro, paraDataISO, paraDateLocal } from '@/shared/lib/datas';

/** Intervalo do filtro em datas-calendário (início e fim inclusivos). */
export const intervaloDoPeriodo = (filter: string): Intervalo => intervaloDoFiltro(filter, hojeISO());

/** Intervalo do filtro como Date local: início à 00:00 e fim às 23:59:59.999. */
export const getDateRange = (filter: string) => {
  const { inicio, fim } = intervaloDoPeriodo(filter);
  const end = paraDateLocal(fim);
  end.setHours(23, 59, 59, 999);
  return { start: paraDateLocal(inicio), end };
};

export const formatDateForFilter = (date: Date): string => paraDataISO(date);

export const isDateInRange = (dateString: string, filter: string): boolean =>
  dataNoIntervalo(dateString?.slice(0, 10), intervaloDoPeriodo(filter));
