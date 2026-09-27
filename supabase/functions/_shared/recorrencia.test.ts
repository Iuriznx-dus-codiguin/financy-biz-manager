import { describe, expect, it } from 'vitest';
import { ocorrenciasAte, proximaOcorrencia, situacaoVencimento } from './recorrencia';

describe('proximaOcorrencia', () => {
  it('periodicidades em dias', () => {
    expect(proximaOcorrencia('2026-09-27', 'diaria')).toBe('2026-09-28');
    expect(proximaOcorrencia('2026-09-27', 'semanal')).toBe('2026-10-04');
    expect(proximaOcorrencia('2026-09-27', 'quinzenal')).toBe('2026-10-12');
  });
  it('periodicidades em meses mantêm o dia-âncora', () => {
    expect(proximaOcorrencia('2026-01-31', 'mensal')).toBe('2026-02-28');
    expect(proximaOcorrencia('2026-02-28', 'mensal', 31)).toBe('2026-03-31');
    expect(proximaOcorrencia('2026-01-10', 'bimestral')).toBe('2026-03-10');
    expect(proximaOcorrencia('2026-01-10', 'trimestral')).toBe('2026-04-10');
    expect(proximaOcorrencia('2026-01-10', 'semestral')).toBe('2026-07-10');
  });
  it('"anual" gera a próxima data (antes devolvia nulo e a recorrência morria)', () => {
    expect(proximaOcorrencia('2024-02-29', 'anual')).toBe('2025-02-28');
    expect(proximaOcorrencia('2026-05-10', 'anual')).toBe('2027-05-10');
  });
  it('tipo desconhecido não gera data', () => {
    expect(proximaOcorrencia('2026-05-10', 'mensalmente')).toBeNull();
  });
});

describe('ocorrenciasAte', () => {
  it('lista todas as ocorrências vencidas, sem pular meses', () => {
    expect(ocorrenciasAte('2026-06-30', 'mensal', '2026-09-30', 30)).toEqual([
      '2026-06-30', '2026-07-30', '2026-08-30', '2026-09-30',
    ]);
  });
  it('respeita o limite máximo', () => {
    expect(ocorrenciasAte('2020-01-01', 'diaria', '2030-01-01', undefined, 5)).toHaveLength(5);
  });
});

describe('situacaoVencimento', () => {
  it('vence no próprio dia, não na véspera', () => {
    expect(situacaoVencimento('2026-09-27', false, '2026-09-27')).toBe('vence_hoje');
    expect(situacaoVencimento('2026-09-26', false, '2026-09-27')).toBe('vencido');
    expect(situacaoVencimento('2026-09-28', false, '2026-09-27')).toBe('a_vencer');
    expect(situacaoVencimento('2026-09-20', true, '2026-09-27')).toBe('pago');
  });
});
