import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Brain, Calculator, MessageCircle } from 'lucide-react';
import { AIAgentChat } from '@/components/AIAgentChat';

const AgentesIA: React.FC = () => {
  const agents = [
    {
      id: "support",
      title: "Agente de Suporte",
      description: "Tire dúvidas sobre a plataforma Financy 24h por dia",
      icon: MessageCircle,
      requiredFeature: "inteligencia_basica",
      plan: "Plus",
      color: "orange"
    },
    {
      id: "financial_intelligence",
      title: "Inteligência Financeira", 
      description: "Reconhece gastos e receitas em linguagem natural",
      icon: Brain,
      requiredFeature: "inteligencia_basica",
      plan: "Plus",
      color: "blue"
    },
    {
      id: "tax_specialist",
      title: "Especialista em Impostos",
      description: "Orientações sobre MEI, DAS e demais obrigações fiscais",
      icon: Calculator,
      requiredFeature: "inteligencia_avancada", 
      plan: "Premium",
      color: "green"
    }
  ];

  return (
    <section id="agentes-ia" className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">Agentes de IA</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Assistentes inteligentes especializados para sua gestão financeira
        </p>
      </div>

      <Tabs defaultValue="support" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {agents.map((agent) => (
            <TabsTrigger key={agent.id} value={agent.id} className="flex items-center gap-2">
              <agent.icon className="h-4 w-4" />
              {agent.title}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {agents.map((agent) => (
          <TabsContent key={agent.id} value={agent.id} className="mt-6">
            <AIAgentChat
              agentType={agent.id as 'support' | 'financial_intelligence' | 'tax_specialist'}
              title={agent.title}
              description={agent.description}
              requiredFeature={agent.requiredFeature}
            />
          </TabsContent>
        ))}
      </Tabs>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Sobre os Agentes de IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Nossos agentes de IA são assistentes especializados, cada um treinado para uma área específica 
            da gestão financeira. Eles trabalham 24/7 para fornecer insights, alertas e orientações 
            personalizadas baseadas nos seus dados financeiros.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Disponibilidade por Plano:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <strong>Plus:</strong> Suporte + Inteligência Financeira</li>
                <li>• <strong>Premium:</strong> Todos os agentes incluindo Especialista em Impostos</li>
                <li>• <strong>Enterprise:</strong> Acesso completo + funcionalidades avançadas</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Funcionalidades:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Análise automática de padrões</li>
                <li>• Alertas proativos</li>
                <li>• Recomendações personalizadas</li>
                <li>• Suporte contextual</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default AgentesIA;