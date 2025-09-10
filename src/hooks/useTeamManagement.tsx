import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { toast } from '@/hooks/use-toast';

interface TeamMember {
  id: string;
  user_id: string;
  dashboard_id?: string;
  nome: string;
  email: string;
  telefone?: string;
  cargo: string;
  salario: number;
  periodicidade: string;
  data_admissao: string;
  status: string;
  permissoes: any;
  created_at: string;
  updated_at: string;
}

interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  monthlyCost: number;
  averageSalary: number;
}

export const useTeamManagement = () => {
  const { user } = useAuth();
  const { currentDashboard } = useDashboard();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TeamStats>({
    totalMembers: 0,
    activeMembers: 0,
    monthlyCost: 0,
    averageSalary: 0
  });

  useEffect(() => {
    if (user) {
      loadTeamMembers();
    }
  }, [user, currentDashboard]);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('equipe_membros')
        .select('*')
        .eq('user_id', user!.id);

      if (currentDashboard?.id) {
        query = query.eq('dashboard_id', currentDashboard.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setMembers(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Erro ao carregar membros da equipe:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os membros da equipe.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (teamData: TeamMember[]) => {
    const totalMembers = teamData.length;
    const activeMembers = teamData.filter(m => m.status === 'ativo').length;
    
    const monthlyCost = teamData
      .filter(m => m.status === 'ativo')
      .reduce((total, member) => {
        switch (member.periodicidade) {
          case 'mensal': return total + member.salario;
          case 'semanal': return total + (member.salario * 4);
          case 'quinzenal': return total + (member.salario * 2);
          default: return total;
        }
      }, 0);

    const averageSalary = activeMembers > 0 ? monthlyCost / activeMembers : 0;

    setStats({
      totalMembers,
      activeMembers,
      monthlyCost,
      averageSalary
    });
  };

  const addMember = async (memberData: Omit<TeamMember, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('equipe_membros')
        .insert([{
          ...memberData,
          user_id: user!.id,
          dashboard_id: currentDashboard?.id || null
        }])
        .select()
        .single();

      if (error) throw error;

      setMembers(prev => [data, ...prev]);
      calculateStats([data, ...members]);
      
      toast({
        title: 'Sucesso',
        description: 'Membro adicionado à equipe com sucesso!'
      });

      return data;
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o membro.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateMember = async (id: string, updates: Partial<TeamMember>) => {
    try {
      const { data, error } = await supabase
        .from('equipe_membros')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single();

      if (error) throw error;

      setMembers(prev => prev.map(m => m.id === id ? data : m));
      calculateStats(members.map(m => m.id === id ? data : m));

      toast({
        title: 'Sucesso',
        description: 'Membro atualizado com sucesso!'
      });

      return data;
    } catch (error) {
      console.error('Erro ao atualizar membro:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o membro.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteMember = async (id: string) => {
    try {
      const { error } = await supabase
        .from('equipe_membros')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.id !== id));
      calculateStats(members.filter(m => m.id !== id));

      toast({
        title: 'Sucesso',
        description: 'Membro removido da equipe.'
      });
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o membro.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateMemberPermissions = async (id: string, permissions: TeamMember['permissoes']) => {
    return updateMember(id, { permissoes: permissions });
  };

  return {
    members,
    loading,
    stats,
    addMember,
    updateMember,
    deleteMember,
    updateMemberPermissions,
    loadTeamMembers
  };
};