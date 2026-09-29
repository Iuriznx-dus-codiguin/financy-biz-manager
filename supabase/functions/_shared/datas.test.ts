import { describe, expect, it } from 'vitest';
import {
  dataNoIntervalo, diasNoIntervalo, ehDataISO, formatarDataBR, hojeISO, intervaloAnterior, intervaloDoFiltro,
  paraDataISO, paraDateLocal, somarDias, somarMeses,
} from './datas';

describe('hojeISO', () => {
  it('usa o dia de Brasília mesmo depois das 21h (quando em UTC já é amanhã)', () => {
    expect(hojeISO(new Date('2026-09-28T02:30:00Z'))).toBe('2026-09-27');
  });
  it('vira o dia à meia-noite de Brasília', () => {
    expect(hojeISO(new Date('2026-09-28T03:00:00Z'))).toBe('2026-09-28');
  });
});

describe('validação e conversões', () => {
  it('valida datas-calendário', () => {
    expect(ehDataISO('2026-02-28')).toBe(true);
    expect(ehDataISO('2024-02-29')).toBe(true);
    expect(ehDataISO('2026-02-29')).toBe(false);
    expect(ehDataISO('27/09/2026')).toBe(false);
    expect(ehDataISO(null)).toBe(false);
  });
  it('converte entre Date local e AAAA-MM-DD sem trocar o dia', () => {
    expect(paraDataISO(paraDateLocal('2026-10-01'))).toBe('2026-10-01');
    expect(formatarDataBR('2026-09-07')).toBe('07/09/2026');
  });
});

describe('aritmética de datas', () => {
  it('soma dias atravessando meses e anos', () => {
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('soma meses limitando ao fim do mês e respeitando o dia-âncora', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(somarMeses('2026-02-28', 1, 31)).toBe('2026-03-31');
    expect(somarMeses('2024-01-31', 1)).toBe('2024-02-29');
    expect(somarMeses('2026-11-15', 3)).toBe('2027-02-15');
    expect(somarMeses('2026-01-15', -2)).toBe('2025-11-15');
  });
});

describe('filtros de período', () => {
  const hoje = '2026-09-27'; // domingo
  it('"hoje" contém só hoje', () => {
    const intervalo = intervaloDoFiltro('hoje', hoje);
    expect(dataNoIntervalo('2026-09-27', intervalo)).toBe(true);
    expect(dataNoIntervalo('2026-09-28', intervalo)).toBe(false);
  });
  it('"este mês" começa no dia 1º e termina hoje', () => {
    expect(intervaloDoFiltro('este-mes', hoje)).toEqual({ inicio: '2026-09-01', fim: '2026-09-27' });
  });
  it('"mês passado" é o mês anterior inteiro', () => {
    expect(intervaloDoFiltro('mes-passado', '2026-03-31')).toEqual({ inicio: '2026-02-01', fim: '2026-02-28' });
  });
  it('semanas começam no domingo', () => {
    expect(intervaloDoFiltro('esta-semana', '2026-09-30')).toEqual({ inicio: '2026-09-27', fim: '2026-09-30' });
    expect(intervaloDoFiltro('semana-passada', '2026-09-30')).toEqual({ inicio: '2026-09-20', fim: '2026-09-26' });
  });
  it('comparações usam os mesmos períodos anteriores do painel', () => {
    expect(intervaloAnterior('este-mes', hoje)).toEqual({ inicio: '2026-08-01', fim: '2026-08-31' });
    expect(intervaloAnterior('ultimos-30-dias', hoje)).toEqual({ inicio: '2026-07-29', fim: '2026-08-27' });
    expect(intervaloAnterior('este-ano', hoje)).toEqual({ inicio: '2025-01-01', fim: '2025-12-31' });
  });
  it('conta os dias do período', () => {
    expect(diasNoIntervalo(intervaloDoFiltro('este-mes', hoje))).toBe(27);
  });
  it('aceita timestamps completos comparando só a data', () => {
    expect(dataNoIntervalo('2026-09-27T23:59:00', intervaloDoFiltro('hoje', hoje))).toBe(true);
  });
});
