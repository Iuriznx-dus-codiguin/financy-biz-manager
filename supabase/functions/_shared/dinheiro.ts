// Dinheiro em reais. Regras puras, sem dependências, usadas pelo front e pelas functions.
//
// O banco guarda numeric(10,2). Para somar e comparar sem erro de ponto flutuante, os cálculos passam
// por centavos inteiros; a borda (formulário, API, exibição) continua em reais.

/** Converte reais para centavos inteiros (arredondamento bancário simples, meio para cima). */
export function paraCentavos(reais: number): number {
  if (!Number.isFinite(reais)) return 0;
  // toFixed(6) elimina resíduos binários (ex.: 1.005 * 100 = 100.49999999999999).
  return Math.round(Number((reais * 100).toFixed(6)));
}

export function deCentavos(centavos: number): number {
  return centavos / 100;
}

/** Arredonda para duas casas. */
export function arredondarReais(reais: number): number {
  return deCentavos(paraCentavos(reais));
}

/** Soma valores em reais sem acumular erro de ponto flutuante. */
export function somarReais(valores: Iterable<number | string | null | undefined>): number {
  let total = 0;
  for (const valor of valores) {
    const numero = typeof valor === 'string' ? Number(valor) : valor ?? 0;
    total += paraCentavos(Number.isFinite(numero) ? (numero as number) : 0);
  }
  return deCentavos(total);
}

/** Soma um campo numérico de uma lista (ex.: `somarCampo(despesas, (d) => d.valor)`). */
export function somarCampo<T>(itens: readonly T[], campo: (item: T) => number | string | null | undefined): number {
  return somarReais(itens.map(campo));
}

/**
 * Interpreta valores digitados ou recebidos de integrações:
 * "1.234,56", "1234,56", "1234.56", "R$ 1.234", 1234.56 → 1234.56.
 * Retorna null quando não é um número.
 */
export function interpretarValor(entrada: unknown): number | null {
  if (typeof entrada === 'number') return Number.isFinite(entrada) ? entrada : null;
  if (typeof entrada !== 'string') return null;
  let texto = entrada.replace(/R\$|\s|\u00a0/gi, '').trim();
  if (!texto) return null;
  const negativo = texto.startsWith('-') || (texto.startsWith('(') && texto.endsWith(')'));
  texto = texto.replace(/[()+-]/g, '');
  if (!/^[\d.,]+$/.test(texto)) return null;

  const ultimaVirgula = texto.lastIndexOf(',');
  const ultimoPonto = texto.lastIndexOf('.');
  let normalizado: string;
  if (ultimaVirgula >= 0 && ultimoPonto >= 0) {
    // O separador que aparece por último é o decimal.
    const decimal = ultimaVirgula > ultimoPonto ? ',' : '.';
    const milhar = decimal === ',' ? '.' : ',';
    normalizado = texto.split(milhar).join('').replace(decimal, '.');
  } else if (ultimaVirgula >= 0) {
    normalizado = texto.split('.').join('').replace(/,(?=[^,]*$)/, '.').split(',').join('');
  } else if (ultimoPonto >= 0) {
    // "1.234" e "1.234.567" são milhares; "12.5" e "1234.56" são decimais.
    normalizado = /^\d{1,3}(\.\d{3})+$/.test(texto) ? texto.split('.').join('') : texto;
    if ((normalizado.match(/\./g) ?? []).length > 1) return null;
  } else {
    normalizado = texto;
  }
  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return null;
  return negativo ? -numero : numero;
}

const formatadorBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** R$ 1.234,56 */
export function formatarBRL(valor: number | null | undefined): string {
  return formatadorBRL.format(Number.isFinite(valor as number) ? (valor as number) : 0);
}

/** 1.234,56 (sem símbolo) */
export function formatarNumeroBR(valor: number | null | undefined, casas = 2): string {
  return (Number.isFinite(valor as number) ? (valor as number) : 0).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

/** Percentual de `parte` sobre `total`; 0 quando o total é zero. */
export function percentual(parte: number, total: number): number {
  if (!total) return 0;
  return (parte / total) * 100;
}

/** Valor de uma alíquota percentual sobre uma base, arredondado ao centavo. */
export function aplicarPercentual(base: number, percentualAliquota: number): number {
  return arredondarReais((base * percentualAliquota) / 100);
}
