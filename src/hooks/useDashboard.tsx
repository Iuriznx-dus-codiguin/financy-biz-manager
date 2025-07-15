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
        .insert({
          user_id: user.id,
          name: 'Dashboard Principal',
          type: 'business',
          is_default: true
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

      setDashboards([newDashboard]);
      setCurrentDashboard(newDashboard);
    } catch (error) {
      console.error('Error creating default dashboard:', error);
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
    } catch (error) {
      console.error('Error creating dashboard:', error);
      throw error;
    }
  };

  const deleteDashboard = async (id: string) => {
    try {
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

  return (
    <DashboardContext.Provider value={{
      currentDashboard,
      dashboards,
      setCurrentDashboard,
      createDashboard,
      deleteDashboard,
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