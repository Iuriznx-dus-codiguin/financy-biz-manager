import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SupportRole = 'user' | 'assistant';

export interface SupportMessage {
  id: string;
  role: SupportRole;
  content: string;
  matched_code?: string | null;
  created_at: string;
}

export interface SupportConversation {
  id: string;
  subject: string | null;
  state: string;
  ticket_id: string | null;
  rating: number | null;
  updated_at: string;
}

export const MAX_SUPPORT_CHARS = 1500;

export const SUPPORT_STATE_LABEL: Record<string, string> = {
  open: 'Aberta',
  diagnosing: 'Em diagnóstico',
  waiting_user: 'Aguardando você',
  resolved: 'Resolvida',
  escalated: 'Escalada para a equipe',
  closed: 'Encerrada',
};

export function useSupportChat() {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [state, setState] = useState<string>('open');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('support_conversations')
      .select('id, subject, state, ticket_id, rating, updated_at')
      .order('updated_at', { ascending: false })
      .limit(20);
    setConversations((data as SupportConversation[]) ?? []);
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const openConversation = useCallback(async (id: string) => {
    setError(null);
    setConversationId(id);
    const [{ data: msgs }, { data: conv }] = await Promise.all([
      supabase
        .from('support_messages')
        .select('id, role, content, matched_code, created_at')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('support_conversations')
        .select('id, subject, state, ticket_id, rating, updated_at')
        .eq('id', id)
        .maybeSingle(),
    ]);
    setMessages(((msgs as SupportMessage[]) ?? []));
    setState(conv?.state ?? 'open');
    setTicketId(conv?.ticket_id ?? null);
  }, []);

  const startNewConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setState('open');
    setTicketId(null);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || isLoading) return;
      if (content.length > MAX_SUPPORT_CHARS) {
        setError(`Mensagem muito longa (máx. ${MAX_SUPPORT_CHARS} caracteres).`);
        return;
      }

      setError(null);
      setIsLoading(true);
      const optimistic: SupportMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Sessão expirada. Entre novamente.');

        const { data, error: fnError } = await supabase.functions.invoke('support-agent', {
          body: { message: content, conversationId },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        setConversationId(data.conversationId);
        setState(data.state ?? 'diagnosing');
        setTicketId(data.ticketId ?? null);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            matched_code: data.matchedCode ?? null,
            created_at: new Date().toISOString(),
          },
        ]);
        loadConversations();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Não foi possível enviar sua mensagem.';
        setError(msg);
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, isLoading, loadConversations]
  );

  const rateConversation = useCallback(
    async (rating: number, comment?: string) => {
      if (!conversationId) return;
      await supabase
        .from('support_conversations')
        .update({
          rating,
          rating_comment: comment ?? null,
          state: rating >= 1 ? 'resolved' : state,
          resolved_at: rating >= 1 ? new Date().toISOString() : null,
        })
        .eq('id', conversationId);
      if (rating >= 1) setState('resolved');
      loadConversations();
    },
    [conversationId, state, loadConversations]
  );

  return {
    conversationId,
    conversations,
    messages,
    state,
    ticketId,
    isLoading,
    error,
    sendMessage,
    openConversation,
    startNewConversation,
    rateConversation,
    reloadConversations: loadConversations,
  };
}
