
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb } from 'lucide-react';

interface InteligenciaFinanceiraProps {
  receitas: any[];
  despesas: any[];
  impostos: any[];
}

export const InteligenciaFinanceira: React.FC<InteligenciaFinanceiraProps> = ({
  receitas,
  despesas,
  impostos
}) => {
  const totalReceitas = receitas.reduce((sum, r) => sum + r.valor, 0);
  const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0);
  const totalImpostosPagos = impostos.filter(i => i.pago).reduce((sum, i) => sum + i.valor, 0);
  const totalImpostosAberto = impostos.filter(i => !i.pago).reduce((sum, i) => sum + i.valor, 0);
  
  const margemLiquida = totalReceitas > 0 ? ((totalReceitas - totalDespesas - totalImpostosPagos) / totalReceitas) * 100 : 0;
  const taxaQueima = totalDespesas / (totalReceitas || 1);
  
  // Cálculo básico de valuation (múltiplo de receita)
  const receitaAnualizada = totalReceitas * 12;
  const valuationEstimado = receitaAnualizada * 3; // Múltiplo conservador para PMEs

  const gerarDicas = () => {
    const dicas = [];

    if (margemLiquida < 20) {
      dicas.push({
        tipo: 'alerta',
        icon: AlertTriangle,
        titulo: 'Margem Baixa',
        descricao: 'Sua margem líquida está abaixo de 20%. Considere revisar custos ou aumentar preços.'
      });
    }

    if (taxaQueima > 0.8) {
      dicas.push({
        tipo: 'alerta',
        icon: TrendingDown,
        titulo: 'Alto Gasto Relativo',
        descricao: 'Seus gastos representam mais de 80% da receita. Foque em otimização de custos.'
      });
    }

    if (totalImpostosAberto > totalReceitas * 0.1) {
      dicas.push({
        tipo: 'aviso',
        icon: AlertTriangle,
        titulo: 'Impostos Pendentes',
        descricao: 'Você tem impostos em aberto que representam mais de 10% da receita.'
      });
    }

    if (receitas.length > 0 && margemLiquida > 30) {
      dicas.push({
        tipo: 'sucesso',
        icon: TrendingUp,
        titulo: 'Boa Margem!',
        descricao: 'Excelente! Sua margem líquida está acima de 30%. Continue assim!'
      });
    }

    if (dicas.length === 0) {
      dicas.push({
        tipo: 'dica',
        icon: Lightbulb,
        titulo: 'Dica Geral',
        descricao: 'Mantenha um controle rigoroso das entradas e saídas para uma gestão eficiente.'
      });
    }

    return dicas;
  };

  const dicas = gerarDicas();

  const getColorByTipo = (tipo: string) => {
    switch (tipo) {
      case 'alerta': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'aviso': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'sucesso': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      default: return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Inteligência Financeira
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {dicas.map((dica, index) => {
            const IconComponent = dica.icon;
            return (
              <div key={index} className={`p-4 rounded-xl ${getColorByTipo(dica.tipo)}`}>
                <div className="flex items-start gap-3">
                  <IconComponent className="h-5 w-5 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">{dica.titulo}</h4>
                    <p className="text-sm opacity-90">{dica.descricao}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Métricas Avançadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-sm text-muted-foreground">Margem Líquida</p>
              <p className="text-lg font-bold text-blue-600">{margemLiquida.toFixed(1)}%</p>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <p className="text-sm text-muted-foreground">Taxa de Queima</p>
              <p className="text-lg font-bold text-purple-600">{(taxaQueima * 100).toFixed(1)}%</p>
            </div>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl">
            <h4 className="font-semibold mb-2">Valuation Estimado</h4>
            <p className="text-2xl font-bold text-green-600">
              R$ {valuationEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Baseado em múltiplo de 3x da receita anualizada
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Receita Anualizada</span>
              <span className="font-medium">R$ {receitaAnualizada.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Impostos Pendentes</span>
              <Badge variant={totalImpostosAberto > 0 ? "destructive" : "secondary"}>
                R$ {totalImpostosAberto.toLocaleString('pt-BR')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
