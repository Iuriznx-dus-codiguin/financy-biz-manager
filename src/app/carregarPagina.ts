import { lazy, type ComponentType } from 'react';

const CHAVE_RECARGA = 'financy-recarga-chunk';

/**
 * React.lazy com uma recarga automática quando o chunk não existe mais (nova versão publicada
 * com a aba aberta). Recarrega uma vez por sessão para não entrar em laço.
 */
export function carregarPagina<T extends ComponentType<unknown>>(importar: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const modulo = await importar();
      sessionStorage.removeItem(CHAVE_RECARGA);
      return modulo;
    } catch (erro) {
      if (!sessionStorage.getItem(CHAVE_RECARGA)) {
        sessionStorage.setItem(CHAVE_RECARGA, '1');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw erro;
    }
  });
}
