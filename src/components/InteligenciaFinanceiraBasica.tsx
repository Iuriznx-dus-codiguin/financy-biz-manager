import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, DollarSign } from 'lucide-react';
import type { Receita, Despesa, Imposto } from '@/contexts/AppContext';

interface InteligenciaFinanceiraBasicaProps {
  receitas: Receita[];
  despesas: Despesa[];
  impostos: Imposto[];
}

export const InteligenciaFinanceiraBasica: React.FC<InteligenciaFinanceiraBasicaProps> = memo(({
  receitas,
  despesas,
  impostos
}) => {
  const { totalReceitas, totalDespesas, saldoAtual, totalImpostosAberto } = useMemo(() => {
    const total_receitas = receitas.reduce((sum, r) => sum + r.valor, 0);
    const total_despesas = despesas.reduce((sum, d) => sum + d.valor, 0);
    const total_impostos = impostos.reduce((sum, i) => sum + i.valor, 0);
    const saldo_atual = total_receitas - total_despesas - total_impostos;
    const total_impostos_aberto = impostos.filter(i => !i.pago).reduce((sum, i) => sum + i.valor, 0);
    
    return {
      totalReceitas: total_receitas,
      totalDespesas: total_despesas,
      saldoAtual: saldo_atual,
      totalImpostosAberto: total_impostos_aberto
    };
  }, [receitas, despesas, impostos]);
  
  const gerarDicasBasicas = useMemo(() => {
    const dicas = [];

    if (saldoAtual < 0) {
      dicas.push({
        tipo: 'alerta',
        icon: AlertTriangle,
        titulo: 'Saldo Negativo',
        descricao: 'Suas despesas estão maiores que as receitas. Revise seus gastos.'
      });
    } else if (saldoAtual > 0) {
      dicas.push({
        tipo: 'sucesso',
        icon: TrendingUp,
        titulo: 'Saldo Positivo',
        descricao: 'Parabéns! Você está com saldo positivo este mês.'
      });
    }

    if (totalImpostosAberto > 0) {
      dicas.push({
        tipo: 'aviso',
        icon: AlertTriangle,
        titulo: 'Impostos Pendentes',
        descricao: `Você tem R$ ${totalImpostosAberto.toLocaleString('pt-BR')} em impostos pendentes.`
      });
    }

    if (totalDespesas > totalReceitas * 0.9) {
      dicas.push({
        tipo: 'aviso',
        icon: TrendingDown,
        titulo: 'Gastos Altos',
        descricao: 'Seus gastos estão consumindo mais de 90% da receita.'
      });
    }

    if (dicas.length === 0) {
      dicas.push({
        tipo: 'dica',
        icon: Lightbulb,
        titulo: 'Continue Assim!',
        descricao: 'Sua situação financeira está equilibrada. Mantenha o controle!'
      });
    }

    return dicas.slice(0, 3); // Máximo 3 dicas para versão básica
  }, [saldoAtual, totalImpostosAberto, totalDespesas, totalReceitas]);

  const dicas = gerarDicasBasicas;

  const getColorByTipo = (tipo: string) => {
    switch (tipo) {
      case 'alerta': return 'text-destructive bg-destructive/10';
      case 'aviso': return 'text-warning bg-warning/10';
      case 'sucesso': return 'text-success bg-success/10';
      default: return 'text-primary bg-primary/10';
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Inteligência Financeira Básica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-primary/10 rounded-xl">
            <DollarSign className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Saldo Atual</p>
            <p className={`text-lg font-bold ${saldoAtual >= 0 ? 'text-success' : 'text-destructive'}`}>
              R$ {saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center p-4 bg-success/10 rounded-xl">
            <TrendingUp className="h-6 w-6 text-success mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Total Receitas</p>
            <p className="text-lg font-bold text-success">
              R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center p-4 bg-destructive/10 rounded-xl">
            <TrendingDown className="h-6 w-6 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Total Despesas</p>
            <p className="text-lg font-bold text-destructive">
              R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-foreground">Insights e Recomendações</h4>
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
        </div>
      </CardContent>
    </Card>
  );
});