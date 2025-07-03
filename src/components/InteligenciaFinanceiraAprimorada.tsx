
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Brain, Zap } from 'lucide-react';

interface InteligenciaFinanceiraAprimoradaProps {
  receitas: any[];
  despesas: any[];
  impostos: any[];
  membrosEquipe?: any[];
}

export const InteligenciaFinanceiraAprimorada: React.FC<InteligenciaFinanceiraAprimoradaProps> = ({
  receitas,
  despesas,
  impostos,
  membrosEquipe = []
}) => {
  const totalReceitas = receitas.reduce((sum, r) => sum + r.valor, 0);
  const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0);
  const totalImpostos = impostos.filter(i => i.pago).reduce((sum, i) => sum + i.valor, 0);
  
  // Calcular custos de equipe
  const custoEquipe = membrosEquipe
    .filter(m => m.status === 'ativo')
    .reduce((sum, m) => {
      switch (m.periodicidade) {
        case 'mensal': return sum + m.salario;
        case 'semanal': return sum + (m.salario * 4);
        case 'quinzenal': return sum + (m.salario * 2);
        default: return sum;
      }
    }, 0);

  const lucroLiquido = totalReceitas - totalDespesas - totalImpostos - custoEquipe;
  const margemLucro = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;

  // Análises avançadas
  const gerarAnalises = () => {
    const analises = [];

    // Análise de performance
    if (margemLucro > 30) {
      analises.push({
        tipo: 'excelente',
        icone: <TrendingUp className="h-4 w-4" />,
        titulo: 'Performance Excepcional',
        descricao: `Margem de lucro de ${margemLucro.toFixed(1)}% indica excelente gestão financeira`,
        cor: 'bg-green-50 border-green-200 text-green-800'
      });
    } else if (margemLucro > 15) {
      analises.push({
        tipo: 'boa',
        icone: <Target className="h-4 w-4" />,
        titulo: 'Boa Performance',
        descricao: `Margem de ${margemLucro.toFixed(1)}% está em nível satisfatório`,
        cor: 'bg-blue-50 border-blue-200 text-blue-800'
      });
    } else if (margemLucro > 0) {
      analises.push({
        tipo: 'atencao',
        icone: <AlertTriangle className="h-4 w-4" />,
        titulo: 'Atenção Necessária',
        descricao: `Margem baixa de ${margemLucro.toFixed(1)}% - considere otimizar custos`,
        cor: 'bg-orange-50 border-orange-200 text-orange-800'
      });
    } else {
      analises.push({
        tipo: 'critico',
        icone: <TrendingDown className="h-4 w-4" />,
        titulo: 'Situação Crítica',
        descricao: 'Despesas excedem receitas - ação imediata necessária',
        cor: 'bg-red-50 border-red-200 text-red-800'
      });
    }

    // Análise de fluxo de caixa
    const receitasUltimos30Dias = receitas.filter(r => {
      const dataReceita = new Date(r.data);
      const hoje = new Date();
      const diff = hoje.getTime() - dataReceita.getTime();
      return diff <= 30 * 24 * 60 * 60 * 1000;
    }).reduce((sum, r) => sum + r.valor, 0);

    if (receitasUltimos30Dias > totalReceitas * 0.7) {
      analises.push({
        tipo: 'tendencia',
        icone: <Zap className="h-4 w-4" />,
        titulo: 'Tendência Positiva',
        descricao: '70% das receitas foram geradas nos últimos 30 dias',
        cor: 'bg-purple-50 border-purple-200 text-purple-800'
      });
    }

    // Análise de diversificação
    const categorias = receitas.reduce((acc, r) => {
      acc[r.categoria] = (acc[r.categoria] || 0) + 1;
      return acc;
    }, {});

    if (Object.keys(categorias).length >= 3) {
      analises.push({
        tipo: 'diversificacao',
        icone: <Brain className="h-4 w-4" />,
        titulo: 'Boa Diversificação',
        descricao: `${Object.keys(categorias).length} fontes de receita diferentes`,
        cor: 'bg-indigo-50 border-indigo-200 text-indigo-800'
      });
    }

    return analises;
  };

  const analises = gerarAnalises();

  // Recomendações personalizadas
  const gerarRecomendacoes = () => {
    const recomendacoes = [];

    if (margemLucro < 15) {
      recomendacoes.push({
        titulo: 'Otimização de Custos',
        descricao: 'Revise despesas operacionais e identifique oportunidades de redução',
        prioridade: 'alta'
      });
    }

    if (totalDespesas > totalReceitas * 0.8) {
      recomendacoes.push({
        titulo: 'Controle de Gastos',
        descricao: 'Despesas representam mais de 80% da receita - estabeleça limites',
        prioridade: 'alta'
      });
    }

    if (Object.keys(receitas.reduce((acc, r) => ({ ...acc, [r.categoria]: true }), {})).length < 3) {
      recomendacoes.push({
        titulo: 'Diversificação de Receitas',
        descricao: 'Explore novas fontes de receita para reduzir dependência',
        prioridade: 'media'
      });
    }

    if (custoEquipe > totalReceitas * 0.4) {
      recomendacoes.push({
        titulo: 'Análise de Produtividade',
        descricao: 'Custos com equipe são altos - avalie produtividade e retorno',
        prioridade: 'media'
      });
    }

    return recomendacoes;
  };

  const recomendacoes = gerarRecomendacoes();

  return (
    <Card className="rounded-2xl shadow-sm border-gradient-to-r from-blue-200 to-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          Inteligência Financeira Avançada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Análises Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analises.map((analise, index) => (
            <div key={index} className={`p-4 rounded-xl border ${analise.cor}`}>
              <div className="flex items-center gap-2 mb-2">
                {analise.icone}
                <h4 className="font-semibold">{analise.titulo}</h4>
              </div>
              <p className="text-sm">{analise.descricao}</p>
            </div>
          ))}
        </div>

        {/* Métricas Avançadas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <p className="text-xs text-blue-600 font-medium">Eficiência Operacional</p>
            <p className="text-lg font-bold text-blue-800">
              {totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
            <p className="text-xs text-green-600 font-medium">Ticket Médio</p>
            <p className="text-lg font-bold text-green-800">
              R$ {receitas.length > 0 ? (totalReceitas / receitas.length).toFixed(0) : 0}
            </p>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
            <p className="text-xs text-purple-600 font-medium">Burn Rate</p>
            <p className="text-lg font-bold text-purple-800">
              R$ {((totalDespesas + custoEquipe) / 30).toFixed(0)}/dia
            </p>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
            <p className="text-xs text-orange-600 font-medium">Runway</p>
            <p className="text-lg font-bold text-orange-800">
              {lucroLiquido > 0 && totalDespesas > 0 ? Math.floor(lucroLiquido / (totalDespesas / 30)) : 0} dias
            </p>
          </div>
        </div>

        {/* Recomendações */}
        {recomendacoes.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Recomendações Personalizadas</h4>
            <div className="space-y-2">
              {recomendacoes.map((rec, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
                  <Badge variant={rec.prioridade === 'alta' ? 'destructive' : 'secondary'} className="text-xs">
                    {rec.prioridade === 'alta' ? 'Alta' : 'Média'}
                  </Badge>
                  <div>
                    <p className="font-medium text-sm">{rec.titulo}</p>
                    <p className="text-xs text-muted-foreground">{rec.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights Rápidos */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">💡 Insight do Momento</h4>
          <p className="text-sm text-blue-700">
            {margemLucro > 20 
              ? "Sua margem de lucro está excelente! Considere reinvestir em crescimento ou diversificação."
              : margemLucro > 10
              ? "Margem saudável, mas há espaço para otimização. Foque em aumentar receitas ou reduzir custos."
              : margemLucro > 0
              ? "Margem baixa indica necessidade de revisão estratégica. Analise custos e precificação."
              : "Situação requer atenção imediata. Revise modelo de negócio e estrutura de custos."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
