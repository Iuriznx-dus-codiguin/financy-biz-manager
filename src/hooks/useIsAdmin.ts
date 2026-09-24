import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { isDeveloperTier } from '@/utils/subscriptionHelpers';

/** Chave compartilhada do cache do papel do usuário. */
export const adminRoleQueryKey = (userId?: string) => ['user-admin-role', userId] as const;

/**
 * Verdadeiro quando o usuário possui papel "admin" em user_roles
 * ou acesso de desenvolvedor (tier developer).
 *
 * A consulta a `user_roles` roda sob React Query para que o `AdminGuard` e a
 * própria página administrativa — montados juntos — compartilhem um único
 * resultado, em vez de consultar o banco uma vez cada.
 */
export function useIsAdmin() {
  const { user } = useAuth();
  const { subscription } = useUserSubscription();

  const { data: hasAdminRole = false, isLoading } = useQuery({
    queryKey: adminRoleQueryKey(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'admin')
        .maybeSingle();

      // Fail closed: uma falha de rede não deve conceder papel administrativo.
      if (error) {
        console.error('Erro ao verificar papel de admin:', error.message);
        return false;
      }
      return Boolean(data);
    },
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 5,
  });

  return {
    isAdmin: hasAdminRole || isDeveloperTier(subscription),
    loading: Boolean(user?.id) && isLoading,
  };
}
