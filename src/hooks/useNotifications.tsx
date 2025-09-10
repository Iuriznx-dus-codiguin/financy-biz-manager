import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  user_id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  data_vencimento?: string;
  metadata: any;
  created_at: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    byType: {}
  });

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (notificationData: Notification[]) => {
    const total = notificationData.length;
    const unread = notificationData.filter(n => !n.lida).length;
    
    const byType = notificationData.reduce((acc, n) => {
      acc[n.tipo] = (acc[n.tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    setStats({ total, unread, byType });
  };

  const createNotification = async (notification: Omit<Notification, 'id' | 'user_id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .insert([{
          ...notification,
          user_id: user!.id
        }])
        .select()
        .single();

      if (error) throw error;

      setNotifications(prev => [data, ...prev]);
      calculateStats([data, ...notifications]);

      // Show toast for important notifications
      if (['pagamento', 'meta', 'imposto'].includes(notification.tipo)) {
        toast({
          title: notification.titulo,
          description: notification.mensagem
        });
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      throw error;
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single();

      if (error) throw error;

      setNotifications(prev => prev.map(n => n.id === id ? data : n));
      calculateStats(notifications.map(n => n.id === id ? data : n));

      return data;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('user_id', user!.id)
        .eq('lida', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
      calculateStats(notifications.map(n => ({ ...n, lida: true })));

      toast({
        title: 'Sucesso',
        description: 'Todas as notificações foram marcadas como lidas.'
      });
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      throw error;
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== id));
      calculateStats(notifications.filter(n => n.id !== id));
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
      throw error;
    }
  };

  // Notification helpers
  const createPaymentNotification = (success: boolean, amount: number, planName: string) => {
    return createNotification({
      tipo: 'pagamento',
      titulo: success ? '🎉 Pagamento Confirmado!' : '❌ Falha no Pagamento',
      mensagem: success 
        ? `Obrigado pelo seu pagamento de R$ ${amount.toFixed(2)} do plano ${planName}! Sua assinatura está ativa.`
        : `Não foi possível processar o pagamento de R$ ${amount.toFixed(2)} do plano ${planName}.`,
      lida: false,
      metadata: { amount, planName, success }
    });
  };

  const createGoalNotification = (goalTitle: string, progress: number, isCompleted: boolean) => {
    return createNotification({
      tipo: 'meta',
      titulo: isCompleted ? '🎯 Meta Atingida!' : '📈 Progresso da Meta',
      mensagem: isCompleted
        ? `Parabéns! Você atingiu sua meta "${goalTitle}"!`
        : `Sua meta "${goalTitle}" está ${progress}% concluída.`,
      lida: false,
      metadata: { goalTitle, progress, isCompleted }
    });
  };

  const createTaxReminderNotification = (taxType: string, dueDate: string, amount: number) => {
    return createNotification({
      tipo: 'imposto',
      titulo: '📋 Lembrete de Imposto',
      mensagem: `Lembre-se: ${taxType} de R$ ${amount.toFixed(2)} vence em ${dueDate}.`,
      lida: false,
      data_vencimento: dueDate,
      metadata: { taxType, amount }
    });
  };

  const createRecurringTransactionNotification = (type: 'receita' | 'despesa', description: string, amount: number) => {
    return createNotification({
      tipo: 'transacao_recorrente',
      titulo: '🔄 Transação Recorrente Criada',
      mensagem: `Nova ${type}: ${description} - R$ ${amount.toFixed(2)}`,
      lida: false,
      metadata: { type, description, amount }
    });
  };

  return {
    notifications,
    loading,
    stats,
    loadNotifications,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createPaymentNotification,
    createGoalNotification,
    createTaxReminderNotification,
    createRecurringTransactionNotification
  };
};