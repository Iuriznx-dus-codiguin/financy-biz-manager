import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Verdadeiro quando o usuário tem o papel "admin" em user_roles — a mesma regra das policies
 * (has_role). O tier "developer" libera o uso do app, mas não as telas administrativas (AUDITORIA A-09).
 */
export function useIsAdmin() {
  const { user } = useAuth();
  const consulta = useQuery({
    queryKey: ['papel-admin', user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  return {
    isAdmin: consulta.data === true,
    loading: !!user && consulta.isLoading,
  };
}
