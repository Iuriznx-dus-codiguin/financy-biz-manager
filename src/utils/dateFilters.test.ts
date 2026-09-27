import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDateForFilter, isDateInRange } from './dateFilters';

// 27/09/2026 às 23:30 em Brasília = 28/09/2026 02:30 UTC.
const noiteEmBrasilia = new Date('2026-09-28T02:30:00Z');

describe('filtros de data (fuso America/Sao_Paulo)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(noiteEmBrasilia);
  });
  afterEach(() => vi.useRealTimers());

  it('comportamento atual (bug A-13): "hoje" depois das 21h vira o dia seguinte', () => {
    expect(formatDateForFilter(new Date())).toBe('2026-09-28');
  });

  it('comportamento atual (bug A-13): o filtro "hoje" esconde lançamentos de hoje e mostra os de amanhã', () => {
    expect(isDateInRange('2026-09-27', 'hoje')).toBe(false);
    expect(isDateInRange('2026-09-28', 'hoje')).toBe(true);
  });

  it('comportamento atual (bug A-13): o dia 1º cai no mês anterior', () => {
    vi.setSystemTime(new Date('2026-10-15T15:00:00Z'));
    expect(isDateInRange('2026-10-01', 'este-mes')).toBe(false);
    expect(isDateInRange('2026-10-01', 'mes-passado')).toBe(true);
  });
});
