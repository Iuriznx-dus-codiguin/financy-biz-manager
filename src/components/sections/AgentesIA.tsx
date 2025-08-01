import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Brain, Calculator, MessageCircle } from 'lucide-react';

const AgentesIA: React.FC = () => {
  return (
    <section id="agentes-ia" className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">Agentes de IA</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Nossos assistentes inteligentes especializados para ajudar na sua gestão financeira.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl shadow-sm border-border/50 hover:shadow-md transition-shadow">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 mb-4">
              <Bot className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl">Agente Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Coach financeiro básico com alertas, insights e sugestões personalizadas.
            </p>
            <div className="text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
              Em breve
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-border/50 hover:shadow-md transition-shadow">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-green-600 mb-4">
              <Calculator className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl">Especialista em Impostos</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Focado em planejamento tributário, declarações e dicas para MEIs e empresas.
            </p>
            <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
              Em breve
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-border/50 hover:shadow-md transition-shadow">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center text-purple-600 mb-4">
              <Brain className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl">Especialista Pessoal</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Dicas para controle de gastos, reserva de emergência e saída do vermelho.
            </p>
            <div className="text-sm text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded-lg">
              Em breve
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-border/50 hover:shadow-md transition-shadow">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center text-orange-600 mb-4">
              <MessageCircle className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl">Chatbot Inteligente</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Suporte 24/7 para responder dúvidas sobre uso da plataforma.
            </p>
            <div className="text-sm text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
              Em breve
            </div>
          </CardContent>
        </Card>
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
                <li>• <strong>Básico/Plus:</strong> Sem acesso aos agentes</li>
                <li>• <strong>PRO:</strong> Agente Financeiro + Suporte</li>
                <li>• <strong>Enterprise:</strong> Todos os agentes</li>
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