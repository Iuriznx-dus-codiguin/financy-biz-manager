import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Sparkles, Trash2, Plus, MessageSquare, ChevronLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useUserContext } from '@/hooks/useUserContext';
import { useAuth } from '@/hooks/useAuth';
import ReactMarkdown from 'react-markdown';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  toolResults?: Array<{ success: boolean; message?: string; error?: string }>;
}

interface ChatSession {
  id: string;
  title: string;
  message_count: number;
  updated_at: string;
  created_at: string;
}

const MAX_CHARS = 500;
const MAX_DAILY_MESSAGES = 50;

const WELCOME_SUGGESTIONS_PERSONAL = [
  'Quanto gastei este mês?',
  'Qual meu saldo atual?',
  'Registra um gasto de R$50 com alimentação',
  'Me dê dicas para economizar',
];

const WELCOME_SUGGESTIONS_BUSINESS = [
  'Quanto faturei este mês?',
  'Qual meu lucro líquido?',
  'Registra uma venda de R$500',
  'Quais impostos estão pendentes?',
];

export const FinancyAIChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSessions, setShowSessions] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { currentDashboard } = useDashboard();
  const { isPersonalContext, nomePreferido } = useUserContext();
  const { user } = useAuth();
  const { carregarDados } = useAppContext();

  const suggestions = isPersonalContext ? WELCOME_SUGGESTIONS_PERSONAL : WELCOME_SUGGESTIONS_BUSINESS;

  // Load sessions and daily count on mount
  useEffect(() => {
    if (!user?.id) return;
    loadSessions();
    loadDailyCount();
  }, [user?.id]);

  // Auto-load latest session
  useEffect(() => {
    if (!user?.id || sessions.length === 0 || currentSessionId) return;
    // Load the most recent session
    const latest = sessions[0];
    if (latest) {
      loadSessionMessages(latest.id);
    }
  }, [sessions, user?.id]);

  const loadSessions = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('ai_chat_sessions')
      .select('id, title, message_count, updated_at, created_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50);
    
    setSessions((data as ChatSession[]) || []);
    setInitialLoading(false);
  };

  const loadDailyCount = async () => {
    if (!user?.id) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count } = await supabase
      .from('ai_chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user')
      .gte('created_at', today.toISOString())
      .in('session_id', 
        (await supabase
          .from('ai_chat_sessions')
          .select('id')
          .eq('user_id', user.id)
        ).data?.map((s: any) => s.id) || []
      );
    
    setDailyCount(count || 0);
  };

  const loadSessionMessages = async (sessionId: string) => {
    const { data } = await supabase
      .from('ai_chat_messages')
      .select('id, role, content, tool_results, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (data) {
      setMessages(data.map((m: any) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.created_at),
        toolResults: m.tool_results,
      })));
    }
    setCurrentSessionId(sessionId);
    setShowSessions(false);
  };

  const createNewSession = async () => {
    if (!user?.id) return null;
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .insert({
        user_id: user.id,
        dashboard_id: currentDashboard?.id || null,
        title: 'Nova conversa',
      })
      .select('id, title, message_count, updated_at, created_at')
      .single();
    
    if (error || !data) return null;
    const session = data as ChatSession;
    setSessions(prev => [session, ...prev]);
    setCurrentSessionId(session.id);
    setMessages([]);
    setShowSessions(false);
    return session.id;
  };

  const handleNewChat = async () => {
    await createNewSession();
  };

  const handleDeleteSession = async () => {
    if (!deleteSessionId) return;
    await supabase.from('ai_chat_sessions').delete().eq('id', deleteSessionId);
    setSessions(prev => prev.filter(s => s.id !== deleteSessionId));
    if (currentSessionId === deleteSessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
    setDeleteSessionId(null);
  };

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_CHARS) {
      setInput(val);
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    }
  };

  const saveMessage = async (sessionId: string, role: string, content: string, toolResults?: any) => {
    await supabase.from('ai_chat_messages').insert({
      session_id: sessionId,
      role,
      content,
      tool_results: toolResults || null,
    });
    // Update session message count and title
    const updates: any = { message_count: messages.length + 1 };
    if (role === 'user' && messages.length === 0) {
      updates.title = content.substring(0, 60);
    }
    await supabase.from('ai_chat_sessions').update(updates).eq('id', sessionId);
  };

  const sendMessage = useCallback(async (messageText?: string) => {
    const text = (messageText || input).trim();
    if (!text || isLoading) return;

    // Check daily limit
    if (dailyCount >= MAX_DAILY_MESSAGES) {
      toast({
        title: 'Limite diário atingido',
        description: 'Você atingiu o limite diário de mensagens. Tente novamente amanhã.',
        variant: 'destructive',
      });
      return;
    }

    // Ensure session exists
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createNewSession();
      if (!sessionId) {
        toast({ title: 'Erro', description: 'Não foi possível criar a sessão.', variant: 'destructive' });
        return;
      }
    }

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setDailyCount(prev => prev + 1);

    if (inputRef.current) inputRef.current.style.height = 'auto';

    // Save user message
    await saveMessage(sessionId, 'user', text);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Não autenticado');

      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: {
          messages: apiMessages,
          dashboardId: currentDashboard?.id,
          dashboardType: currentDashboard?.type || 'personal',
          userType: isPersonalContext ? 'pessoal' : 'empresarial',
        },
      });

      if (error) {
        const errMsg = error.message || '';
        if (errMsg.includes('429') || errMsg.includes('Rate')) {
          throw new Error('Limite de requisições atingido. Aguarde alguns segundos.');
        }
        if (errMsg.includes('402')) {
          throw new Error('Créditos de IA esgotados.');
        }
        throw new Error(errMsg || 'Erro na comunicação com o agente');
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.response || 'Desculpe, não consegui processar sua mensagem.',
        timestamp: new Date(),
        toolResults: data.tool_results,
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Save assistant message
      await saveMessage(sessionId, 'assistant', assistantMsg.content, assistantMsg.toolResults);

      // Update session list title if first message
      if (newMessages.length === 1) {
        setSessions(prev => prev.map(s => 
          s.id === sessionId ? { ...s, title: text.substring(0, 60) } : s
        ));
      }

      if (data.tool_results?.some((r: any) => r.success)) {
        await carregarDados();
        window.dispatchEvent(new CustomEvent('financial-data-changed'));
      }
    } catch (error: any) {
      console.error('AI chat error:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível enviar a mensagem.',
        variant: 'destructive',
      });
      setMessages(prev => prev.slice(0, -1));
      setInput(text);
      setDailyCount(prev => prev - 1);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading, currentDashboard, isPersonalContext, toast, currentSessionId, dailyCount]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const greeting = nomePreferido ? `Olá, ${nomePreferido}! 👋` : 'Olá! 👋';
  const charCount = input.length;
  const isOverLimit = charCount > MAX_CHARS * 0.9;

  // Session list view
  if (showSessions) {
    return (
      <Card className="flex flex-col h-[calc(100vh-12rem)] sm:h-[700px] rounded-2xl overflow-hidden border-border/50">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowSessions(false)} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold text-sm text-foreground">Conversas</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={handleNewChat} className="h-8 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Nova
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhuma conversa ainda
              </div>
            ) : (
              sessions.map(session => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    session.id === currentSessionId ? 'bg-primary/10' : 'hover:bg-accent'
                  }`}
                  onClick={() => loadSessionMessages(session.id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{session.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(session.updated_at).toLocaleDateString('pt-BR')} • {session.message_count} msgs
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteSessionId(session.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <AlertDialog open={!!deleteSessionId} onOpenChange={() => setDeleteSessionId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todas as mensagens desta conversa serão removidas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSession} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)] sm:h-[700px] rounded-2xl overflow-hidden border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Assistente Financy</h3>
            <p className="text-[11px] text-muted-foreground">
              {isPersonalContext ? 'Finanças Pessoais' : 'Gestão Empresarial'} • {currentDashboard?.name || 'Dashboard'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowSessions(true)} className="h-8 w-8 text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNewChat} className="h-8 w-8 text-muted-foreground">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-6">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center space-y-2 max-w-sm">
                <h4 className="text-lg font-semibold text-foreground">{greeting}</h4>
                <p className="text-sm text-muted-foreground">
                  Sou seu assistente financeiro. Posso registrar transações, consultar dados e dar insights sobre suas finanças.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="text-left text-sm px-3 py-2.5 rounded-xl border border-border/60 bg-card hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={msg.id || i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                )}
                <div className={`max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  {msg.toolResults && msg.toolResults.some(r => r.success) && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-primary">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                      Dados atualizados na plataforma
                    </div>
                  )}
                  {msg.timestamp && (
                    <p className={`text-[10px] text-muted-foreground mt-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                      {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-2.5 justify-start">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-muted">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3 bg-background">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isPersonalContext ? 'Pergunte sobre suas finanças...' : 'Pergunte sobre seu negócio...'}
              disabled={isLoading}
              rows={1}
              maxLength={MAX_CHARS}
              className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 max-h-[120px] pr-16"
            />
            <span className={`absolute right-3 bottom-2.5 text-[10px] ${isOverLimit ? 'text-destructive' : 'text-muted-foreground/60'}`}>
              {charCount}/{MAX_CHARS}
            </span>
          </div>
          <Button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim() || charCount > MAX_CHARS}
            size="icon"
            className="h-10 w-10 rounded-xl shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
