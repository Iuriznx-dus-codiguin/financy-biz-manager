import React from 'react';
import { Sparkles } from 'lucide-react';
import { FinancyAIChat } from '@/components/FinancyAIChat';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AgentesIA: React.FC = () => {
  const { isFeatureAvailable, getFeatureLimitMessage } = useFeatureAccess();
  const hasAccess = isFeatureAvailable('inteligencia_basica');

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-lg mx-auto rounded-2xl">
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Desbloqueie o Assistente de IA</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground text-sm">
              {getFeatureLimitMessage('inteligencia_basica')}
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 text-left max-w-xs mx-auto">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                Registre transações por mensagem de texto
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                Consulte dados financeiros em tempo real
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                Receba insights e alertas personalizados
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                Adaptado ao seu tipo de conta
              </li>
            </ul>
            <Button
              onClick={() => {
                const event = new CustomEvent('navigate-to-section', { detail: 'assinatura' });
                window.dispatchEvent(event);
              }}
              className="w-full"
            >
              Ver Planos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <FinancyAIChat />;
};

export default AgentesIA;
