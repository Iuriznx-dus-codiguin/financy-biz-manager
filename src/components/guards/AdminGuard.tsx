import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';

/** Telas administrativas: só papel "admin" (user_roles), a mesma regra das policies do banco. */
export const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useIsAdmin();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
