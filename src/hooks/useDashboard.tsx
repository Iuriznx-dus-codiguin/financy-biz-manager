import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Dashboard {
  id: string;
  name: string;
  type: 'personal' | 'business';
  isDefault: boolean;
}

interface DashboardContextType {
  currentDashboard: Dashboard | null;
  dashboards: Dashboard[];
  setCurrentDashboard: (dashboard: Dashboard) => void;
  createDashboard: (name: string, type: 'personal' | 'business') => Promise<void>;
  deleteDashboard: (id: string) => Promise<void>;
  updateDashboardName: (id: string, newName: string) => Promise<void>;
  loading: boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadDashboards();
    }
  }, [user]);

  const loadDashboards = async () => {
    try {
      const { data, error } = await supabase
        .from('user_dashboards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const dashboardList = data.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type as 'personal' | 'business',
        isDefault: d.is_default
      }));

      setDashboards(dashboardList);

      // Set default dashboard or first one
      const defaultDashboard = dashboardList.find(d => d.isDefault) || dashboardList[0];
      if (defaultDashboard) {
        setCurrentDashboard(defaultDashboard);
      } else if (dashboardList.length === 0) {
        // Create default dashboard if none exists
        await createDefaultDashboard();
      }
    } catch (error) {
      console.error('Error loading dashboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultDashboard = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_dashboards')
        .upsert(
          {
            user_id: user.id,
            name: 'Dashboard Principal',
            type: 'business',
            is_default: true,
          },
          {
            onConflict: 'user_id,is_default',
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();

      if (error) {
        const { data: existing } = await supabase
          .from('user_dashboards')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .single();

        if (existing) {
          const newDashboard = {
            id: existing.id,
            name: existing.name,
            type: existing.type as 'personal' | 'business',
            isDefault: existing.is_default,
          };
          setDashboards([newDashboard]);
          setCurrentDashboard(newDashboard);
        }
        return;
      }

      const newDashboard = {
        id: data.id,
        name: data.name,
        type: data.type as 'personal' | 'business',
        isDefault: data.is_default,
      };
      setDashboards([newDashboard]);
      setCurrentDashboard(newDashboard);
    } catch (error) {
      console.error('Erro ao criar dashboard padrão:', error);
    }
  };

  const createDashboard = async (name: string, type: 'personal' | 'business') => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_dashboards')
        .insert({
          user_id: user.id,
          name,
          type,
          is_default: false
        })
        .select()
        .single();

      if (error) throw error;

      const newDashboard = {
        id: data.id,
        name: data.name,
        type: data.type as 'personal' | 'business',
        isDefault: data.is_default
      };

      setDashboards(prev => [...prev, newDashboard]);
      // Automaticamente definir o novo dashboard como atual
      setCurrentDashboard(newDashboard);
    } catch (error) {
      console.error('Error creating dashboard:', error);
      throw error;
    }
  };

  const deleteDashboard = async (id: string) => {
    try {
      // Deletar todos os dados relacionados ao dashboard
      await Promise.all([
        supabase.from('receitas').delete().eq('dashboard_id', id),
        supabase.from('despesas').delete().eq('dashboard_id', id),
        supabase.from('impostos').delete().eq('dashboard_id', id),
        supabase.from('metas').delete().eq('dashboard_id', id),
      ]);

      // Deletar o dashboard
      const { error } = await supabase
        .from('user_dashboards')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDashboards(prev => prev.filter(d => d.id !== id));
      
      // If deleted dashboard was current, switch to first available
      if (currentDashboard?.id === id) {
        const remaining = dashboards.filter(d => d.id !== id);
        setCurrentDashboard(remaining[0] || null);
      }
    } catch (error) {
      console.error('Error deleting dashboard:', error);
      throw error;
    }
  };

  const updateDashboardName = async (id: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('user_dashboards')
        .update({ name: newName })
        .eq('id', id);

      if (error) throw error;

      setDashboards(prev => prev.map(d => 
        d.id === id ? { ...d, name: newName } : d
      ));

      if (currentDashboard?.id === id) {
        setCurrentDashboard(prev => prev ? { ...prev, name: newName } : null);
      }
    } catch (error) {
      console.error('Error updating dashboard name:', error);
      throw error;
    }
  };

  return (
    <DashboardContext.Provider value={{
      currentDashboard,
      dashboards,
      setCurrentDashboard,
      createDashboard,
      deleteDashboard,
      updateDashboardName,
      loading
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};