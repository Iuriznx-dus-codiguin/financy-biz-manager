import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SecurityAuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id?: string | null;
  old_values?: any;
  new_values?: any;
  ip_address?: string | null;
  user_agent?: string | null;
  timestamp: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

interface SecurityMetrics {
  totalEvents: number;
  highRiskEvents: number;
  criticalEvents: number;
  recentFailedLogins: number;
  suspiciousActivity: boolean;
}

export const useSecurity = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    highRiskEvents: 0,
    criticalEvents: 0,
    recentFailedLogins: 0,
    suspiciousActivity: false
  });

  // Log security event
  const logSecurityEvent = useCallback(async (
    action: string,
    tableName: string,
    recordId?: string,
    oldValues?: any,
    newValues?: any,
    riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ) => {
    if (!user) return;

    try {
      // Get user's IP and user agent (in a real app, this would come from the server)
      const userAgent = navigator.userAgent;
      
      const { error } = await supabase.rpc('log_security_event', {
        p_user_id: user.id,
        p_action: action,
        p_table_name: tableName,
        p_record_id: recordId,
        p_old_values: oldValues,
        p_new_values: newValues,
        p_risk_level: riskLevel
      });

      if (error) {
        console.error('Erro ao registrar evento de segurança:', error);
      }

      // Show alert for high-risk events
      if (riskLevel === 'high' || riskLevel === 'critical') {
        toast.warning(`Atividade de alta segurança detectada: ${action}`, {
          description: 'Este evento foi registrado nos logs de auditoria.',
        });
      }
    } catch (error) {
      console.error('Erro ao registrar evento de segurança:', error);
    }
  }, [user]);

  // Fetch security audit logs
  const fetchAuditLogs = useCallback(async (limit: number = 50) => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('security_audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Erro ao buscar logs de auditoria:', error);
        return;
      }

      setAuditLogs((data as SecurityAuditLog[]) || []);
      
      // Calculate metrics
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const recentLogs = data?.filter(log => new Date(log.timestamp) > last24Hours) || [];
      
      setMetrics({
        totalEvents: data?.length || 0,
        highRiskEvents: recentLogs.filter(log => log.risk_level === 'high').length,
        criticalEvents: recentLogs.filter(log => log.risk_level === 'critical').length,
        recentFailedLogins: recentLogs.filter(log => log.action.includes('FAILED_LOGIN')).length,
        suspiciousActivity: recentLogs.filter(log => 
          log.risk_level === 'critical' || 
          (log.action.includes('FAILED') && recentLogs.filter(l => l.action.includes('FAILED')).length > 5)
        ).length > 0
      });

    } catch (error) {
      console.error('Erro ao buscar logs de segurança:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check rate limit for authentication
  const checkAuthRateLimit = useCallback(async (identifier: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('check_auth_rate_limit', {
        p_identifier: identifier,
        p_max_attempts: 5,
        p_window_minutes: 15,
        p_block_minutes: 60
      });

      if (error) {
        console.error('Erro ao verificar rate limit:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Erro ao verificar rate limit:', error);
      return false;
    }
  }, []);

  // Validate sensitive data access
  const validateSensitiveDataAccess = useCallback(async (
    tableName: string,
    action: string,
    recordId?: string
  ): Promise<boolean> => {
    if (!user) return false;

    // Log the access attempt
    await logSecurityEvent(
      `${action.toUpperCase()}_${tableName.toUpperCase()}`,
      tableName,
      recordId,
      null,
      null,
      tableName === 'equipe_membros' ? 'medium' : 'low'
    );

    // Add additional validation logic here
    // For example, check user permissions, time-based access, etc.
    
    return true;
  }, [user, logSecurityEvent]);

  // Detect suspicious patterns
  const detectSuspiciousActivity = useCallback((logs: SecurityAuditLog[]): boolean => {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentLogs = logs.filter(log => new Date(log.timestamp) > lastHour);
    
    // Check for suspicious patterns
    const rapidActions = recentLogs.length > 50; // Too many actions in 1 hour
    const multipleFailedLogins = recentLogs.filter(log => 
      log.action.includes('FAILED')
    ).length > 10;
    const criticalActions = recentLogs.filter(log => 
      log.risk_level === 'critical'
    ).length > 3;

    return rapidActions || multipleFailedLogins || criticalActions;
  }, []);

  // Get security recommendations
  const getSecurityRecommendations = useCallback((): string[] => {
    const recommendations: string[] = [];

    if (metrics.criticalEvents > 0) {
      recommendations.push('Revise imediatamente os eventos críticos de segurança');
    }

    if (metrics.recentFailedLogins > 5) {
      recommendations.push('Considere ativar autenticação de dois fatores');
    }

    if (metrics.suspiciousActivity) {
      recommendations.push('Atividade suspeita detectada - verifique os logs');
    }

    if (auditLogs.length === 0) {
      recommendations.push('Configure o monitoramento de segurança');
    }

    return recommendations;
  }, [metrics, auditLogs.length]);

  return {
    auditLogs,
    metrics,
    loading,
    logSecurityEvent,
    fetchAuditLogs,
    checkAuthRateLimit,
    validateSensitiveDataAccess,
    detectSuspiciousActivity,
    getSecurityRecommendations
  };
};