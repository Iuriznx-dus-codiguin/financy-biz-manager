import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Sparkles, Trash2, Plus, MessageSquare, PanelLeftClose, PanelLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useUserContext } from '@/hooks/useUserContext';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { currentDashboard } = useDashboard();
  const { isPersonalContext, nomePreferido } = useUserContext();
  const { user } = useAuth();
  const { carregarDados } = useAppContext();
  const isMobile = useIsMobile();

  const suggestions = isPersonalContext ? WELCOME_SUGGESTIONS_PERSONAL : WELCOME_SUGGESTIONS_BUSINESS;

  useEffect(() => {
    if (!user?.id) return;
    loadSessions();
    loadDailyCount();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || sessions.length === 0 || currentSessionId) return;
    const latest = sessions[0];
    if (latest) loadSessionMessages(latest.id);
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
    const { data: userSessions } = await supabase
      .from('ai_chat_sessions')
      .select('id')
      .eq('user_id', user.id);
    const sessionIds = userSessions?.map((s: any) => s.id) || [];
    if (sessionIds.length === 0) {
      setDailyCount(0);
      return;
    }
    const { count } = await supabase
      .from('ai_chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user')
      .gte('created_at', today.toISOString())
      .in('session_id', sessionIds);
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
    if (isMobile) setSidebarOpen(false);
  };

  const createNewSession = async () => {
    if (!user?.id) return null;
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .insert({ user_id: user.id, dashboard_id: currentDashboard?.id || null, title: 'Nova conversa' })
      .select('id, title, message_count, updated_at, created_at')
      .single();
    if (error || !data) return null;
    const session = data as ChatSession;
    setSessions(prev => [session, ...prev]);
    setCurrentSessionId(session.id);
    setMessages([]);
    if (isMobile) setSidebarOpen(false);
    return session.id;
  };

  const handleNewChat = async () => { await createNewSession(); };

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
      e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
    }
  };

  const saveMessage = async (sessionId: string, role: string, content: string, currentMsgCount: number, toolResults?: any) => {
    await supabase.from('ai_chat_messages').insert({
      session_id: sessionId, role, content, tool_results: toolResults || null,
    });
    const updates: any = { message_count: currentMsgCount + 1, updated_at: new Date().toISOString() };
    if (role === 'user' && currentMsgCount === 0) {
      updates.title = content.substring(0, 60);
    }
    await supabase.from('ai_chat_sessions').update(updates).eq('id', sessionId);
  };

  const sendMessage = useCallback(async (messageText?: string) => {
    const text = (messageText || input).trim();
    if (!text || isLoading) return;

    if (dailyCount >= MAX_DAILY_MESSAGES) {
      toast({ title: 'Limite diário atingido', description: 'Você atingiu o limite diário de mensagens. Tente novamente amanhã.', variant: 'destructive' });
      return;
    }

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

    await saveMessage(sessionId, 'user', text, messages.length);

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
        if (errMsg.includes('429') || errMsg.includes('Rate')) throw new Error('Limite de requisições atingido. Aguarde alguns segundos.');
        if (errMsg.includes('402')) throw new Error('Créditos de IA esgotados.');
        throw new Error(errMsg || 'Erro na comunicação com o agente');
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.response || 'Desculpe, não consegui processar sua mensagem.',
        timestamp: new Date(),
        toolResults: data.tool_results,
      };
      setMessages(prev => [...prev, assistantMsg]);
      await saveMessage(sessionId, 'assistant', assistantMsg.content, newMessages.length, assistantMsg.toolResults);

      if (newMessages.length === 1) {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: text.substring(0, 60) } : s));
      }
      if (data.tool_results?.some((r: any) => r.success)) {
        await carregarDados();
        window.dispatchEvent(new CustomEvent('financial-data-changed'));
      }
    } catch (error: any) {
      console.error('AI chat error:', error);
      toast({ title: 'Erro', description: error.message || 'Não foi possível enviar a mensagem.', variant: 'destructive' });
      setMessages(prev => prev.slice(0, -1));
      setInput(text);
      setDailyCount(prev => prev - 1);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading, currentDashboard, isPersonalContext, toast, currentSessionId, dailyCount]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const greeting = nomePreferido ? `Olá, ${nomePreferido}!` : 'Olá!';
  const charCount = input.length;
  const isOverLimit = charCount > MAX_CHARS * 0.9;

  const filteredSessions = searchQuery
    ? sessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : sessions;

  // Group sessions by date
  const groupedSessions = filteredSessions.reduce((groups, session) => {
    const date = new Date(session.updated_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    let label: string;
    if (diffDays === 0) label = 'Hoje';
    else if (diffDays === 1) label = 'Ontem';
    else if (diffDays <= 7) label = 'Últimos 7 dias';
    else if (diffDays <= 30) label = 'Últimos 30 dias';
    else label = 'Mais antigos';
    if (!groups[label]) groups[label] = [];
    groups[label].push(session);
    return groups;
  }, {} as Record<string, ChatSession[]>);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && isMobile && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Conversations Sidebar */}
      <div className={`
        ${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'}
        ${!isMobile && !sidebarOpen ? 'w-0 -ml-px overflow-hidden' : ''}
        ${isMobile ? (sidebarOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full w-[280px]') : (sidebarOpen ? 'w-[260px]' : '')}
        transition-all duration-200 ease-in-out
        bg-muted/50 border-r border-border flex flex-col shrink-0
      `}>
        {/* Sidebar Header */}
        <div className="p-3 flex items-center justify-between border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewChat}
            className="h-9 gap-2 text-xs font-medium flex-1 justify-start hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Nova conversa
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="h-8 w-8 shrink-0"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-border/50 bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Sessions List */}
        <ScrollArea className="flex-1">
          <div className="px-2 pb-3">
            {Object.keys(groupedSessions).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                Nenhuma conversa
              </div>
            ) : (
              Object.entries(groupedSessions).map(([label, groupSessions]) => (
                <div key={label} className="mt-3 first:mt-1">
                  <p className="px-2 mb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {label}
                  </p>
                  {groupSessions.map(session => (
                    <div
                      key={session.id}
                      className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                        session.id === currentSessionId
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50 text-foreground'
                      }`}
                      onClick={() => loadSessionMessages(session.id)}
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate flex-1 text-xs">{session.title}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        onClick={(e) => { e.stopPropagation(); setDeleteSessionId(session.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border/50">
          <div className="flex items-center gap-2 px-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium truncate">Financy AI</p>
              <p className="text-[10px] text-muted-foreground">
                {isPersonalContext ? 'Modo Pessoal' : 'Modo Empresarial'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Chat Header */}
        <div className="h-12 flex items-center px-3 gap-2 border-b border-border/50 shrink-0">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="h-8 w-8 text-muted-foreground"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {currentSessionId
                  ? sessions.find(s => s.id === currentSessionId)?.title || 'Assistente Financy'
                  : 'Assistente Financy'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            className="h-8 w-8 text-muted-foreground"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <div className="text-center space-y-2 max-w-md">
                  <h2 className="text-xl font-semibold text-foreground">{greeting}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {isPersonalContext
                      ? 'Como posso ajudar com suas finanças pessoais hoje?'
                      : 'Como posso ajudar com a gestão do seu negócio hoje?'}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      className="text-left text-sm px-4 py-3 rounded-xl border border-border/60 bg-card hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, i) => (
                  <div key={msg.id || i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-1">
                        <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                    )}
                    <div className={`${msg.role === 'user' ? 'max-w-[80%]' : 'max-w-[90%] flex-1'}`}>
                      <div className={`text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-br-md'
                          : ''
                      }`}>
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-3 [&>p:last-child]:mb-0 [&>ul]:mb-3 [&>ol]:mb-3 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm">
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
                    </div>
                    {msg.role === 'user' && (
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                      <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    <div className="flex items-center gap-1.5 py-2">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border/50 bg-background">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-muted/30 px-3 py-2 focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isPersonalContext ? 'Pergunte sobre suas finanças...' : 'Pergunte sobre seu negócio...'}
                disabled={isLoading}
                rows={1}
                maxLength={MAX_CHARS}
                className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 max-h-[150px] py-1.5"
              />
              <div className="flex items-center gap-2 shrink-0 pb-0.5">
                <span className={`text-[10px] ${isOverLimit ? 'text-destructive' : 'text-muted-foreground/50'}`}>
                  {charCount}/{MAX_CHARS}
                </span>
                <Button
                  onClick={() => sendMessage()}
                  disabled={isLoading || !input.trim() || charCount > MAX_CHARS}
                  size="icon"
                  className="h-8 w-8 rounded-xl"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
              Financy AI pode cometer erros. Verifique as informações importantes.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
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
    </div>
  );
};
