import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface ProcessingResult {
  receitas_processadas: number;
  despesas_processadas: number;
  total: number;
}

export const useRecurringTransactions = () => {
  const lastProcessedRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);

  const processRecurringTransactions = useCallback(async (
    userId: string,
    options?: { force?: boolean }
  ): Promise<ProcessingResult | null> => {
    const force = options?.force === true;
    // Evitar processamento duplicado no mesmo dia (a menos que force=true)
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `${userId}_${today}`;

    if (!force && lastProcessedRef.current === cacheKey) {
      logger.info('Transações recorrentes já processadas hoje');
      return null;
    }

    // Evitar chamadas simultâneas
    if (isProcessingRef.current) {
      logger.info('Processamento de transações recorrentes já em andamento');
      return null;
    }

    isProcessingRef.current = true;

    try {
      logger.info('Iniciando processamento de transações recorrentes do usuário');

      const { data, error } = await supabase.rpc('processar_transacoes_recorrentes_usuario', {
        p_user_id: userId
      });

      if (error) {
        logger.error('Erro ao processar transações recorrentes:', error);
        return null;
      }

      const result = data as unknown as ProcessingResult;

      if (result && result.total > 0) {
        logger.info(`Transações recorrentes processadas: ${result.receitas_processadas} receitas, ${result.despesas_processadas} despesas`);
      }

      // Marcar como processado hoje
      lastProcessedRef.current = cacheKey;

      return result;
    } catch (error) {
      logger.error('Erro ao processar transações recorrentes:', error);
      return null;
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  /** Força reprocessamento imediato, ignorando o cache diário. */
  const runNow = useCallback(async (userId: string) => {
    return processRecurringTransactions(userId, { force: true });
  }, [processRecurringTransactions]);

  return { processRecurringTransactions, runNow };
};
