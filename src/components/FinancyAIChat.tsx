import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useDashboard } from '@/hooks/useDashboard';
import { useUserContext } from '@/hooks/useUserContext';
import { useAuth } from '@/hooks/useAuth';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  toolResults?: Array<{ success: boolean; message?: string; error?: string }>;
}

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { currentDashboard } = useDashboard();
  const { isPersonalContext, nomePreferido, currentDashboardType } = useUserContext();
  const { user } = useAuth();

  const suggestions = isPersonalContext ? WELCOME_SUGGESTIONS_PERSONAL : WELCOME_SUGGESTIONS_BUSINESS;

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const sendMessage = useCallback(async (messageText?: string) => {
    const text = (messageText || input).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Não autenticado');

      // Send full conversation history
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
        // Check for rate limit or payment errors
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

      // If there were tool actions (transactions created/deleted), trigger data reload
      if (data.tool_results?.some((r: any) => r.success)) {
        // Dispatch event to reload financial data
        window.dispatchEvent(new CustomEvent('financial-data-changed'));
      }

    } catch (error: any) {
      console.error('AI chat error:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível enviar a mensagem.',
        variant: 'destructive',
      });
      // Remove the user message if failed
      setMessages(prev => prev.slice(0, -1));
      setInput(text);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading, currentDashboard, isPersonalContext, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const greeting = nomePreferido ? `Olá, ${nomePreferido}! 👋` : 'Olá! 👋';

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
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={clearChat} className="h-8 w-8 text-muted-foreground">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
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
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-green-600 dark:text-green-400">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
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
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isPersonalContext ? 'Pergunte sobre suas finanças...' : 'Pergunte sobre seu negócio...'}
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 max-h-[120px]"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
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
