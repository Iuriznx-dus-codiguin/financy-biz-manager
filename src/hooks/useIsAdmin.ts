import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { isDeveloperTier } from '@/utils/subscriptionHelpers';

/**
 * Verdadeiro quando o usuário possui papel "admin" em user_roles
 * ou acesso de desenvolvedor (tier developer).
 */
export function useIsAdmin() {
  const { user } = useAuth();
  const { subscription } = useUserSubscription();
  const [hasAdminRole, setHasAdminRole] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) {
        if (active) {
          setHasAdminRole(false);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (active) {
        setHasAdminRole(!!data);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  return {
    isAdmin: hasAdminRole || isDeveloperTier(subscription),
    loading,
  };
}
