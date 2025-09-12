import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { useSecurity } from '@/hooks/useSecurity';
import { toast } from '@/hooks/use-toast';
import { 
  sanitizeInput, 
  isValidEmail, 
  sanitizeNumericInput, 
  validateAndSanitizeInput,
  maskSensitiveData,
  assessSecurityRisk
} from '@/utils/security';

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
  const { logSecurityEvent } = useSecurity();
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

      // Log security event for accessing sensitive team data
      await logSecurityEvent(
        'VIEW_TEAM_MEMBERS',
        'equipe_membros',
        undefined,
        undefined,
        undefined,
        'medium'
      );

      setMembers(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Erro ao carregar membros da equipe:', error);
      
      // Log security event for failed access
      await logSecurityEvent(
        'FAILED_VIEW_TEAM_MEMBERS',
        'equipe_membros',
        undefined,
        undefined,
        undefined,
        'high'
      );
      
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
      // Validate and sanitize input data
      const emailValidation = validateAndSanitizeInput(memberData.email, { 
        maxLength: 255, 
        isEmail: true 
      });
      
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.error || 'Email inválido');
      }

      const nomeValidation = validateAndSanitizeInput(memberData.nome, { 
        maxLength: 100 
      });
      
      if (!nomeValidation.isValid) {
        throw new Error(nomeValidation.error || 'Nome inválido');
      }

      // Enhanced salary validation
      const sanitizedSalary = sanitizeNumericInput(memberData.salario);
      if (sanitizedSalary < 0) {
        throw new Error('Salário deve ser um valor positivo');
      }
      if (sanitizedSalary > 1000000) {
        throw new Error('Salário muito alto - verifique o valor inserido');
      }

      // Sanitize and validate sensitive data
      const sanitizedData = {
        ...memberData,
        nome: nomeValidation.sanitized,
        email: emailValidation.sanitized,
        telefone: memberData.telefone ? sanitizeInput(memberData.telefone) : null,
        cargo: sanitizeInput(memberData.cargo),
        salario: sanitizedSalary,
        user_id: user!.id,
        dashboard_id: currentDashboard?.id || null
      };

      // Assess security risk for this operation
      const riskLevel = assessSecurityRisk('CREATE_TEAM_MEMBER', sanitizedData);

      const { data, error } = await supabase
        .from('equipe_membros')
        .insert([sanitizedData])
        .select()
        .single();

      if (error) throw error;

      // Log security event with appropriate risk level
      await logSecurityEvent(
        'CREATE_TEAM_MEMBER',
        'equipe_membros',
        data.id,
        undefined,
        sanitizedData,
        riskLevel
      );

      setMembers(prev => [data, ...prev]);
      calculateStats([data, ...members]);
      
      toast({
        title: 'Sucesso',
        description: 'Membro adicionado à equipe com sucesso!'
      });

      return data;
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      
      // Log failed attempt as high-risk security event
      await logSecurityEvent(
        'FAILED_CREATE_TEAM_MEMBER',
        'equipe_membros',
        undefined,
        undefined,
        memberData,
        'high'
      );
      
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
      // Get current member data for logging
      const currentMember = members.find(m => m.id === id);
      
      // Validate and sanitize update data
      const sanitizedUpdates: Partial<TeamMember> = {};

      if (updates.nome) {
        const nomeValidation = validateAndSanitizeInput(updates.nome, { maxLength: 100 });
        if (!nomeValidation.isValid) {
          throw new Error(nomeValidation.error || 'Nome inválido');
        }
        sanitizedUpdates.nome = nomeValidation.sanitized;
      }

      if (updates.email) {
        const emailValidation = validateAndSanitizeInput(updates.email, { 
          maxLength: 255, 
          isEmail: true 
        });
        if (!emailValidation.isValid) {
          throw new Error(emailValidation.error || 'Email inválido');
        }
        sanitizedUpdates.email = emailValidation.sanitized;
      }

      if (updates.telefone) {
        sanitizedUpdates.telefone = sanitizeInput(updates.telefone);
      }

      if (updates.cargo) {
        sanitizedUpdates.cargo = sanitizeInput(updates.cargo);
      }

      if (updates.salario !== undefined) {
        const sanitizedSalary = sanitizeNumericInput(updates.salario);
        if (sanitizedSalary < 0) {
          throw new Error('Salário deve ser um valor positivo');
        }
        if (sanitizedSalary > 1000000) {
          throw new Error('Salário muito alto - verifique o valor inserido');
        }
        sanitizedUpdates.salario = sanitizedSalary;
      }

      // Copy other non-sensitive fields
      if (updates.periodicidade !== undefined) {
        sanitizedUpdates.periodicidade = updates.periodicidade;
      }
      if (updates.data_admissao !== undefined) {
        sanitizedUpdates.data_admissao = updates.data_admissao;
      }
      if (updates.status !== undefined) {
        sanitizedUpdates.status = updates.status;
      }
      if (updates.permissoes !== undefined) {
        sanitizedUpdates.permissoes = updates.permissoes;
      }

      // Assess security risk - salary changes are high risk
      const riskLevel = updates.salario !== undefined ? 'high' : 
                       (updates.email || updates.telefone) ? 'medium' : 'low';

      const { data, error } = await supabase
        .from('equipe_membros')
        .update(sanitizedUpdates)
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single();

      if (error) throw error;

      // Log security event for sensitive data modification
      await logSecurityEvent(
        'UPDATE_TEAM_MEMBER',
        'equipe_membros',
        id,
        currentMember,
        sanitizedUpdates,
        riskLevel
      );

      setMembers(prev => prev.map(m => m.id === id ? data : m));
      calculateStats(members.map(m => m.id === id ? data : m));

      toast({
        title: 'Sucesso',
        description: 'Membro atualizado com sucesso!'
      });

      return data;
    } catch (error) {
      console.error('Erro ao atualizar membro:', error);
      
      // Log failed attempt as high-risk security event
      await logSecurityEvent(
        'FAILED_UPDATE_TEAM_MEMBER',
        'equipe_membros',
        id,
        undefined,
        updates,
        'high'
      );
      
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
      const memberToDelete = members.find(m => m.id === id);
      
      const { error } = await supabase
        .from('equipe_membros')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;

      // Log high-risk security event for data deletion
      await logSecurityEvent(
        'DELETE_TEAM_MEMBER',
        'equipe_membros',
        id,
        memberToDelete,
        undefined,
        'high'
      );

      setMembers(prev => prev.filter(m => m.id !== id));
      calculateStats(members.filter(m => m.id !== id));

      toast({
        title: 'Sucesso',
        description: 'Membro removido da equipe.'
      });
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      
      // Log failed deletion attempt
      await logSecurityEvent(
        'FAILED_DELETE_TEAM_MEMBER',
        'equipe_membros',
        id,
        undefined,
        undefined,
        'critical'
      );
      
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

  // Helper function to get masked member data for display
  const getMaskedMemberData = (member: TeamMember, field: keyof TeamMember) => {
    switch (field) {
      case 'email':
        return maskSensitiveData(member.email, 'email');
      case 'telefone':
        return member.telefone ? maskSensitiveData(member.telefone, 'phone') : '';
      case 'salario':
        // Only show masked salary unless user has specific permission
        return maskSensitiveData(member.salario.toString(), 'salary');
      default:
        return member[field];
    }
  };

  return {
    members,
    loading,
    stats,
    addMember,
    updateMember,
    deleteMember,
    updateMemberPermissions,
    loadTeamMembers,
    getMaskedMemberData
  };
};