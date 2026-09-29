import { describe, expect, it } from 'vitest';
import { buscarTodas, TAMANHO_PAGINA } from './paginacao';

describe('buscarTodas', () => {
  it('lê páginas até vir uma incompleta', async () => {
    const total = TAMANHO_PAGINA * 2 + 5;
    const pedidos: [number, number][] = [];
    const linhas = await buscarTodas(async (de, ate) => {
      pedidos.push([de, ate]);
      const fim = Math.min(ate, total - 1);
      return { data: Array.from({ length: Math.max(fim - de + 1, 0) }, (_, i) => de + i), error: null };
    });
    expect(linhas).toHaveLength(total);
    expect(pedidos).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('propaga erro', async () => {
    await expect(buscarTodas(async () => ({ data: null, error: { message: 'x' } as never }))).rejects.toEqual({ message: 'x' });
  });
});
