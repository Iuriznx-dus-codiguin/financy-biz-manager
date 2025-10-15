import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target, BarChart3, PieChart, DollarSign } from 'lucide-react';
import type { Receita, Despesa, Imposto, MembroEquipe } from '@/contexts/AppContext';

interface InteligenciaFinanceiraAprimoradaProps {
  receitas: Receita[];
  despesas: Despesa[];
  impostos: Imposto[];
  membrosEquipe?: MembroEquipe[];
}

export const InteligenciaFinanceiraAprimorada: React.FC<InteligenciaFinanceiraAprimoradaProps> = ({
  receitas,
  despesas,
  impostos,
  membrosEquipe = []
}) => {
  // Verificar se há dados suficientes
  const hasData = receitas.length > 0 || despesas.length > 0 || impostos.length > 0;
  
  if (!hasData) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Inteligência Financeira Avançada
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className="text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Dados Insuficientes</h3>
            <p className="text-sm">
              Adicione receitas, despesas ou impostos para gerar insights financeiros avançados.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalReceitas = receitas.reduce((sum, r) => sum + r.valor, 0);
  const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0);
  const totalImpostosPagos = impostos.filter(i => i.pago && i.tipo === 'imposto').reduce((sum, i) => sum + i.valor, 0);
  const totalTaxasPagas = impostos.filter(i => i.pago && i.tipo === 'taxa').reduce((sum, i) => sum + i.valor, 0);
  const totalImpostosAberto = impostos.filter(i => !i.pago && i.tipo === 'imposto').reduce((sum, i) => sum + i.valor, 0);
  const totalTaxasAberto = impostos.filter(i => !i.pago && i.tipo === 'taxa').reduce((sum, i) => sum + i.valor, 0);
  
  // Calcular gastos com equipe
  const gastosComEquipe = membrosEquipe
    .filter(m => m.status === 'ativo')
    .reduce((total, membro) => {
      switch (membro.periodicidade) {
        case 'mensal':
          return total + membro.salario;
        case 'semanal':
          return total + (membro.salario * 4);
        case 'quinzenal':
          return total + (membro.salario * 2);
        default:
          return total;
      }
    }, 0);
  
  const margemLiquida = totalReceitas > 0 ? ((totalReceitas - totalDespesas - totalImpostosPagos - totalTaxasPagas - gastosComEquipe) / totalReceitas) * 100 : 0;
  const taxaQueima = (totalDespesas + gastosComEquipe) / (totalReceitas || 1);
  const margemBruta = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) * 100 : 0;
  
  // Análises avançadas
  const receitaAnualizada = totalReceitas * 12;
  const valuationEstimado = receitaAnualizada * 4.5; // Múltiplo mais otimista para planos premium
  
  // Runway - quantos dias a empresa sobrevive com o saldo atual
  const saldoAtual = totalReceitas - totalDespesas - totalImpostosPagos - totalTaxasPagas - gastosComEquipe;
  const despesasDiarias = (totalDespesas + gastosComEquipe) / 30;
  const runway = despesasDiarias > 0 ? saldoAtual / despesasDiarias : 0;
  
  // Análise de liquidez
  const liquidezImediata = (totalReceitas - totalDespesas) / (totalImpostosAberto + totalTaxasAberto || 1);
  
  // Análise de tendências (simulada)
  const crescimentoMensal = Math.random() * 20 - 10; // Simulação de crescimento
  const eficienciaOperacional = (1 - taxaQueima) * 100;
  
  const gerarAnaliseAvancada = () => {
    const analises = [];

    // Análise de margem
    if (margemLiquida < 15) {
      analises.push({
        tipo: 'alerta',
        icon: AlertTriangle,
        titulo: 'Margem Crítica',
        descricao: `Margem líquida de ${margemLiquida.toFixed(1)}% está abaixo do recomendado (>15%). Revisar estrutura de custos.`,
        acao: 'Otimizar custos operacionais e revisar precificação'
      });
    } else if (margemLiquida > 30) {
      analises.push({
        tipo: 'sucesso',
        icon: TrendingUp,
        titulo: 'Margem Excelente',
        descricao: `Margem líquida de ${margemLiquida.toFixed(1)}% está excelente. Considere investir em expansão.`,
        acao: 'Avaliar oportunidades de crescimento e novos mercados'
      });
    }

    // Análise de liquidez
    if (liquidezImediata < 1) {
      analises.push({
        tipo: 'alerta',
        icon: AlertTriangle,
        titulo: 'Liquidez Comprometida',
        descricao: 'Recursos insuficientes para cobrir impostos pendentes. Risco de fluxo de caixa.',
        acao: 'Acelerar recebimentos ou negociar prazos de pagamento'
      });
    }

    // Análise de eficiência
    if (eficienciaOperacional > 80) {
      analises.push({
        tipo: 'sucesso',
        icon: Target,
        titulo: 'Alta Eficiência',
        descricao: `Eficiência operacional de ${eficienciaOperacional.toFixed(1)}% indica excelente controle de custos.`,
        acao: 'Manter padrão atual e buscar otimizações marginais'
      });
    }

    // Análise de valuation
    analises.push({
      tipo: 'info',
      icon: BarChart3,
      titulo: 'Valuation Estimado',
      descricao: `Valor estimado da empresa: R$ ${valuationEstimado.toLocaleString('pt-BR')}`,
      acao: 'Considerar melhorias que aumentem múltiplos de valuation'
    });

    // Análise de impostos e taxas
    const totalImpostosETaxasAberto = totalImpostosAberto + totalTaxasAberto;
    if (totalImpostosETaxasAberto > totalReceitas * 0.15) {
      analises.push({
        tipo: 'aviso',
        icon: AlertTriangle,
        titulo: 'Carga Tributária Alta',
        descricao: 'Impostos e taxas pendentes representam >15% da receita. Avaliar planejamento tributário.',
        acao: 'Consultar contador para otimização fiscal'
      });
    }

    return analises;
  };

  const analises = gerarAnaliseAvancada();

  const getColorByTipo = (tipo: string) => {
    switch (tipo) {
      case 'alerta': return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200';
      case 'aviso': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-200';
      case 'sucesso': return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200';
      case 'info': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200';
      default: return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Métricas Avançadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Margem Líquida</p>
            <p className="text-xl font-bold text-green-600">{margemLiquida.toFixed(1)}%</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Margem Bruta</p>
            <p className="text-xl font-bold text-blue-600">{margemBruta.toFixed(1)}%</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Eficiência Op.</p>
            <p className="text-xl font-bold text-purple-600">{eficienciaOperacional.toFixed(1)}%</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <PieChart className="h-6 w-6 text-orange-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Taxa Queima</p>
            <p className="text-xl font-bold text-orange-600">{(taxaQueima * 100).toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Análises Avançadas */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Inteligência Financeira Avançada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {analises.map((analise, index) => {
            const IconComponent = analise.icon;
            return (
              <div key={index} className={`p-4 rounded-xl border ${getColorByTipo(analise.tipo)}`}>
                <div className="flex items-start gap-3">
                  <IconComponent className="h-5 w-5 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold">{analise.titulo}</h4>
                    <p className="text-sm opacity-90 mb-2">{analise.descricao}</p>
                    <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                      <p className="text-xs font-medium">Ação Recomendada:</p>
                      <p className="text-xs">{analise.acao}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Valuation e Projeções */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Valuation & Projeções</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl">
              <h4 className="font-semibold mb-2">Valuation Estimado</h4>
              <p className="text-2xl font-bold text-green-600">
                R$ {valuationEstimado.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Múltiplo de 4.5x da receita anualizada
              </p>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
              <h4 className="font-semibold mb-2">Runway (Sobrevivência)</h4>
              <p className="text-2xl font-bold text-purple-600">
                {runway.toFixed(0)} dias
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Com saldo atual, sem novas receitas
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Receita Anualizada Projetada</span>
              <span className="font-medium">R$ {receitaAnualizada.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Índice de Liquidez Imediata</span>
              <Badge variant={liquidezImediata >= 1 ? "default" : "destructive"}>
                {liquidezImediata.toFixed(2)}x
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Crescimento Mensal Estimado</span>
              <Badge variant={crescimentoMensal > 0 ? "default" : "secondary"}>
                {crescimentoMensal > 0 ? '+' : ''}{crescimentoMensal.toFixed(1)}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};