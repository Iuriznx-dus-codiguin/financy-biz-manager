import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { toast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';

interface RecurringConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // Every X frequency units
  end_date?: string;
  max_occurrences?: number;
  next_date: string;
}

interface RecurringTransaction {
  id: string;
  type: 'receita' | 'despesa';
  description: string;
  amount: number;
  category: string;
  config: RecurringConfig;
  created_count: number;
  last_created: string | null;
}

export const useRecurringTransactions = () => {
  const { user } = useAuth();
  const { currentDashboard } = useDashboard();
  const { createRecurringTransactionNotification } = useNotifications();
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aguardar carregamento inicial para evitar conflitos
    const timer = setTimeout(() => {
      if (user && currentDashboard) {
        loadRecurringTransactions();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [user?.id, currentDashboard?.id]);

  const loadRecurringTransactions = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load receitas with recurring config
      const { data: receitas, error: receitasError } = await supabase
        .from('receitas')
        .select('*')
        .eq('user_id', user.id)
        .eq('recorrente', true)
        .not('configuracao_recorrencia', 'is', null);

      if (receitasError) throw receitasError;

      // Load despesas with recurring config
      const { data: despesas, error: despesasError } = await supabase
        .from('despesas')
        .select('*')
        .eq('user_id', user.id)
        .eq('recorrente', true)
        .not('configuracao_recorrencia', 'is', null);

      if (despesasError) throw despesasError;

      // Transform to unified format
      const allTransactions: RecurringTransaction[] = [
        ...(receitas || []).map(r => ({
          id: r.id.toString(),
          type: 'receita' as const,
          description: r.descricao,
          amount: Number(r.valor),
          category: r.categoria,
          config: (r.configuracao_recorrencia as any) || {},
          created_count: 0, // TODO: Track this
          last_created: null
        })),
        ...(despesas || []).map(d => ({
          id: d.id.toString(),
          type: 'despesa' as const,
          description: d.descricao,
          amount: Number(d.valor),
          category: d.categoria,
          config: (d.configuracao_recorrencia as any) || {},
          created_count: 0, // TODO: Track this
          last_created: null
        }))
      ];

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Erro ao carregar transações recorrentes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as transações recorrentes.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const calculateNextDate = (config: RecurringConfig): Date => {
    const now = new Date();
    const nextDate = new Date(now);

    switch (config.frequency) {
      case 'daily':
        nextDate.setDate(now.getDate() + config.interval);
        break;
      case 'weekly':
        nextDate.setDate(now.getDate() + (config.interval * 7));
        break;
      case 'monthly':
        nextDate.setMonth(now.getMonth() + config.interval);
        break;
      case 'yearly':
        nextDate.setFullYear(now.getFullYear() + config.interval);
        break;
    }

    return nextDate;
  };

  const setupRecurringTransaction = async (
    type: 'receita' | 'despesa',
    transactionId: string,
    config: RecurringConfig
  ) => {
    try {
      const table = type === 'receita' ? 'receitas' : 'despesas';
      const nextDate = calculateNextDate(config);

      const { error } = await supabase
        .from(table)
        .update({
          recorrente: true,
          configuracao_recorrencia: {
            ...config,
            next_date: nextDate.toISOString()
          }
        })
        .eq('id', parseInt(transactionId))
        .eq('user_id', user!.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Transação recorrente configurada com sucesso!'
      });

      await loadRecurringTransactions();
    } catch (error) {
      console.error('Erro ao configurar transação recorrente:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível configurar a transação recorrente.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const disableRecurring = async (type: 'receita' | 'despesa', transactionId: string) => {
    try {
      const table = type === 'receita' ? 'receitas' : 'despesas';

      const { error } = await supabase
        .from(table)
        .update({
          recorrente: false,
          configuracao_recorrencia: null
        })
        .eq('id', parseInt(transactionId))
        .eq('user_id', user!.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Recorrência desabilitada com sucesso!'
      });

      await loadRecurringTransactions();
    } catch (error) {
      console.error('Erro ao desabilitar recorrência:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível desabilitar a recorrência.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const processRecurringTransactions = useCallback(async () => {
    if (!user || transactions.length === 0) return;
    
    try {
      const today = new Date();
      
      for (const transaction of transactions) {
        const nextDate = new Date(transaction.config.next_date);
        
        if (nextDate <= today && transaction.config.enabled) {
          // Create new transaction
          const newTransaction = {
            user_id: user.id,
            data: today.toISOString().split('T')[0],
            valor: transaction.amount,
            categoria: transaction.category,
            descricao: `${transaction.description} (Recorrente)`,
            dashboard_id: currentDashboard?.id || null,
            recorrente: false, // The new instance is not recurring
            forma_pagamento: 'automatico'
          };

          const table = transaction.type === 'receita' ? 'receitas' : 'despesas';
          const { error } = await supabase.from(table).insert([
            transaction.type === 'receita' 
              ? { ...newTransaction, cliente: 'Recorrente' }
              : { ...newTransaction, fornecedor: 'Recorrente' }
          ]);

          if (error) throw error;

          // Update next date for the recurring transaction
          const newNextDate = calculateNextDate(transaction.config);
          await supabase
            .from(table)
            .update({
              configuracao_recorrencia: {
                ...transaction.config,
                next_date: newNextDate.toISOString()
              }
            })
            .eq('id', parseInt(transaction.id))
            .eq('user_id', user.id);

          // Create notification
          await createRecurringTransactionNotification(
            transaction.type,
            transaction.description,
            transaction.amount
          );
        }
      }

      await loadRecurringTransactions();
    } catch (error) {
      console.error('Erro ao processar transações recorrentes:', error);
      throw error;
    }
  }, [user, transactions, currentDashboard, createRecurringTransactionNotification, loadRecurringTransactions]);

  const getTransactionsDueToday = useCallback(() => {
    const today = new Date();
    return transactions.filter(t => {
      const nextDate = new Date(t.config.next_date);
      return nextDate.toDateString() === today.toDateString() && t.config.enabled;
    });
  }, [transactions]);

  const getTransactionsDueSoon = useCallback((days = 7) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return transactions.filter(t => {
      const nextDate = new Date(t.config.next_date);
      return nextDate <= futureDate && nextDate > new Date() && t.config.enabled;
    });
  }, [transactions]);

  return {
    transactions,
    loading,
    loadRecurringTransactions,
    setupRecurringTransaction,
    disableRecurring,
    processRecurringTransactions,
    getTransactionsDueToday,
    getTransactionsDueSoon
  };
};