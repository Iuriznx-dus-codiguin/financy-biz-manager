import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertCircle, Target, Lightbulb } from 'lucide-react';

interface Props {
  receitas: any[];
  despesas: any[];
  impostos: any[];
  membrosEquipe: any[];
}

export const InteligenciaFinanceiraBasica: React.FC<Props> = ({ 
  receitas, 
  despesas, 
  impostos, 
  membrosEquipe 
}) => {
  const totalReceitas = receitas.reduce((sum, r) => sum + r.valor, 0);
  const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0);
  const totalImpostos = impostos.filter(i => i.pago).reduce((sum, i) => sum + i.valor, 0);
  const lucro = totalReceitas - totalDespesas - totalImpostos;

  const insights = [
    {
      type: lucro > 0 ? 'positive' : 'negative',
      icon: lucro > 0 ? TrendingUp : TrendingDown,
      title: lucro > 0 ? 'Situação Positiva' : 'Atenção Necessária',
      message: lucro > 0 
        ? `Seu negócio está gerando lucro de R$ ${lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : `Você tem prejuízo de R$ ${Math.abs(lucro).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Revise suas despesas.`
    },
    {
      type: 'info',
      icon: Target,
      title: 'Fluxo de Caixa',
      message: totalReceitas > totalDespesas 
        ? 'Suas receitas estão superando as despesas. Continue assim!'
        : 'Suas despesas estão altas. Considere reduzir gastos desnecessários.'
    },
    {
      type: 'warning',
      icon: AlertCircle,
      title: 'Impostos',
      message: impostos.some(i => !i.pago) 
        ? `Você tem ${impostos.filter(i => !i.pago).length} impostos pendentes.`
        : 'Todos os impostos estão em dia!'
    }
  ];

  const dicas = [
    'Mantenha uma reserva de emergência de 3-6 meses de despesas',
    'Revise seus gastos mensalmente para identificar economias',
    'Invista em ferramentas que automatizem sua gestão financeira',
    'Separe sempre um percentual das receitas para impostos'
  ];

  return (
    <Card className="rounded-2xl shadow-sm animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-blue-600" />
          Inteligência Financeira Básica
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Plus
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Insights Básicos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <Card 
                key={index} 
                className={`rounded-xl border-l-4 transition-all hover:shadow-md ${
                  insight.type === 'positive' ? 'border-l-green-500 bg-green-50/50' :
                  insight.type === 'negative' ? 'border-l-red-500 bg-red-50/50' :
                  insight.type === 'warning' ? 'border-l-orange-500 bg-orange-50/50' :
                  'border-l-blue-500 bg-blue-50/50'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 mt-0.5 ${
                      insight.type === 'positive' ? 'text-green-600' :
                      insight.type === 'negative' ? 'text-red-600' :
                      insight.type === 'warning' ? 'text-orange-600' :
                      'text-blue-600'
                    }`} />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
                      <p className="text-xs text-muted-foreground">{insight.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Dicas Financeiras */}
        <div>
          <h4 className="font-semibold mb-3 text-foreground">💡 Dicas Financeiras</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dicas.map((dica, index) => (
              <div 
                key={index} 
                className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-muted-foreground">{dica}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo Financeiro Simples */}
        <Card className="rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-3 text-foreground">📊 Resumo do Mês</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Receitas</p>
                <p className="font-bold text-green-600">
                  R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Despesas</p>
                <p className="font-bold text-red-600">
                  R$ {(totalDespesas + totalImpostos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Resultado</p>
                <p className={`font-bold ${lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};