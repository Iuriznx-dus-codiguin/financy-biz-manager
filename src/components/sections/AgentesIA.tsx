import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Brain, Calculator, MessageCircle } from 'lucide-react';
import { AIAgentChat } from '@/components/AIAgentChat';

const AgentesIA: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState('support');
  
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

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent);

  return (
    <section id="agentes-ia" className="space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">Agentes de IA</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Assistentes inteligentes especializados para sua gestão financeira
        </p>
      </div>

      {/* Seletor de Agente */}
      <div className="w-full max-w-md mx-auto">
        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione um agente" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((agent) => {
              const Icon = agent.icon;
              return (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{agent.title}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      agent.color === 'orange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                      agent.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {agent.plan}
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Chat Area */}
      <div className="w-full max-w-4xl mx-auto">
        {selectedAgentData && (
          <AIAgentChat
            agentType={selectedAgent as 'support' | 'financial_intelligence' | 'tax_specialist'}
            title={selectedAgentData.title}
            description={selectedAgentData.description}
            requiredFeature={selectedAgentData.requiredFeature}
          />
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Sobre os Agentes de IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Nossos agentes de IA são assistentes especializados, cada um treinado para uma área específica 
              da gestão financeira. Eles trabalham 24/7 para fornecer insights e orientações personalizadas.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Disponibilidade por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Gratuito:</strong> Suporte básico</li>
              <li>• <strong>Plus:</strong> Suporte + Inteligência Financeira</li>
              <li>• <strong>Premium:</strong> Todos os agentes + Impostos</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default AgentesIA;