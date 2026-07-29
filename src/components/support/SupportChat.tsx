import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, LifeBuoy, User, Plus, ThumbsUp, ThumbsDown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  useSupportChat,
  MAX_SUPPORT_CHARS,
  SUPPORT_STATE_LABEL,
} from '@/hooks/useSupportChat';

const SUGGESTIONS = [
  'Não estou conseguindo entrar na minha conta',
  'Paguei minha assinatura mas continua bloqueada',
  'Como importo minhas transações de uma planilha?',
  'Recebi o código de erro AUTH-001',
];

interface SupportChatProps {
  /** Exibe a lista de atendimentos anteriores ao lado (somente desktop) */
  showHistory?: boolean;
  className?: string;
}

export const SupportChat = ({ showHistory = false, className }: SupportChatProps) => {
  const {
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
  } = useSupportChat();

  const [input, setInput] = useState('');
  const [rated, setRated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading, conversationId]);

  useEffect(() => {
    setRated(false);
  }, [conversationId]);

  const handleSend = async () => {
    const text = input;
    if (!text.trim() || isLoading) return;
    setInput('');
    await sendMessage(text);
  };

  const stateLabel = SUPPORT_STATE_LABEL[state] ?? state;

  return (
    <div className={cn('flex h-full min-h-0 gap-4', className)}>
      {showHistory && (
        <aside className="hidden lg:flex w-64 shrink-0 flex-col rounded-lg border bg-card">
          <div className="p-3 border-b">
            <Button size="sm" className="w-full" onClick={startNewConversation}>
              <Plus className="h-4 w-4 mr-2" />
              Novo atendimento
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.length === 0 && (
                <p className="text-xs text-muted-foreground p-2">
                  Nenhum atendimento anterior.
                </p>
              )}
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  className={cn(
                    'w-full text-left rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted',
                    c.id === conversationId && 'bg-muted'
                  )}
                >
                  <span className="block truncate">{c.subject || 'Atendimento'}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {SUPPORT_STATE_LABEL[c.state] ?? c.state}
                    {c.ticket_id ? ` · ${c.ticket_id}` : ''}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-h-0 rounded-lg border bg-card">
        <header className="flex items-center justify-between gap-2 border-b p-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <LifeBuoy className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">Suporte Financy</p>
              <p className="text-xs text-muted-foreground truncate">
                Diagnóstico técnico e dúvidas sobre a plataforma
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={state === 'escalated' ? 'destructive' : 'secondary'}>{stateLabel}</Badge>
            {ticketId && <Badge variant="outline">{ticketId}</Badge>}
          </div>
        </header>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 space-y-4">
                <LifeBuoy className="h-10 w-10 mx-auto text-primary/60" />
                <div>
                  <p className="font-medium">Olá! Como posso ajudar?</p>
                  <p className="text-sm text-muted-foreground">
                    Descreva o que aconteceu ou informe o código do erro que apareceu na tela.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => sendMessage(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {m.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <LifeBuoy className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={cn('max-w-[85%] space-y-1', m.role === 'user' && 'order-first')}>
                  {m.role === 'user' ? (
                    <div className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground whitespace-pre-wrap">
                      {m.content}
                    </div>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  )}
                  {m.matched_code && (
                    <Badge variant="outline" className="text-[10px]">
                      {m.matched_code}
                    </Badge>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <p className="text-sm text-muted-foreground animate-pulse">Analisando seu caso...</p>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {messages.length > 1 && !isLoading && !rated && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm">
                <span className="text-muted-foreground">Isso resolveu seu problema?</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    rateConversation(1);
                    setRated(true);
                  }}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    rateConversation(0);
                    setRated(true);
                  }}
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div ref={endRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-3 space-y-2">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_SUPPORT_CHARS))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Descreva o problema ou informe o código do erro..."
              rows={2}
              className="resize-none"
              disabled={isLoading}
            />
            <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Nunca compartilhe senhas ou dados de cartão.</span>
            <span>
              {input.length}/{MAX_SUPPORT_CHARS}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
