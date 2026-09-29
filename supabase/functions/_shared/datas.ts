// Datas-calendário da plataforma. Regras puras, sem dependências, usadas pelo front e pelas functions.
//
// Um lançamento, um vencimento ou uma recorrência são DATAS (AAAA-MM-DD), não instantes: não têm fuso.
// Só o "hoje" depende do fuso, e o da plataforma é America/Sao_Paulo. Toda a aritmética abaixo trabalha
// sobre os componentes da data (via Date.UTC), então o resultado não muda com o fuso do navegador/servidor.

export const FUSO_PLATAFORMA = 'America/Sao_Paulo';

/** Data-calendário no formato AAAA-MM-DD. */
export type DataISO = string;

const PADRAO_DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** true se o valor é uma data-calendário AAAA-MM-DD válida (ex.: rejeita 2026-02-30). */
export function ehDataISO(valor: unknown): valor is DataISO {
  if (typeof valor !== 'string') return false;
  const m = PADRAO_DATA_ISO.exec(valor);
  if (!m) return false;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

function componentes(data: DataISO): [number, number, number] {
  const m = PADRAO_DATA_ISO.exec(data);
  if (!m) throw new RangeError(`Data inválida: ${data}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function deUTC(d: Date): DataISO {
  const ano = String(d.getUTCFullYear()).padStart(4, '0');
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(d.getUTCDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** Data de hoje no fuso da plataforma (ou no fuso informado). */
export function hojeISO(agora: Date = new Date(), fuso: string = FUSO_PLATAFORMA): DataISO {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(agora);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

/** Converte uma data escolhida num calendário local (componentes locais) para AAAA-MM-DD. */
export function paraDataISO(data: Date): DataISO {
  const ano = String(data.getFullYear()).padStart(4, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** Meia-noite local da data, para componentes que exigem Date (ex.: date-fns, calendário). */
export function paraDateLocal(data: DataISO): Date {
  const [ano, mes, dia] = componentes(data);
  return new Date(ano, mes - 1, dia);
}

export function somarDias(data: DataISO, dias: number): DataISO {
  const [ano, mes, dia] = componentes(data);
  return deUTC(new Date(Date.UTC(ano, mes - 1, dia + dias)));
}

export function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/**
 * Soma meses preservando o dia (ou o dia-âncora informado), limitado ao último dia do mês:
 * 31/01 + 1 mês = 28/02 (ou 29/02); 28/02 + 1 mês com âncora 31 = 31/03.
 */
export function somarMeses(data: DataISO, meses: number, diaAncora?: number): DataISO {
  const [ano, mes, dia] = componentes(data);
  const indice = ano * 12 + (mes - 1) + meses;
  const novoAno = Math.floor(indice / 12);
  const novoMes = (indice % 12) + 1;
  const alvo = Math.min(diaAncora ?? dia, ultimoDiaDoMes(novoAno, novoMes));
  return deUTC(new Date(Date.UTC(novoAno, novoMes - 1, alvo)));
}

/** Dias corridos de `de` até `ate` (positivo se `ate` é depois). */
export function diferencaEmDias(de: DataISO, ate: DataISO): number {
  const [a1, m1, d1] = componentes(de);
  const [a2, m2, d2] = componentes(ate);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

/** 0 = domingo … 6 = sábado. */
export function diaDaSemana(data: DataISO): number {
  const [ano, mes, dia] = componentes(data);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

export function inicioDoMes(data: DataISO): DataISO {
  const [ano, mes] = componentes(data);
  return deUTC(new Date(Date.UTC(ano, mes - 1, 1)));
}

export function fimDoMes(data: DataISO): DataISO {
  const [ano, mes] = componentes(data);
  return deUTC(new Date(Date.UTC(ano, mes - 1, ultimoDiaDoMes(ano, mes))));
}

/** DD/MM/AAAA. */
export function formatarDataBR(data: DataISO): string {
  const [ano, mes, dia] = componentes(data);
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
}

export interface Intervalo {
  inicio: DataISO;
  fim: DataISO;
}

/** true se a data está no intervalo (inclusivo). Datas ISO comparam como texto. */
export function dataNoIntervalo(data: DataISO | null | undefined, intervalo: Intervalo): boolean {
  if (!data) return false;
  const dia = data.slice(0, 10);
  return dia >= intervalo.inicio && dia <= intervalo.fim;
}

export type FiltroPeriodo =
  | 'hoje'
  | 'ontem'
  | 'esta-semana'
  | 'semana-passada'
  | 'este-mes'
  | 'mes-passado'
  | 'ultimos-30-dias'
  | 'ultimos-90-dias'
  | 'este-ano'
  | 'ano-passado';

/**
 * Intervalo de datas de cada filtro de período, calculado a partir de "hoje".
 * Os períodos em curso terminam hoje (lançamentos futuros não entram), como sempre foi na plataforma.
 */
export function intervaloDoFiltro(filtro: string, hoje: DataISO = hojeISO()): Intervalo {
  const [ano] = componentes(hoje);
  switch (filtro as FiltroPeriodo) {
    case 'hoje':
      return { inicio: hoje, fim: hoje };
    case 'ontem': {
      const ontem = somarDias(hoje, -1);
      return { inicio: ontem, fim: ontem };
    }
    case 'esta-semana':
      return { inicio: somarDias(hoje, -diaDaSemana(hoje)), fim: hoje };
    case 'semana-passada': {
      const inicio = somarDias(hoje, -diaDaSemana(hoje) - 7);
      return { inicio, fim: somarDias(inicio, 6) };
    }
    case 'este-mes':
      return { inicio: inicioDoMes(hoje), fim: hoje };
    case 'mes-passado': {
      const inicio = somarMeses(inicioDoMes(hoje), -1);
      return { inicio, fim: fimDoMes(inicio) };
    }
    case 'ultimos-30-dias':
      return { inicio: somarDias(hoje, -30), fim: hoje };
    case 'ultimos-90-dias':
      return { inicio: somarDias(hoje, -90), fim: hoje };
    case 'este-ano':
      return { inicio: `${ano}-01-01`, fim: hoje };
    case 'ano-passado':
      return { inicio: `${ano - 1}-01-01`, fim: `${ano - 1}-12-31` };
    default:
      return { inicio: hoje, fim: hoje };
  }
}

/**
 * Período usado como comparação de crescimento para cada filtro (mesmas regras que o painel já usava):
 * semanas e meses anteriores completos, janelas móveis deslocadas e ano anterior inteiro.
 */
export function intervaloAnterior(filtro: string, hoje: DataISO = hojeISO()): Intervalo {
  const [ano] = componentes(hoje);
  const inicioSemana = somarDias(hoje, -diaDaSemana(hoje));
  switch (filtro as FiltroPeriodo) {
    case 'ontem': {
      const d = somarDias(hoje, -2);
      return { inicio: d, fim: d };
    }
    case 'esta-semana':
      return { inicio: somarDias(inicioSemana, -7), fim: somarDias(inicioSemana, -1) };
    case 'semana-passada':
      return { inicio: somarDias(inicioSemana, -14), fim: somarDias(inicioSemana, -8) };
    case 'este-mes': {
      const inicio = somarMeses(inicioDoMes(hoje), -1);
      return { inicio, fim: fimDoMes(inicio) };
    }
    case 'mes-passado': {
      const inicio = somarMeses(inicioDoMes(hoje), -2);
      return { inicio, fim: fimDoMes(inicio) };
    }
    case 'ultimos-30-dias':
      return { inicio: somarDias(hoje, -60), fim: somarDias(hoje, -31) };
    case 'ultimos-90-dias':
      return { inicio: somarDias(hoje, -180), fim: somarDias(hoje, -91) };
    case 'este-ano':
      return { inicio: `${ano - 1}-01-01`, fim: `${ano - 1}-12-31` };
    case 'ano-passado':
      return { inicio: `${ano - 2}-01-01`, fim: `${ano - 2}-12-31` };
    case 'hoje':
    default: {
      const d = somarDias(hoje, -1);
      return { inicio: d, fim: d };
    }
  }
}

/** Quantidade de dias do período (para médias diárias). Períodos em curso contam até hoje. */
export function diasNoIntervalo(intervalo: Intervalo): number {
  return diferencaEmDias(intervalo.inicio, intervalo.fim) + 1;
}
