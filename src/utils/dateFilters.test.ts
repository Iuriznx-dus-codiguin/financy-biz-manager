import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDateForFilter, getDateRange, isDateInRange } from './dateFilters';

// 27/09/2026 às 23:30 em Brasília = 28/09/2026 02:30 UTC.
const noiteEmBrasilia = new Date('2026-09-28T02:30:00Z');

describe('filtros de data (fuso America/Sao_Paulo)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(noiteEmBrasilia);
  });
  afterEach(() => vi.useRealTimers());

  it('"hoje" continua sendo o dia de Brasília depois das 21h (corrige A-13)', () => {
    expect(formatDateForFilter(new Date())).toBe('2026-09-27');
    expect(isDateInRange('2026-09-27', 'hoje')).toBe(true);
    expect(isDateInRange('2026-09-28', 'hoje')).toBe(false);
  });

  it('o dia 1º pertence ao próprio mês (corrige A-13)', () => {
    vi.setSystemTime(new Date('2026-10-15T15:00:00Z'));
    expect(isDateInRange('2026-10-01', 'este-mes')).toBe(true);
    expect(isDateInRange('2026-10-01', 'mes-passado')).toBe(false);
    expect(isDateInRange('2026-09-30', 'mes-passado')).toBe(true);
  });

  it('aceita timestamps e ignora datas vazias', () => {
    expect(isDateInRange('2026-09-27T10:00:00', 'hoje')).toBe(true);
    expect(isDateInRange('', 'hoje')).toBe(false);
  });

  it('getDateRange devolve o dia inteiro em horário local', () => {
    const { start, end } = getDateRange('hoje');
    expect(formatDateForFilter(start)).toBe('2026-09-27');
    expect(formatDateForFilter(end)).toBe('2026-09-27');
    expect(end.getHours()).toBe(23);
  });
});
