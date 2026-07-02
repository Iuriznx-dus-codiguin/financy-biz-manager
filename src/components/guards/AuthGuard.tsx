import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xl font-semibold text-foreground font-display">Financy</span>
        </div>
        <p className="text-sm text-muted-foreground">Verificando autenticação...</p>
      </div>
    );
  }

  if (!user) {
    // Preservar a rota original para redirect após login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

