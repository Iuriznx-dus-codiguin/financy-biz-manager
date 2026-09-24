import { Loader2 } from 'lucide-react';

/**
 * Placeholder exibido enquanto o chunk de uma rota lazy é baixado.
 *
 * Fica em arquivo próprio porque é usado por dois limites de Suspense
 * diferentes: o de `App.tsx` (rotas públicas) e o que envolve o `<Outlet />`
 * dentro de `AuthenticatedLayout` — este último é o que mantém a sidebar e o
 * cabeçalho na tela durante a troca de página.
 */
export const RouteFallback = () => (
  <div
    className="flex min-h-[50vh] items-center justify-center"
    role="status"
    aria-live="polite"
  >
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
    <span className="sr-only">Carregando página…</span>
  </div>
);
