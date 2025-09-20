import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { toast } from 'sonner';

interface OptimizedDataContextType {
  isLoading: boolean;
  loadDashboardData: (dashboardId: string, forceRefresh?: boolean) => Promise<any>;
  clearCache: (dashboardId?: string) => void;
  getCachedStats: (dashboardId: string) => any;
}

const OptimizedDataContext = createContext<OptimizedDataContextType | undefined>(undefined);

export const OptimizedDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [cache, setCache] = useState<{ [key: string]: any }>({});
  const { user } = useAuth();

  const loadDashboardData = useCallback(async (dashboardId: string, forceRefresh = false) => {
    if (!user) return null;

    // Verificar cache primeiro
    const cacheKey = `dashboard_${dashboardId}`;
    if (!forceRefresh && cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < 300000) { // 5 minutos
      return cache[cacheKey].data;
    }

    setIsLoading(true);
    try {
      // Usar a função otimizada do banco
      const { data, error } = await supabase.rpc('get_dashboard_data', {
        p_user_id: user.id,
        p_dashboard_id: dashboardId,
        p_use_cache: !forceRefresh
      });

      if (error) throw error;

      // Atualizar cache local
      setCache(prev => ({
        ...prev,
        [cacheKey]: {
          data,
          timestamp: Date.now()
        }
      }));

      return data;
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const getCachedStats = useCallback(async (dashboardId: string) => {
    if (!user) return null;

    try {
      // Calcular estatísticas manualmente por enquanto
      const { data: receitas } = await supabase
        .from('receitas')
        .select('valor')
        .eq('dashboard_id', dashboardId)
        .eq('user_id', user.id);

      const { data: despesas } = await supabase
        .from('despesas')
        .select('valor')
        .eq('dashboard_id', dashboardId)
        .eq('user_id', user.id);

      const totalReceitas = receitas?.reduce((sum, r) => sum + r.valor, 0) || 0;
      const totalDespesas = despesas?.reduce((sum, d) => sum + d.valor, 0) || 0;

      return {
        total_receitas: totalReceitas,
        total_despesas: totalDespesas,
        lucro_liquido: totalReceitas - totalDespesas
      };
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      return null;
    }
  }, [user]);

  const clearCache = useCallback((dashboardId?: string) => {
    if (dashboardId) {
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache[`dashboard_${dashboardId}`];
        return newCache;
      });
    } else {
      setCache({});
    }
  }, []);

  // Limpar cache expirado periodicamente com useMemo para otimização
  const cleanupInterval = useMemo(() => {
    return setInterval(() => {
      const now = Date.now();
      setCache(prev => {
        const cleaned = Object.entries(prev).reduce((acc, [key, value]) => {
          if (now - value.timestamp < 600000) { // 10 minutos
            acc[key] = value;
          }
          return acc;
        }, {} as { [key: string]: any });
        return cleaned;
      });
    }, 300000); // Executar a cada 5 minutos
  }, []);

  useEffect(() => {
    cleanupInterval;
    return () => clearInterval(cleanupInterval);
  }, [cleanupInterval]);

  const contextValue = useMemo(() => ({
    isLoading,
    loadDashboardData,
    clearCache,
    getCachedStats
  }), [isLoading, loadDashboardData, clearCache, getCachedStats]);

  return (
    <OptimizedDataContext.Provider value={contextValue}>
      {children}
    </OptimizedDataContext.Provider>
  );
};

export const useOptimizedData = () => {
  const context = useContext(OptimizedDataContext);
  if (context === undefined) {
    throw new Error('useOptimizedData must be used within an OptimizedDataProvider');
  }
  return context;
};