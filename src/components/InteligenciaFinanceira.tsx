
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target, DollarSign, PieChart, Activity, Zap, Shield } from 'lucide-react';

interface InteligenciaFinanceiraProps {
  receitas: any[];
  despesas: any[];
  impostos: any[];
  membrosEquipe?: any[];
  metricas?: {
    roi: number;
    roas: number;
    margemLucro: number;
    breakEvenPoint: number;
    custosOperacionais: number;
  };
}

export const InteligenciaFinanceira: React.FC<InteligenciaFinanceiraProps> = ({
  receitas,
  despesas,
  impostos,
  membrosEquipe = [],
  metricas
}) => {
  const analytics = useMemo(() => {
    const totalReceitas = receitas.reduce((sum, r) => sum + r.valor, 0);
    const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0);
    const totalImpostosPagos = impostos.filter(i => i.pago).reduce((sum, i) => sum + i.valor, 0);
    const totalImpostosAberto = impostos.filter(i => !i.pago).reduce((sum, i) => sum + i.valor, 0);
    
    const margemLiquida = totalReceitas > 0 ? ((totalReceitas - totalDespesas - totalImpostosPagos) / totalReceitas) * 100 : 0;
    const taxaQueima = totalDespesas / (totalReceitas || 1);
    const receitaAnualizada = totalReceitas * 12;
    const valuationEstimado = receitaAnualizada * 3.5;
    
    // Análise de tendências (últimos 30 dias)
    const hoje = new Date();
    const ultimoMes = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const receitasUltimoMes = receitas.filter(r => new Date(r.data) >= ultimoMes).reduce((sum, r) => sum + r.valor, 0);
    const despesasUltimoMes = despesas.filter(d => new Date(d.data) >= ultimoMes).reduce((sum, d) => sum + d.valor, 0);
    
    const crescimentoReceitas = totalReceitas > receitasUltimoMes ? 
      ((totalReceitas - receitasUltimoMes) / (receitasUltimoMes || 1)) * 100 : 0;
    
    // Eficiência operacional
    const eficienciaOperacional = totalReceitas > 0 ? (totalReceitas - totalDespesas) / totalReceitas * 100 : 0;
    
    // Saúde financeira (0-100)
    let saudeFinanceira = 0;
    if (margemLiquida > 20) saudeFinanceira += 30;
    else if (margemLiquida > 10) saudeFinanceira += 20;
    else if (margemLiquida > 0) saudeFinanceira += 10;
    
    if (taxaQueima < 0.7) saudeFinanceira += 25;
    else if (taxaQueima < 0.8) saudeFinanceira += 15;
    else if (taxaQueima < 0.9) saudeFinanceira += 10;
    
    if (totalImpostosAberto < totalReceitas * 0.05) saudeFinanceira += 20;
    else if (totalImpostosAberto < totalReceitas * 0.1) saudeFinanceira += 10;
    
    if (crescimentoReceitas > 10) saudeFinanceira += 25;
    else if (crescimentoReceitas > 0) saudeFinanceira += 15;
    
    return {
      totalReceitas,
      totalDespesas,
      totalImpostosPagos,
      totalImpostosAberto,
      margemLiquida,
      taxaQueima,
      receitaAnualizada,
      valuationEstimado,
      crescimentoReceitas,
      eficienciaOperacional,
      saudeFinanceira: Math.min(saudeFinanceira, 100)
    };
  }, [receitas, despesas, impostos]);

  const gerarDicas = () => {
    const dicas = [];

    // ROI Analysis
    if (metricas?.roi !== undefined) {
      if (metricas.roi > 50) {
        dicas.push({
          tipo: 'sucesso',
          icon: Target,
          titulo: 'ROI Excelente!',
          descricao: `Seu ROI de ${metricas.roi.toFixed(1)}% está excepcional. Continue investindo nessas estratégias.`,
          impacto: 'alto'
        });
      } else if (metricas.roi > 20) {
        dicas.push({
          tipo: 'sucesso',
          icon: Target,
          titulo: 'ROI Positivo',
          descricao: `ROI de ${metricas.roi.toFixed(1)}% é bom. Procure oportunidades para otimizar ainda mais.`,
          impacto: 'medio'
        });
      } else if (metricas.roi < 0) {
        dicas.push({
          tipo: 'alerta',
          icon: AlertTriangle,
          titulo: 'ROI Negativo',
          descricao: 'Urgente: Revise suas estratégias de investimento e reduza custos operacionais.',
          impacto: 'alto'
        });
      }
    }

    // ROAS Analysis
    if (metricas?.roas !== undefined) {
      if (metricas.roas > 4) {
        dicas.push({
          tipo: 'sucesso',
          icon: Zap,
          titulo: 'ROAS Excepcional',
          descricao: `ROAS de ${metricas.roas.toFixed(2)}x indica alta eficiência nos investimentos.`,
          impacto: 'alto'
        });
      } else if (metricas.roas < 2) {
        dicas.push({
          tipo: 'aviso',
          icon: AlertTriangle,
          titulo: 'ROAS Baixo',
          descricao: 'Considere revisar seus canais de aquisição e otimizar campanhas.',
          impacto: 'medio'
        });
      }
    }

    // Margem Analysis
    if (analytics.margemLiquida < 10) {
      dicas.push({
        tipo: 'alerta',
        icon: AlertTriangle,
        titulo: 'Margem Crítica',
        descricao: 'Margem abaixo de 10% requer ação imediata para manter sustentabilidade.',
        impacto: 'alto'
      });
    } else if (analytics.margemLiquida > 30) {
      dicas.push({
        tipo: 'sucesso',
        icon: TrendingUp,
        titulo: 'Margem Excelente!',
        descricao: `Margem de ${analytics.margemLiquida.toFixed(1)}% está muito boa. Considere reinvestir parte do lucro.`,
        impacto: 'alto'
      });
    }

    // Crescimento Analysis
    if (analytics.crescimentoReceitas > 20) {
      dicas.push({
        tipo: 'sucesso',
        icon: TrendingUp,
        titulo: 'Crescimento Acelerado',
        descricao: `Crescimento de ${analytics.crescimentoReceitas.toFixed(1)}% é excelente! Prepare-se para escalar.`,
        impacto: 'alto'
      });
    } else if (analytics.crescimentoReceitas < 0) {
      dicas.push({
        tipo: 'aviso',
        icon: TrendingDown,
        titulo: 'Receitas em Declínio',
        descricao: 'Foque em reativação de clientes e novas estratégias de aquisição.',
        impacto: 'alto'
      });
    }

    // Impostos Analysis
    if (analytics.totalImpostosAberto > analytics.totalReceitas * 0.15) {
      dicas.push({
        tipo: 'alerta',
        icon: AlertTriangle,
        titulo: 'Impostos Acumulados',
        descricao: 'Impostos pendentes representam mais de 15% da receita. Priorize quitação.',
        impacto: 'alto'
      });
    }

    // Default dica if none apply
    if (dicas.length === 0) {
      dicas.push({
        tipo: 'dica',
        icon: Lightbulb,
        titulo: 'Continue Monitorando',
        descricao: 'Acompanhe regularmente suas métricas para identificar oportunidades de melhoria.',
        impacto: 'baixo'
      });
    }

    return dicas.slice(0, 4); // Limit to 4 most important insights
  };

  const dicas = gerarDicas();

  const getColorByTipo = (tipo: string) => {
    switch (tipo) {
      case 'alerta': return 'border-red-200 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20';
      case 'aviso': return 'border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20';
      case 'sucesso': return 'border-green-200 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20';
      default: return 'border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20';
    }
  };

  const getSaudeColor = (saude: number) => {
    if (saude >= 80) return 'text-green-600';
    if (saude >= 60) return 'text-yellow-600';
    if (saude >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Inteligência Principal */}
      <Card className="lg:col-span-2 rounded-2xl shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            <Lightbulb className="h-6 w-6 text-yellow-500" />
            Inteligência Financeira Avançada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dicas.map((dica, index) => {
              const IconComponent = dica.icon;
              return (
                <div key={index} className={`p-4 rounded-xl border-2 ${getColorByTipo(dica.tipo)} hover:shadow-md transition-all duration-200`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-700/70">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{dica.titulo}</h4>
                        <Badge variant={dica.impacto === 'alto' ? 'destructive' : dica.impacto === 'medio' ? 'default' : 'secondary'} className="text-xs">
                          {dica.impacto}
                        </Badge>
                      </div>
                      <p className="text-sm opacity-90">{dica.descricao}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Métricas Avançadas */}
      <Card className="rounded-2xl shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Métricas Avançadas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Saúde Financeira */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Saúde Financeira</span>
              <span className={`text-lg font-bold ${getSaudeColor(analytics.saudeFinanceira)}`}>
                {analytics.saudeFinanceira.toFixed(0)}%
              </span>
            </div>
            <Progress value={analytics.saudeFinanceira} className="h-3" />
            <p className="text-xs text-muted-foreground">
              Baseado em margem, eficiência e crescimento
            </p>
          </div>

          {/* Métricas Numéricas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <Shield className="h-4 w-4 mx-auto mb-1 text-blue-600" />
              <p className="text-xs text-muted-foreground">Margem Líquida</p>
              <p className="text-lg font-bold text-blue-600">{analytics.margemLiquida.toFixed(1)}%</p>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <Activity className="h-4 w-4 mx-auto mb-1 text-purple-600" />
              <p className="text-xs text-muted-foreground">Eficiência Op.</p>
              <p className="text-lg font-bold text-purple-600">{analytics.eficienciaOperacional.toFixed(1)}%</p>
            </div>
          </div>
          
          {/* Métricas Personalizadas */}
          {metricas && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">ROI</span>
                <span className={`font-bold ${metricas.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metricas.roi.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">ROAS</span>
                <span className="font-bold text-blue-600">{metricas.roas.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Break-Even</span>
                <span className="font-bold text-orange-600">{metricas.breakEvenPoint.toFixed(0)} dias</span>
              </div>
            </div>
          )}

          {/* Valuation */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl">
            <h4 className="font-semibold mb-2 text-sm">Valuation Estimado</h4>
            <p className="text-xl font-bold text-green-600">
              R$ {analytics.valuationEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Baseado em múltiplo de 3.5x da receita anualizada
            </p>
          </div>

          {/* Crescimento */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Crescimento (30d)</span>
              <Badge variant={analytics.crescimentoReceitas > 0 ? "default" : "destructive"}>
                {analytics.crescimentoReceitas > 0 ? '+' : ''}{analytics.crescimentoReceitas.toFixed(1)}%
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Receita Anualizada</span>
              <span className="font-medium">R$ {(analytics.receitaAnualizada / 1000).toFixed(0)}K</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Impostos Pendentes</span>
              <Badge variant={analytics.totalImpostosAberto > 0 ? "destructive" : "secondary"}>
                R$ {(analytics.totalImpostosAberto / 1000).toFixed(0)}K
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
