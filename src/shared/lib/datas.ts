// Datas-calendário (AAAA-MM-DD, sem fuso) e "hoje" de Brasília.
// Mesma implementação usada pelas edge functions (testada em supabase/functions/_shared/datas.test.ts).
import { ehDataISO as ehData, paraDateLocal as dateLocal } from '../../../supabase/functions/_shared/datas.ts';

export * from '../../../supabase/functions/_shared/datas.ts';


/**
 * Date local para exibir ou agrupar uma data-calendário ("2026-09-27" → 27/09 00:00 no horário local).
 * `new Date('2026-09-27')` é meia-noite UTC — 26/09 às 21h no Brasil — e mostrava o dia anterior.
 * Timestamps completos (com hora) seguem o parse normal.
 */
export function dataLocal(valor: string | Date | null | undefined): Date {
  if (valor instanceof Date) return valor;
  if (!valor) return new Date(NaN);
  const dia = valor.slice(0, 10);
  return valor.length === 10 && ehData(dia) ? dateLocal(dia) : new Date(valor);
}

/** "27/09/2026" a partir de uma data-calendário ou timestamp. */
export function formatarData(valor: string | Date | null | undefined): string {
  const data = dataLocal(valor);
  return Number.isNaN(data.getTime()) ? '' : data.toLocaleDateString('pt-BR');
}
