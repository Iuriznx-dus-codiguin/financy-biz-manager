import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { SUPPORT_STATE_LABEL } from '@/hooks/useSupportChat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, RefreshCw, Send, LifeBuoy, User, Headphones, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AdminConversation {
  id: string;
  user_id: string;
  subject: string | null;
  state: string;
  ticket_id: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

interface AdminMessage {
  id: string;
  role: string;
  content: string;
  matched_code: string | null;
  created_at: string;
}

const STATES = ['open', 'diagnosing', 'waiting_user', 'escalated', 'resolved', 'closed'];

export default function AdminSuportePage() {
  const { user } = useAuth();
  const { isAdmin, loading: loadingRole } = useIsAdmin();

  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('escalated');
  const endRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('support_conversations')
      .select('id, user_id, subject, state, ticket_id, rating, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (stateFilter !== 'all') query = query.eq('state', stateFilter);

    const { data, error } = await query;
    if (error) {
      toast.error('Não foi possível carregar os atendimentos.');
    } else {
      const convs = (data ?? []) as AdminConversation[];
      setConversations(convs);
      const ids = [...new Set(convs.map((c) => c.user_id))];
      if (ids.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', ids);
        setEmails(
          Object.fromEntries((profiles ?? []).map((p) => [p.id as string, (p.email as string) ?? '']))
        );
      }
    }
    setLoading(false);
  }, [stateFilter]);

  useEffect(() => {
    if (isAdmin) loadConversations();
  }, [isAdmin, loadConversations]);

  const loadMessages = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('id, role, content, matched_code, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });
    setMessages((data ?? []) as AdminMessage[]);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId);
    const channel = supabase
      .channel(`admin-support-${selectedId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_messages', filter: `conversation_id=eq.${selectedId}` },
        () => loadMessages(selectedId)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((c) =>
      [c.subject, c.ticket_id, emails[c.user_id]]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term))
    );
  }, [conversations, search, emails]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const sendReply = async () => {
    const content = reply.trim();
    if (!content || !selectedId || sending) return;
    setSending(true);
    const { error } = await supabase.from('support_messages').insert({
      conversation_id: selectedId,
      role: 'agent',
      content,
      author_id: user?.id ?? null,
    });
    if (error) {
      toast.error('Não foi possível enviar a resposta.');
    } else {
      setReply('');
      await supabase
        .from('support_conversations')
        .update({ state: 'waiting_user' })
        .eq('id', selectedId);
      await loadMessages(selectedId);
      loadConversations();
      toast.success('Resposta enviada ao usuário.');
    }
    setSending(false);
  };

  const changeState = async (newState: string) => {
    if (!selectedId) return;
    await supabase
      .from('support_conversations')
      .update({
        state: newState,
        resolved_at: newState === 'resolved' ? new Date().toISOString() : null,
      })
      .eq('id', selectedId);
    if (newState === 'resolved' || newState === 'closed') {
      await supabase
        .from('support_escalations')
        .update({ status: 'closed' })
        .eq('conversation_id', selectedId);
    }
    loadConversations();
    toast.success('Situação atualizada.');
  };

  if (loadingRole) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            Atendimento humano
          </h1>
          <p className="text-sm text-muted-foreground">
            Responda manualmente as conversas encaminhadas pelo assistente de IA.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadConversations} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="flex flex-col max-h-[70vh]">
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="text-base">Conversas</CardTitle>
            <Input
              placeholder="Buscar por chamado, assunto ou e-mail"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as situações</SelectItem>
                {STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SUPPORT_STATE_LABEL[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            <ScrollArea className="h-full max-h-[45vh]">
              <div className="p-2 space-y-1">
                {loading && (
                  <p className="p-3 text-sm text-muted-foreground">Carregando...</p>
                )}
                {!loading && filtered.length === 0 && (
                  <p className="p-3 text-sm text-muted-foreground">
                    Nenhuma conversa nesta situação.
                  </p>
                )}
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      'w-full text-left rounded-md px-3 py-2 transition-colors hover:bg-muted',
                      c.id === selectedId && 'bg-muted'
                    )}
                  >
                    <span className="block truncate text-sm font-medium">
                      {c.subject || 'Atendimento'}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {emails[c.user_id] || c.user_id.slice(0, 8)}
                      {c.ticket_id ? ` · ${c.ticket_id}` : ''}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <Badge
                        variant={c.state === 'escalated' ? 'destructive' : 'secondary'}
                        className="text-[10px]"
                      >
                        {SUPPORT_STATE_LABEL[c.state] ?? c.state}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(c.updated_at), 'dd/MM HH:mm')}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex flex-col min-h-[60vh] max-h-[70vh]">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground p-6 text-center">
              <ShieldAlert className="h-8 w-8" />
              <p className="text-sm">Selecione uma conversa para ler e responder.</p>
            </div>
          ) : (
            <>
              <CardHeader className="flex flex-row items-start justify-between gap-3 border-b pb-3">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">
                    {selected.subject || 'Atendimento'}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground truncate">
                    {emails[selected.user_id] || selected.user_id}
                    {selected.ticket_id ? ` · ${selected.ticket_id}` : ''}
                  </p>
                </div>
                <Select value={selected.state} onValueChange={changeState}>
                  <SelectTrigger className="w-[190px] shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SUPPORT_STATE_LABEL[s] ?? s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>

              <CardContent className="flex-1 min-h-0 p-0">
                <ScrollArea className="h-full max-h-[40vh]">
                  <div className="p-4 space-y-4">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={cn('flex gap-3', m.role === 'user' ? 'justify-start' : 'justify-end')}
                      >
                        {m.role === 'user' && (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                        <div className="max-w-[80%] space-y-1">
                          <div
                            className={cn(
                              'rounded-lg px-3 py-2 text-sm',
                              m.role === 'user' && 'bg-muted whitespace-pre-wrap',
                              m.role === 'assistant' && 'bg-secondary',
                              m.role === 'agent' && 'bg-primary text-primary-foreground whitespace-pre-wrap'
                            )}
                          >
                            {m.role === 'assistant' ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{m.content}</ReactMarkdown>
                              </div>
                            ) : (
                              m.content
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {m.role === 'user' ? 'Usuário' : m.role === 'agent' ? 'Equipe' : 'IA'} ·{' '}
                            {format(new Date(m.created_at), 'dd/MM HH:mm')}
                            {m.matched_code ? ` · ${m.matched_code}` : ''}
                          </p>
                        </div>
                        {m.role !== 'user' && (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            {m.role === 'agent' ? (
                              <Headphones className="h-4 w-4 text-primary" />
                            ) : (
                              <LifeBuoy className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={endRef} />
                  </div>
                </ScrollArea>
              </CardContent>

              <div className="border-t p-3 space-y-2">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                  rows={3}
                  placeholder="Escreva a resposta que o usuário verá no chat de suporte..."
                  className="resize-none"
                />
                <div className="flex justify-end">
                  <Button onClick={sendReply} disabled={sending || !reply.trim()}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Responder
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
