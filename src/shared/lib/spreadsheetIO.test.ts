import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseDate, parseNumber } from '@/shared/lib/spreadsheetIO';

describe('parseNumber (valores de planilha)', () => {
  it('aceita formatos brasileiro e internacional', () => {
    expect(parseNumber('R$ 1.234,56')).toBe(1234.56);
    expect(parseNumber('1234.56')).toBe(1234.56);
    expect(parseNumber('1.234')).toBe(1234);
    expect(parseNumber(99.9)).toBe(99.9);
  });

  it('vazio ou inválido vira 0', () => {
    expect(parseNumber('')).toBe(0);
    expect(parseNumber('abc')).toBe(0);
    expect(parseNumber(null)).toBe(0);
  });
});

describe('parseDate (datas de planilha)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 23h30 de 10/03/2026 em Brasília = 02h30 de 11/03 em UTC.
    vi.setSystemTime(new Date('2026-03-11T02:30:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('converte DD/MM/AAAA e mantém AAAA-MM-DD', () => {
    expect(parseDate('05/02/2026')).toBe('2026-02-05');
    expect(parseDate('5/2/26')).toBe('2026-02-05');
    expect(parseDate('2026-02-05T10:00:00')).toBe('2026-02-05');
  });

  it('data de célula (Date UTC do exceljs)', () => {
    expect(parseDate(new Date(Date.UTC(2026, 1, 5)))).toBe('2026-02-05');
  });

  it('vazia ou inválida vira hoje em Brasília, não o dia seguinte em UTC', () => {
    expect(parseDate('')).toBe('2026-03-10');
    expect(parseDate('31/02/2026')).toBe('2026-03-10');
  });
});
