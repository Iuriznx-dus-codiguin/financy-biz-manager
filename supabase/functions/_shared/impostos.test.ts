import { describe, expect, it } from 'vitest';
import { tipoDoValor, totalDeImpostos, valorDoImposto } from './impostos';

describe('impostos', () => {
  it('trata registros sem valor_tipo como fixos', () => {
    expect(tipoDoValor({ valor: 10 })).toBe('fixo');
    expect(valorDoImposto({ valor: '123.456' }, 1000)).toBe(123.46);
  });

  it('aplica a alíquota sobre as receitas (snake_case e camelCase)', () => {
    expect(valorDoImposto({ valor: 6, valor_tipo: 'porcentagem' }, 10_000)).toBe(600);
    expect(valorDoImposto({ valor: 2.5, valorTipo: 'porcentagem' }, 333.33)).toBe(8.33);
    expect(valorDoImposto({ valor: 6, valor_tipo: 'porcentagem' }, 0)).toBe(0);
  });

  it('soma em centavos', () => {
    expect(totalDeImpostos([{ valor: 0.1 }, { valor: 0.2 }, { valor: 10, valor_tipo: 'porcentagem' }], 100)).toBe(10.3);
  });

  it('ignora valores inválidos', () => {
    expect(valorDoImposto({ valor: 'abc' }, 100)).toBe(0);
    expect(valorDoImposto({ valor: null }, 100)).toBe(0);
  });
});
