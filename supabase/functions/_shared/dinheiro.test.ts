import { describe, expect, it } from 'vitest';
import { aplicarPercentual, arredondarReais, formatarBRL, interpretarValor, paraCentavos, percentual, somarReais } from './dinheiro';

describe('centavos', () => {
  it('converte sem resíduo binário', () => {
    expect(paraCentavos(1.005)).toBe(101);
    expect(paraCentavos(19.9)).toBe(1990);
    expect(arredondarReais(0.1 + 0.2)).toBe(0.3);
  });
  it('soma sem acumular erro', () => {
    expect(somarReais([0.1, 0.2, 0.3])).toBe(0.6);
    expect(somarReais(Array(10).fill(0.1))).toBe(1);
    expect(somarReais(['10.50', null, undefined, 2])).toBe(12.5);
  });
});

describe('interpretarValor', () => {
  it.each([
    ['1.234,56', 1234.56],
    ['1234,56', 1234.56],
    ['1234.56', 1234.56],
    ['R$ 1.197,00', 1197],
    ['1,197.00', 1197],
    ['1.234', 1234],
    ['97.00', 97],
    ['19,9', 19.9],
    ['-5,00', -5],
  ])('%s → %d', (entrada, esperado) => {
    expect(interpretarValor(entrada)).toBe(esperado);
  });
  it('rejeita texto que não é número', () => {
    expect(interpretarValor('abc')).toBeNull();
    expect(interpretarValor('')).toBeNull();
    expect(interpretarValor('1.2.3,4.5')).toBeNull();
    expect(interpretarValor(Number.NaN)).toBeNull();
  });
});

describe('formatação e percentuais', () => {
  it('formata em reais', () => {
    expect(formatarBRL(1234.5).replace(/\s/g, ' ')).toBe('R$ 1.234,50');
    expect(formatarBRL(undefined).replace(/\s/g, ' ')).toBe('R$ 0,00');
  });
  it('calcula percentuais e alíquotas', () => {
    expect(percentual(25, 200)).toBe(12.5);
    expect(percentual(1, 0)).toBe(0);
    expect(aplicarPercentual(1999.99, 6)).toBe(120);
  });
});
