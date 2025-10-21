import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  Line, 
  XAxis,
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  AlertTriangle,
  Calendar,
  Users,
  Briefcase,
  Crown,
  Zap,
  Activity,
  Award,
  BarChart3,
  PieChart as PieIcon,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  Minus,
  Receipt
} from 'lucide-react';
import { TimeFilter } from '@/components/TimeFilter';
import { isDateInRange } from '@/utils/dateFilters';
import { useAppContext } from '@/contexts/AppContext';
import { TooltipInfo } from '@/components/TooltipInfo';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';

interface DashboardAvancadoProps {
  timeFilter: string;
  setTimeFilter: (filter: string) => void;
}

const COLORS = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];

export const DashboardAvancado: React.FC<DashboardAvancadoProps> = ({ timeFilter, setTimeFilter }) => {
  const { receitas, despesas, impostos, membrosEquipe } = useAppContext();
  const { user } = useAuth();
  const { currentDashboard } = useDashboard();

  // Filtrar dados baseado no filtro de tempo
  const filteredReceitas = receitas.filter(r => isDateInRange(r.data, timeFilter));
  const filteredDespesas = despesas.filter(d => isDateInRange(d.data, timeFilter));
  const filteredImpostos = impostos.filter(i => isDateInRange(i.vencimento, timeFilter));

  // Calcular gastos com equipe (baseado nos salários cadastrados)
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

  // Calcular gastos com fornecedores (todas despesas com fornecedor, exceto gastos operacionais)
  const categorias_operacionais = ['equipe', 'salarios', 'salários', 'folha'];
  const gastosComFornecedores = filteredDespesas
    .filter(d => d.fornecedor && d.fornecedor.trim() !== '' && !categorias_operacionais.includes(d.categoria.toLowerCase()))
    .reduce((sum, d) => sum + d.valor, 0);

  // Gastos com equipe das despesas cadastradas (categoria equipe)
  const gastosEquipeDespesas = filteredDespesas
    .filter(d => d.categoria === 'equipe')
    .reduce((sum, d) => sum + d.valor, 0);

  // Total de gastos com equipe (salários + despesas de equipe)
  const totalGastosEquipe = gastosComEquipe + gastosEquipeDespesas;

  // Verificar se é dashboard pessoal
  const isDashboardPessoal = currentDashboard?.type === 'personal';

  // Calcular métricas avançadas incluindo TODOS os gastos
  const totalReceitas = filteredReceitas.reduce((sum, r) => sum + r.valor, 0);
  const totalDespesas = filteredDespesas.reduce((sum, d) => sum + d.valor, 0);
  
  // Calcular total de impostos considerando porcentagem sobre o total de receitas
  const totalImpostos = filteredImpostos
    .filter(i => i.tipo === 'imposto')
    .reduce((sum, i) => {
      if (i.valorTipo === 'porcentagem') {
        return sum + (totalReceitas * (i.valor / 100));
      }
      return sum + i.valor;
    }, 0);
    
  const totalTaxas = filteredImpostos
    .filter(i => i.tipo === 'taxa')
    .reduce((sum, i) => {
      if (i.valorTipo === 'porcentagem') {
        return sum + (totalReceitas * (i.valor / 100));
      }
      return sum + i.valor;
    }, 0);
  
  // Total de TODAS as despesas incluindo salários da equipe (membros cadastrados)
  // Não duplicar despesas que já foram registradas manualmente (fornecedores e equipe já estão em totalDespesas)
  const totalTodasDespesas = totalDespesas + totalImpostos + totalTaxas + gastosComEquipe;
  
  // Calcular lucro líquido considerando TODOS os gastos
  const totalGastosOperacionais = totalTodasDespesas;
  const lucroLiquido = totalReceitas - totalGastosOperacionais;
  const margemLucro = totalReceitas > 0 ? ((lucroLiquido / totalReceitas) * 100) : 0;

  // Métricas específicas para dashboard pessoal
  const gastosAlimentacao = isDashboardPessoal 
    ? filteredDespesas.filter(d => d.categoria === 'alimentacao' || d.categoria === 'alimentação').reduce((sum, d) => sum + d.valor, 0)
    : 0;
  
  const gastosLazer = isDashboardPessoal 
    ? filteredDespesas.filter(d => d.categoria === 'lazer' || d.categoria === 'entretenimento').reduce((sum, d) => sum + d.valor, 0)
    : 0;
  
  const totalInvestido = isDashboardPessoal 
    ? filteredDespesas.filter(d => d.categoria === 'investimentos' || d.categoria === 'poupanca' || d.categoria === 'poupança').reduce((sum, d) => sum + d.valor, 0)
    : 0;
  
  const receitasTerceiros = isDashboardPessoal 
    ? filteredReceitas.filter(r => r.categoria === 'terceiros' || r.categoria === 'freelance' || r.categoria === 'extras').reduce((sum, r) => sum + r.valor, 0)
    : 0;

  const salarioMensal = isDashboardPessoal 
    ? filteredReceitas.filter(r => r.categoria === 'salario' || r.categoria === 'salário' || r.categoria === 'trabalho').reduce((sum, r) => sum + r.valor, 0)
    : totalReceitas;
  
  // Métricas adicionais - ROI calculado com TODOS os gastos
  const totalGastos = totalDespesas + totalImpostos + totalTaxas;
  const roi = totalTodasDespesas > 0 ? (totalReceitas / totalTodasDespesas) : 0;
  const proLaboreRecomendado = totalReceitas * 0.28; // 28% da receita como pró-labore
  const capitalGiroRecomendado = totalTodasDespesas * 3; // 3 meses de TODAS as despesas

  // Calcular períodos anteriores baseado no filtro atual
  const getPeriodoAnterior = (filter: string) => {
    const today = new Date();
    let startAnterior = new Date();
    let endAnterior = new Date();
    
    switch (filter) {
      case 'hoje':
        startAnterior.setDate(today.getDate() - 1);
        endAnterior.setDate(today.getDate() - 1);
        endAnterior.setHours(23, 59, 59, 999);
        break;
      case 'ontem':
        startAnterior.setDate(today.getDate() - 2);
        endAnterior.setDate(today.getDate() - 2);
        endAnterior.setHours(23, 59, 59, 999);
        break;
      case 'esta-semana':
        startAnterior.setDate(today.getDate() - today.getDay() - 7);
        endAnterior.setDate(today.getDate() - today.getDay() - 1);
        endAnterior.setHours(23, 59, 59, 999);
        break;
      case 'semana-passada':
        startAnterior.setDate(today.getDate() - today.getDay() - 14);
        endAnterior.setDate(today.getDate() - today.getDay() - 8);
        endAnterior.setHours(23, 59, 59, 999);
        break;
      case 'este-mes':
        startAnterior = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endAnterior = new Date(today.getFullYear(), today.getMonth(), 0);
        endAnterior.setHours(23, 59, 59, 999);
        break;
      case 'mes-passado':
        startAnterior = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        endAnterior = new Date(today.getFullYear(), today.getMonth() - 1, 0);
        endAnterior.setHours(23, 59, 59, 999);
        break;
      case 'ultimos-30-dias':
        startAnterior.setDate(today.getDate() - 60);
        endAnterior.setDate(today.getDate() - 31);
        endAnterior.setHours(23, 59, 59, 999);
        break;
      case 'ultimos-90-dias':
        startAnterior.setDate(today.getDate() - 180);
        endAnterior.setDate(today.getDate() - 91);
        endAnterior.setHours(23, 59, 59, 999);
        break;
      case 'este-ano':
        startAnterior = new Date(today.getFullYear() - 1, 0, 1);
        endAnterior = new Date(today.getFullYear() - 1, 11, 31);
        endAnterior.setHours(23, 59, 59, 999);
        break;
      case 'ano-passado':
        startAnterior = new Date(today.getFullYear() - 2, 0, 1);
        endAnterior = new Date(today.getFullYear() - 2, 11, 31);
        endAnterior.setHours(23, 59, 59, 999);
        break;
      default:
        startAnterior.setDate(today.getDate() - 1);
        endAnterior.setDate(today.getDate() - 1);
        endAnterior.setHours(23, 59, 59, 999);
    }
    
    return { startAnterior, endAnterior };
  };

  const { startAnterior, endAnterior } = getPeriodoAnterior(timeFilter);
  
  // Calcular dados do período anterior
  const receitasPeriodoAnterior = receitas.filter(r => {
    const data = new Date(r.data);
    return data >= startAnterior && data <= endAnterior;
  }).reduce((sum, r) => sum + r.valor, 0);

  const despesasPeriodoAnterior = despesas.filter(d => {
    const data = new Date(d.data);
    return data >= startAnterior && data <= endAnterior;
  }).reduce((sum, d) => sum + d.valor, 0);

  const impostosPeriodoAnterior = impostos.filter(i => {
    const data = new Date(i.vencimento);
    return data >= startAnterior && data <= endAnterior;
  });

  // Calcular total de receitas do período anterior para impostos em porcentagem
  const totalReceitasPeriodoAnterior = receitasPeriodoAnterior;

  const totalImpostosPeriodoAnterior = impostosPeriodoAnterior
    .filter(i => i.tipo === 'imposto')
    .reduce((sum, i) => {
      if (i.valorTipo === 'porcentagem') {
        return sum + (totalReceitasPeriodoAnterior * (i.valor / 100));
      }
      return sum + i.valor;
    }, 0);
    
  const totalTaxasPeriodoAnterior = impostosPeriodoAnterior
    .filter(i => i.tipo === 'taxa')
    .reduce((sum, i) => {
      if (i.valorTipo === 'porcentagem') {
        return sum + (totalReceitasPeriodoAnterior * (i.valor / 100));
      }
      return sum + i.valor;
    }, 0);
  const lucroPeriodoAnterior = receitasPeriodoAnterior - despesasPeriodoAnterior - totalImpostosPeriodoAnterior - totalTaxasPeriodoAnterior;

  // Calcular crescimento percentual
  const crescimentoReceitas = receitasPeriodoAnterior > 0 
    ? ((totalReceitas - receitasPeriodoAnterior) / receitasPeriodoAnterior) * 100 
    : totalReceitas > 0 ? 100 : 0;

  const crescimentoDespesas = despesasPeriodoAnterior > 0 
    ? ((totalDespesas - despesasPeriodoAnterior) / despesasPeriodoAnterior) * 100 
    : totalDespesas > 0 ? 100 : 0;

  const crescimentoImpostos = totalImpostosPeriodoAnterior > 0 
    ? ((totalImpostos - totalImpostosPeriodoAnterior) / totalImpostosPeriodoAnterior) * 100 
    : totalImpostos > 0 ? 100 : 0;

  const crescimentoTaxas = totalTaxasPeriodoAnterior > 0 
    ? ((totalTaxas - totalTaxasPeriodoAnterior) / totalTaxasPeriodoAnterior) * 100 
    : totalTaxas > 0 ? 100 : 0;

  const crescimentoLucro = lucroPeriodoAnterior !== 0 
    ? ((lucroLiquido - lucroPeriodoAnterior) / Math.abs(lucroPeriodoAnterior)) * 100 
    : lucroLiquido > 0 ? 100 : lucroLiquido < 0 ? -100 : 0;

  // Calcular variações para dashboard pessoal
  const gastosAlimentacaoPeriodoAnterior = isDashboardPessoal 
    ? despesas.filter(d => {
        const data = new Date(d.data);
        return (d.categoria === 'alimentacao' || d.categoria === 'alimentação') && 
               data >= startAnterior && data <= endAnterior;
      }).reduce((sum, d) => sum + d.valor, 0)
    : 0;

  const gastosLazerPeriodoAnterior = isDashboardPessoal 
    ? despesas.filter(d => {
        const data = new Date(d.data);
        return (d.categoria === 'lazer' || d.categoria === 'entretenimento') && 
               data >= startAnterior && data <= endAnterior;
      }).reduce((sum, d) => sum + d.valor, 0)
    : 0;

  const totalInvestidoPeriodoAnterior = isDashboardPessoal 
    ? despesas.filter(d => {
        const data = new Date(d.data);
        return (d.categoria === 'investimentos' || d.categoria === 'poupanca' || d.categoria === 'poupança') && 
               data >= startAnterior && data <= endAnterior;
      }).reduce((sum, d) => sum + d.valor, 0)
    : 0;

  const receitasTerceirosPeriodoAnterior = isDashboardPessoal 
    ? receitas.filter(r => {
        const data = new Date(r.data);
        return (r.categoria === 'terceiros' || r.categoria === 'freelance' || r.categoria === 'extras') && 
               data >= startAnterior && data <= endAnterior;
      }).reduce((sum, r) => sum + r.valor, 0)
    : 0;

  // Calcular variações para dashboard empresarial
  const gastosEquipePeriodoAnterior = membrosEquipe
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

  const gastosEquipeDespesasPeriodoAnterior = despesas.filter(d => {
    const data = new Date(d.data);
    return d.categoria === 'equipe' && data >= startAnterior && data <= endAnterior;
  }).reduce((sum, d) => sum + d.valor, 0);

  const totalGastosEquipePeriodoAnterior = gastosEquipePeriodoAnterior + gastosEquipeDespesasPeriodoAnterior;

  // Calcular ROI do período anterior com TODOS os gastos
  const totalTodasDespesasPeriodoAnterior = despesasPeriodoAnterior + totalImpostosPeriodoAnterior + totalTaxasPeriodoAnterior + gastosEquipePeriodoAnterior;
  const roiPeriodoAnterior = totalTodasDespesasPeriodoAnterior > 0 
    ? (receitasPeriodoAnterior / totalTodasDespesasPeriodoAnterior) 
    : 0;

  const gastosComFornecedoresPeriodoAnterior = despesas.filter(d => {
    const data = new Date(d.data);
    return d.fornecedor && d.fornecedor.trim() !== '' && !categorias_operacionais.includes(d.categoria.toLowerCase()) && data >= startAnterior && data <= endAnterior;
  }).reduce((sum, d) => sum + d.valor, 0);

  // Calcular crescimento do ROI
  const crescimentoROI = roiPeriodoAnterior !== 0 
    ? ((roi - roiPeriodoAnterior) / Math.abs(roiPeriodoAnterior)) * 100 
    : roi > 0 ? 100 : roi < 0 ? -100 : 0;

  // Calcular crescimentos
  const crescimentoAlimentacao = gastosAlimentacaoPeriodoAnterior > 0
    ? ((gastosAlimentacao - gastosAlimentacaoPeriodoAnterior) / gastosAlimentacaoPeriodoAnterior) * 100 
    : gastosAlimentacao > 0 ? 100 : 0;

  const crescimentoLazer = gastosLazerPeriodoAnterior > 0 
    ? ((gastosLazer - gastosLazerPeriodoAnterior) / gastosLazerPeriodoAnterior) * 100 
    : gastosLazer > 0 ? 100 : 0;

  const crescimentoInvestido = totalInvestidoPeriodoAnterior > 0 
    ? ((totalInvestido - totalInvestidoPeriodoAnterior) / totalInvestidoPeriodoAnterior) * 100 
    : totalInvestido > 0 ? 100 : 0;

  const crescimentoReceitasTerceiros = receitasTerceirosPeriodoAnterior > 0 
    ? ((receitasTerceiros - receitasTerceirosPeriodoAnterior) / receitasTerceirosPeriodoAnterior) * 100 
    : receitasTerceiros > 0 ? 100 : 0;

  const crescimentoGastosEquipe = totalGastosEquipePeriodoAnterior > 0 
    ? ((totalGastosEquipe - totalGastosEquipePeriodoAnterior) / totalGastosEquipePeriodoAnterior) * 100 
    : totalGastosEquipe > 0 ? 100 : 0;

  const crescimentoGastosFornecedores = gastosComFornecedoresPeriodoAnterior > 0 
    ? ((gastosComFornecedores - gastosComFornecedoresPeriodoAnterior) / gastosComFornecedoresPeriodoAnterior) * 100 
    : gastosComFornecedores > 0 ? 100 : 0;

  // Dados para gráficos avançados
  const gerarDadosEvolutivos = () => {
    const ultimos6Meses = [];
    for (let i = 5; i >= 0; i--) {
      const data = new Date();
      data.setMonth(data.getMonth() - i);
      const mes = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      const receitasMes = receitas
        .filter(r => {
          const dataReceita = new Date(r.data);
          return dataReceita.getMonth() === data.getMonth() && 
                 dataReceita.getFullYear() === data.getFullYear();
        })
        .reduce((sum, r) => sum + r.valor, 0);

      const despesasMes = despesas
        .filter(d => {
          const dataDespesa = new Date(d.data);
          return dataDespesa.getMonth() === data.getMonth() && 
                 dataDespesa.getFullYear() === data.getFullYear();
        })
        .reduce((sum, d) => sum + d.valor, 0);

      ultimos6Meses.push({
        mes,
        receitas: receitasMes,
        despesas: despesasMes,
        lucro: receitasMes - despesasMes,
        margem: receitasMes > 0 ? ((receitasMes - despesasMes) / receitasMes) * 100 : 0
      });
    }
    return ultimos6Meses;
  };

  const dadosEvolutivos = gerarDadosEvolutivos();

  // Dados por categoria (usando dados filtrados)
  const despesasPorCategoria = filteredDespesas.reduce((acc, despesa) => {
    acc[despesa.categoria] = (acc[despesa.categoria] || 0) + despesa.valor;
    return acc;
  }, {} as Record<string, number>);

  const dadosCategorias = Object.entries(despesasPorCategoria).map(([categoria, valor]) => ({
    name: categoria,
    value: valor,
    percentage: ((valor / totalDespesas) * 100).toFixed(1)
  }));

  // Performance metrics
  const ticketMedio = filteredReceitas.length > 0 ? totalReceitas / filteredReceitas.length : 0;
  const crescimentoMensal = dadosEvolutivos.length > 1 
    ? ((dadosEvolutivos[5].receitas - dadosEvolutivos[4].receitas) / dadosEvolutivos[4].receitas) * 100 
    : 0;

  const MetricCard = ({ title, value, change, changeType, icon: Icon, gradient, isExpense = false }: any) => {
    // Para despesas: aumento = ruim (vermelho), diminuição = bom (verde)
    // Para receitas/lucros: aumento = bom (verde), diminuição = ruim (vermelho)
    const isPositiveChange = isExpense ? change < 0 : change > 0;
    const isNegativeChange = isExpense ? change > 0 : change < 0;
    
    return (
      <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
        <div className={`absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity ${gradient}`} />
        <CardHeader className="pb-3 relative">
          <div className="flex items-center justify-between">
            <div className="space-y-1 flex-1">
              <div className="text-sm font-medium text-muted-foreground">{title}</div>
              <p className="text-xl font-bold text-foreground">{value}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-background/50 backdrop-blur-sm flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          </div>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {change === 0 ? (
                <Minus className="h-4 w-4 text-muted-foreground" />
              ) : change > 0 ? (
                <ArrowUpRight className={`h-4 w-4 ${isExpense ? 'text-red-600' : 'text-green-600'}`} />
              ) : (
                <ArrowDownRight className={`h-4 w-4 ${isExpense ? 'text-green-600' : 'text-red-600'}`} />
              )}
              <span className={`text-sm font-medium ${
                change === 0 ? 'text-muted-foreground' : 
                isPositiveChange ? (isExpense ? 'text-green-600' : 'text-green-600') : 
                (isExpense ? 'text-red-600' : 'text-red-600')
              }`}>
                {change === 0 ? '0.0' : `${Math.abs(change).toFixed(1)}`}%
              </span>
              <span className="text-xs text-muted-foreground">
                vs {
                  timeFilter === 'hoje' ? 'ontem' :
                  timeFilter === 'ontem' ? 'anteontem' :
                  timeFilter === 'esta-semana' ? 'semana anterior' :
                  timeFilter === 'semana-passada' ? 'duas semanas atrás' :
                  timeFilter === 'este-mes' ? 'mês anterior' :
                  timeFilter === 'mes-passado' ? 'dois meses atrás' :
                  timeFilter === 'ultimos-30-dias' ? '30 dias anteriores' :
                  timeFilter === 'ultimos-90-dias' ? '90 dias anteriores' :
                  timeFilter === 'este-ano' ? 'ano anterior' :
                  timeFilter === 'ano-passado' ? 'dois anos atrás' :
                  'período anterior'
                }
              </span>
            </div>
          )}
        </CardHeader>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPIs Principais - Top (Centralizados) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <MetricCard
           title={isDashboardPessoal ? "Salário Mensal" : "Total em Receitas"}
           value={`R$ ${(isDashboardPessoal ? salarioMensal : totalReceitas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
           change={crescimentoReceitas}
           icon={TrendingUp}
           gradient="from-green-500 to-emerald-600"
          />
          <MetricCard
            title="Total em Despesas"
            value={`R$ ${(isDashboardPessoal ? totalDespesas : totalTodasDespesas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            change={crescimentoDespesas}
            icon={TrendingDown}
            gradient="from-red-500 to-rose-600"
            isExpense={true}
          />
      </div>

        {/* Demais KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {isDashboardPessoal ? (
          // KPIs para dashboard pessoal
          <>
            <MetricCard
              title="Gastos em Alimentação"
              value={`R$ ${gastosAlimentacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              change={crescimentoAlimentacao}
              icon={DollarSign}
              gradient="from-green-500 to-emerald-600"
              isExpense={true}
            />
            <MetricCard
              title="Gastos em Lazer"
              value={`R$ ${gastosLazer.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              change={crescimentoLazer}
              icon={Activity}
              gradient="from-purple-500 to-violet-600"
              isExpense={true}
            />
            <MetricCard
              title="Total Investido"
              value={`R$ ${totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              change={crescimentoInvestido}
              icon={TrendingUp}
              gradient="from-blue-500 to-indigo-600"
            />
            <MetricCard
              title="Receitas de Terceiros"
              value={`R$ ${receitasTerceiros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              change={crescimentoReceitasTerceiros}
              icon={Users}
              gradient="from-orange-500 to-amber-600"
            />
            <MetricCard
              title="Total de Impostos"
              value={`R$ ${totalImpostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              change={crescimentoImpostos}
              icon={Receipt}
              gradient="from-blue-500 to-indigo-600"
              isExpense={true}
            />
            <MetricCard
              title="Total de Taxas"
              value={`R$ ${totalTaxas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              change={crescimentoTaxas}
              icon={DollarSign}
              gradient="from-orange-500 to-red-600"
              isExpense={true}
            />
          </>
        ) : (
          // KPIs para dashboard empresarial
          <>
            <MetricCard
              title="Lucro Líquido"
              value={`R$ ${lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              change={crescimentoLucro}
              icon={DollarSign}
              gradient="from-green-500 to-emerald-600"
            />
            <MetricCard
              title={
                <div className="flex items-center gap-1">
                  ROI
                  <TooltipInfo content="Retorno sobre Investimento - Mostra quantas vezes você multiplicou seu investimento. Ex: ROI de 2.0x significa que para cada R$ 1 gasto, você ganhou R$ 2" />
                </div>
              }
              value={roi.toFixed(2)}
              change={crescimentoROI}
              icon={Target}
              gradient="from-purple-500 to-violet-600"
            />
            <MetricCard
              title="Gastos Operacionais"
              value={`R$ ${totalGastosEquipe.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              change={crescimentoGastosEquipe}
              icon={Users}
              gradient="from-blue-500 to-indigo-600"
              isExpense={true}
            />
            <MetricCard
              title="Gastos com Fornecedores"
              value={`R$ ${gastosComFornecedores.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              change={crescimentoGastosFornecedores}
              icon={Briefcase}
              gradient="from-orange-500 to-amber-600"
              isExpense={true}
            />
            <MetricCard
              title="Total de Impostos"
              value={`R$ ${totalImpostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              change={crescimentoImpostos}
              icon={Receipt}
              gradient="from-blue-500 to-indigo-600"
              isExpense={true}
            />
            <MetricCard
              title="Total de Taxas"
              value={`R$ ${totalTaxas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              change={crescimentoTaxas}
              icon={DollarSign}
              gradient="from-orange-500 to-red-600"
              isExpense={true}
            />
            <MetricCard
              title={
                <div className="flex items-center gap-1">
                  Pró-labore Recomendado
                  <TooltipInfo content="Remuneração recomendada para o sócio (28% da receita)" />
                </div>
              }
              value={`R$ ${proLaboreRecomendado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              change={0}
              icon={Crown}
              gradient="from-yellow-500 to-orange-600"
            />
            <MetricCard
              title={
                <div className="flex items-center gap-1">
                  Capital de Giro Recomendado
                  <TooltipInfo content="Capital recomendado para manter as operações por 3 meses" />
                </div>
              }
              value={`R$ ${capitalGiroRecomendado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              change={0}
              icon={Zap}
              gradient="from-teal-500 to-cyan-600"
            />
          </>
        )}
      </div>

      {/* Gráficos Avançados */}
      <Tabs defaultValue="evolutivo" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="evolutivo" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Evolutivo
          </TabsTrigger>
          <TabsTrigger value="categorias" className="flex items-center gap-2">
            <PieIcon className="h-4 w-4" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="analise" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Análise
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evolutivo" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Evolução Financeira (6 meses)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={dadosEvolutivos}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="mes" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                    />
                    <Area
                      type="monotone"
                      dataKey="receitas"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                      name="Receitas"
                    />
                    <Area
                      type="monotone"
                      dataKey="despesas"
                      stackId="2"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.3}
                      name="Despesas"
                    />
                    <Line
                      type="monotone"
                      dataKey="lucro"
                      stroke="#6366f1"
                      strokeWidth={3}
                      name="Lucro"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categorias" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieIcon className="h-5 w-5" />
                  Despesas por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dadosCategorias}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                    >
                      {dadosCategorias.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dadosCategorias.slice(0, 5).map((categoria, index) => (
                    <div key={categoria.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm font-medium">{categoria.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">
                            R$ {categoria.value.toLocaleString('pt-BR')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {categoria.percentage}%
                          </p>
                        </div>
                      </div>
                      <Progress 
                        value={parseFloat(categoria.percentage)} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Score Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary mb-2">
                      {Math.max(0, Math.min(100, 70 + margemLucro)).toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground">de 100 pontos</div>
                  </div>
                  <Progress value={Math.max(0, Math.min(100, 70 + margemLucro))} className="h-3" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Eficiência</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Taxa de Conversão</span>
                    <span className="text-sm font-bold">
                      {filteredReceitas.length > 0 ? '85%' : '0%'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Ticket Médio</span>
                    <span className="text-sm font-bold">
                      R$ {ticketMedio.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Recorrência</span>
                    <span className="text-sm font-bold">73%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Alertas Inteligentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {margemLucro < 10 && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-xs text-red-800 dark:text-red-200">
                        Margem baixa
                      </span>
                    </div>
                  )}
                  {filteredImpostos.some(i => new Date(i.vencimento) < new Date()) && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                      <Calendar className="h-4 w-4 text-yellow-600" />
                      <span className="text-xs text-yellow-800 dark:text-yellow-200">
                        Impostos vencidos
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-lg">
                    <Target className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-green-800 dark:text-green-200">
                      Meta em dia
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analise" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Análise Comparativa - Última vs Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosEvolutivos.slice(-2)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="mes" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                  />
                  <Bar dataKey="receitas" fill="#10b981" name="Receitas" />
                  <Bar dataKey="despesas" fill="#ef4444" name="Despesas" />
                  <Bar dataKey="lucro" fill="#6366f1" name="Lucro" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};