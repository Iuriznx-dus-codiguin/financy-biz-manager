import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  hasTransaction?: boolean;
  transactionId?: string;
  conversationId?: string;
}

interface AIAgentChatProps {
  agentType: 'support' | 'financial_intelligence' | 'tax_specialist';
  title: string;
  description: string;
  requiredFeature: string;
}

export const AIAgentChat = ({ agentType, title, description, requiredFeature }: AIAgentChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { isFeatureAvailable, getFeatureLimitMessage } = useFeatureAccess();

  const isAccessible = isFeatureAvailable(requiredFeature);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const getAgentEndpoint = () => {
    const endpoints = {
      support: 'ai-support-agent',
      financial_intelligence: 'ai-financial-agent',
      tax_specialist: 'ai-tax-agent'
    };
    return endpoints[agentType];
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    if (!isAccessible) {
      toast({
        title: "Acesso restrito",
        description: getFeatureLimitMessage(requiredFeature),
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    const currentMessage = inputMessage;
    setInputMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await supabase.functions.invoke(getAgentEndpoint(), {
        body: { message: currentMessage },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      // Agent response received - logging removed for security

      if (response.error) {
        console.error('Agent response error:', response.error);
        throw new Error(response.error.message || 'Erro na comunicação com o agente');
      }

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: response.data.response,
        timestamp: new Date(),
        hasTransaction: response.data.has_transaction,
        transactionId: response.data.transaction_id,
        conversationId: response.data.conversation_id
      };

      setMessages(prev => [...prev, agentMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmTransaction = async (transactionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('ai-financial-agent', {
        body: { 
          message: 'confirmar_transacao',
          action: 'confirm_transaction',
          transactionId 
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Atualizar a mensagem para mostrar que foi confirmada
      setMessages(prev => prev.map(msg => 
        msg.transactionId === transactionId 
          ? { ...msg, hasTransaction: false }
          : msg
      ));

      const confirmMessage: Message = {
        id: Date.now().toString(),
        type: 'agent',
        content: response.data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, confirmMessage]);

      toast({
        title: "Sucesso",
        description: "Transação salva na plataforma!",
      });

    } catch (error) {
      console.error('Error confirming transaction:', error);
      toast({
        title: "Erro",
        description: "Não foi possível confirmar a transação.",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isAccessible) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">
              {getFeatureLimitMessage(requiredFeature)}
            </div>
            <Button 
              onClick={() => {
                // Trigger navigation to subscription section
                const event = new CustomEvent('navigate-to-section', { detail: 'assinatura' });
                window.dispatchEvent(event);
              }} 
              variant="default"
            >
              Ver Planos
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[700px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Olá! Como posso ajudá-lo hoje?</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'agent' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                
                <div className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  
                  {message.hasTransaction && message.transactionId && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        onClick={() => confirmTransaction(message.transactionId!)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirmar
                      </Button>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground mt-1">
                    {message.timestamp.toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
                
                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="flex gap-2 mt-4">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={isLoading || !inputMessage.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};