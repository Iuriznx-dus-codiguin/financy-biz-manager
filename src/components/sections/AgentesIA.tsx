import React from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { FinancyAIChat } from '@/components/FinancyAIChat';
import { useUserContext } from '@/hooks/useUserContext';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AgentesIA: React.FC = () => {
  const { isPersonalContext, currentDashboardType } = useUserContext();
  const { isFeatureAvailable, getFeatureLimitMessage } = useFeatureAccess();

  const hasAccess = isFeatureAvailable('inteligencia_basica');

  if (!hasAccess) {
    return (
      <section id="agentes-ia" className="space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Assistente de IA</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Seu copiloto financeiro inteligente
          </p>
        </div>

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
      </section>
    );
  }

  return (
    <section id="agentes-ia" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Assistente de IA
          </h1>
          <p className="text-sm text-muted-foreground">
            {isPersonalContext
              ? 'Gerencie suas finanças pessoais por chat'
              : 'Gerencie seu negócio por chat'}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {isPersonalContext ? '👤 Pessoal' : '🏢 Empresarial'}
        </Badge>
      </div>

      <FinancyAIChat />
    </section>
  );
};

export default AgentesIA;
