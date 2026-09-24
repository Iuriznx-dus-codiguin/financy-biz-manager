import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';

/**
 * Guard de rota para as áreas administrativas.
 *
 * Complementa (não substitui) as policies de RLS e as checagens dentro de cada
 * página: sem ele, uma página administrativa nova precisa lembrar de validar o
 * papel por conta própria, e esquecer isso deixa a rota aberta a qualquer
 * usuário autenticado.
 */
export const AdminGuard = () => {
  const { isAdmin, loading } = useIsAdmin();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="sr-only">Verificando permissões…</span>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
