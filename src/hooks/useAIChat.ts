import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useDashboard } from './useDashboard';
import { useUserContext } from './useUserContext';

export interface AIMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  toolResults?: Array<{ success: boolean; message?: string; error?: string }>;
}

export interface UseAIChatOptions {
  maxDailyMessages?: number;
  maxChars?: number;
  agentEndpoint?: string;
}

export const useAIChat = (options: UseAIChatOptions = {}) => {
  const {
    maxDailyMessages = 50,
    maxChars = 2000,
    agentEndpoint = 'ai-agent',
  } = options;

  const { user } = useAuth();
  const { currentDashboard } = useDashboard();
  const { isPersonalContext } = useUserContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (messages: AIMessage[], _userMessage: string): Promise<AIMessage | null> => {
      if (!user) return null;
      setIsLoading(true);
      setError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Sessão expirada');

        const response = await supabase.functions.invoke(agentEndpoint, {
          body: {
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            dashboardId: currentDashboard?.id,
            dashboardType: currentDashboard?.type || 'business',
            userType: isPersonalContext ? 'personal' : 'business',
          },
        });

        if (response.error) throw response.error;

        const data = response.data;
        return {
          role: 'assistant',
          content: data.response || 'Desculpe, não consegui gerar uma resposta.',
          timestamp: new Date(),
          toolResults: data.tool_results,
        };
      } catch (err: any) {
        const errMsg =
          err?.message?.includes('429')
            ? 'Limite de mensagens atingido. Tente novamente amanhã.'
            : 'Erro ao processar sua mensagem. Tente novamente.';
        setError(errMsg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user, currentDashboard, isPersonalContext, agentEndpoint]
  );

  return { sendMessage, isLoading, error, maxDailyMessages, maxChars };
};
