// Leitura paginada: o PostgREST devolve no máximo 1.000 linhas por requisição (max_rows), então quem tinha
// mais de mil lançamentos via totais e listas incompletos.
import type { PostgrestError } from '@supabase/supabase-js';

export const TAMANHO_PAGINA = 1000;

type Pagina<T> = PromiseLike<{ data: T[] | null; error: PostgrestError | null }>;

/** `buscar(de, ate)` monta a consulta com `.range(de, ate)`; lê até `maximoPaginas` páginas. */
export async function buscarTodas<T>(buscar: (de: number, ate: number) => Pagina<T>, maximoPaginas = 50): Promise<T[]> {
  const linhas: T[] = [];
  for (let pagina = 0; pagina < maximoPaginas; pagina++) {
    const de = pagina * TAMANHO_PAGINA;
    const { data, error } = await buscar(de, de + TAMANHO_PAGINA - 1);
    if (error) throw error;
    linhas.push(...(data ?? []));
    if (!data || data.length < TAMANHO_PAGINA) break;
  }
  return linhas;
}
