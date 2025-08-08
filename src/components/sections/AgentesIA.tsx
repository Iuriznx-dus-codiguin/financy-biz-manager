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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {agents.map((agent) => (
          <Card key={agent.id} className="rounded-2xl hover:shadow-lg transition-all duration-300 border-border/50 group cursor-pointer relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity ${
              agent.color === 'orange' ? 'from-orange-500 to-orange-600' :
              agent.color === 'blue' ? 'from-blue-500 to-blue-600' :
              'from-green-500 to-green-600'
            }`} />
            <CardHeader className="pb-4 relative">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  agent.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30' :
                  agent.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                  'bg-green-100 dark:bg-green-900/30'
                }`}>
                  <agent.icon className={`h-6 w-6 ${
                    agent.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                    agent.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                    'text-green-600 dark:text-green-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold">{agent.title}</CardTitle>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                    agent.color === 'orange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                    agent.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  }`}>
                    {agent.plan}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                {agent.description}
              </p>
              <AIAgentChat
                agentType={agent.id as 'support' | 'financial_intelligence' | 'tax_specialist'}
                title={agent.title}
                description={agent.description}
                requiredFeature={agent.requiredFeature}
              />
            </CardContent>
          </Card>
        ))}
      </div>

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