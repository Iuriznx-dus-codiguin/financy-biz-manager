// Impostos e taxas: valor fixo em reais ou alíquota sobre as receitas do período (mesma regra das telas).
import { aplicarPercentual, arredondarReais, somarReais } from './dinheiro.ts';

export type TipoValorImposto = 'fixo' | 'porcentagem';

export interface ImpostoValoravel {
  valor: number | string | null;
  /** Ausente em registros anteriores à coluna valor_tipo: tratados como fixos. */
  valor_tipo?: string | null;
  valorTipo?: string | null;
}

export function tipoDoValor(imposto: ImpostoValoravel): TipoValorImposto {
  return (imposto.valor_tipo ?? imposto.valorTipo) === 'porcentagem' ? 'porcentagem' : 'fixo';
}

/** Valor em reais: alíquota aplicada sobre `baseReceitas` ou o próprio valor fixo. */
export function valorDoImposto(imposto: ImpostoValoravel, baseReceitas: number): number {
  const valor = Number(imposto.valor ?? 0);
  if (!Number.isFinite(valor)) return 0;
  return tipoDoValor(imposto) === 'porcentagem' ? aplicarPercentual(baseReceitas, valor) : arredondarReais(valor);
}

export function totalDeImpostos(impostos: Iterable<ImpostoValoravel>, baseReceitas: number): number {
  return somarReais(Array.from(impostos, (i) => valorDoImposto(i, baseReceitas)));
}
