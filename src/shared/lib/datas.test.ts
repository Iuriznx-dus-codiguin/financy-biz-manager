import { describe, expect, it } from 'vitest';
import { dataLocal, formatarData } from './datas';

describe('dataLocal (TZ=America/Sao_Paulo nos testes)', () => {
  it('data-calendário vira meia-noite local, não UTC', () => {
    const d = dataLocal('2026-09-27');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 8, 27, 0]);
    expect(formatarData('2026-10-01')).toBe('01/10/2026');
  });

  it('timestamps seguem o parse normal', () => {
    expect(dataLocal('2026-09-28T02:30:00Z').getDate()).toBe(27);
  });

  it('valores vazios', () => {
    expect(Number.isNaN(dataLocal(null).getTime())).toBe(true);
    expect(formatarData(undefined)).toBe('');
  });
});
