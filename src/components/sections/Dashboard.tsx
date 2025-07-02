
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar } from 'recharts';
import { useAppContext } from '@/contexts/AppContext';
import { InteligenciaFinanceira } from '@/components/InteligenciaFinanceira';
import { TooltipInfo } from '@/components/TooltipInfo';
import { TrendingUp, TrendingDown, DollarSign, Target, PieChart as PieChartIcon, Activity, Eye, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [periodo, setPeriodo] = useState('6meses');
  const { receitas, despesas, impostos, membrosEquipe } = useAppContext();

  // Calcular estatísticas reais incluindo custos da equipe
  const totalReceitas = receitas.reduce((sum, receita) => sum + receita.valor, 0);
  const totalDespesas = despesas.reduce((sum, despesa) => sum + despesa.valor, 0);
  const totalImpostos = impostos.filter(imposto => imposto.pago).reduce((sum, imposto) => sum + imposto.valor, 0);
  const totalImpostosPendentes = impostos.filter(imposto => !imposto.pago).reduce((sum, imposto) => sum + imposto.valor, 0);
  
  // Calcular custos de equipe mensais
  const calcularCustosEquipe = () => {
    let custoMensal = 0;
    let custoDiario = 0;
    
    membrosEquipe.forEach(membro => {
      if (membro.status === 'ativo') {
        switch (membro.periodicidade) {
          case 'mensal':
            custoMensal += membro.salario;
            custoDiario += membro.salario / 30;
            break;
          case 'semanal':
            custoMensal += membro.salario * 4;
            custoDiario += membro.salario / 7;
            break;
          case 'quinzenal':
            custoMensal += membro.salario * 2;
            custoDiario += membro.salario / 15;
            break;
        }
      }
    });
    
    return { custoDiario, custoMensal };
  };

  const { custoDiario: custoEquipeDiario, custoMensal: custoEquipeMensal } = calcularCustosEquipe();
  const totalCustosOperacionais = totalDespesas + totalImpostos + custoEquipeMensal;
  const saldoAtual = totalReceitas - totalCustosOperacionais;
  const faturamentoBruto = totalReceitas;

  // Calcular métricas avançadas
  const calcularROI = () => {
    const lucroLiquido = totalReceitas - totalCustosOperacionais;
    const investimentoTotal = totalCustosOperacionais;
    
    if (investimentoTotal === 0) {
      return totalReceitas > 0 ? 100.0 : 0.0;
    }
    
    return (lucroLiquido / investimentoTotal) * 100;
  };

  const roi = calcularROI();
  const margemLucro = totalReceitas > 0 ? ((totalReceitas - totalCustosOperacionais) / totalReceitas) * 100 : 0;
  const roas = totalCustosOperacionais > 0 ? totalReceitas / totalCustosOperacionais : 0;
  const breakEvenPoint = custoEquipeDiario > 0 ? (totalCustosOperacionais / custoEquipeDiario) : 0;

  // Receitas e despesas do dia (hoje)
  const hoje = new Date().toISOString().split('T')[0];
  const receitasHoje = receitas.filter(r => r.data === hoje).reduce((sum, r) => sum + r.valor, 0);
  const despesasHoje = despesas.filter(d => d.data === hoje).reduce((sum, d) => sum + d.valor, 0);

  // Métricas principais com visual aprimorado
  const mainMetrics = [
    { 
      title: 'Faturamento Bruto', 
      value: `R$ ${faturamentoBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      change: '+15%',
      positive: true,
      icon: DollarSign,
      color: 'bg-gradient-to-r from-green-500 to-emerald-600',
      textColor: 'text-white'
    },
    { 
      title: 'Lucro Líquido', 
      value: `R$ ${saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      change: saldoAtual >= 0 ? '+8%' : '-12%',
      positive: saldoAtual >= 0,
      icon: TrendingUp,
      color: saldoAtual >= 0 ? 'bg-gradient-to-r from-blue-500 to-cyan-600' : 'bg-gradient-to-r from-red-500 to-rose-600',
      textColor: 'text-white'
    },
    { 
      title: 'ROAS', 
      value: `${roas.toFixed(2)}x`, 
      change: '+5%',
      positive: roas > 1,
      icon: Target,
      color: 'bg-gradient-to-r from-purple-500 to-violet-600',
      textColor: 'text-white'
    },
    { 
      title: 'Margem de Lucro', 
      value: `${margemLucro.toFixed(1)}%`, 
      change: margemLucro >= 0 ? '+3%' : '-7%',
      positive: margemLucro >= 0,
      icon: PieChartIcon,
      color: 'bg-gradient-to-r from-orange-500 to-amber-600',
      textColor: 'text-white'
    }
  ];

  // Estatísticas secundárias
  const secondaryStats = [
    { 
      title: 'Receitas Hoje', 
      value: `R$ ${receitasHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      icon: TrendingUp,
      color: receitasHoje === 0 ? 'text-muted-foreground' : 'text-green-600'
    },
    { 
      title: 'Despesas Hoje', 
      value: `R$ ${(despesasHoje + custoEquipeDiario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      icon: TrendingDown,
      color: (despesasHoje + custoEquipeDiario) === 0 ? 'text-muted-foreground' : 'text-red-600'
    },
    { 
      title: 'Impostos Pendentes', 
      value: `R$ ${totalImpostosPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      icon: AlertCircle,
      color: totalImpostosPendentes === 0 ? 'text-muted-foreground' : 'text-orange-600'
    },
    { 
      title: 'Break-Even (dias)', 
      value: `${breakEvenPoint.toFixed(0)} dias`, 
      icon: Activity,
      color: 'text-blue-600'
    }
  ];

  // Gerar dados do gráfico baseado no período selecionado
  const gerarDadosGrafico = () => {
    const agora = new Date();
    let dados = [];

    switch (periodo) {
      case '1semana':
        for (let i = 6; i >= 0; i--) {
          const data = new Date(agora);
          data.setDate(data.getDate() - i);
          const dataStr = data.toISOString().split('T')[0];
          const faturamentoDia = receitas
            .filter(r => r.data === dataStr)
            .reduce((sum, r) => sum + r.valor, 0);
          const despesasDia = despesas
            .filter(d => d.data === dataStr)
            .reduce((sum, d) => sum + d.valor, 0);
          dados.push({
            period: data.toLocaleDateString('pt-BR', { weekday: 'short' }),
            receitas: faturamentoDia,
            despesas: despesasDia,
            lucro: faturamentoDia - despesasDia
          });
        }
        break;
      case '1mes':
        for (let i = 29; i >= 0; i--) {
          const data = new Date(agora);
          data.setDate(data.getDate() - i);
          const dataStr = data.toISOString().split('T')[0];
          const faturamentoDia = receitas
            .filter(r => r.data === dataStr)
            .reduce((sum, r) => sum + r.valor, 0);
          const despesasDia = despesas
            .filter(d => d.data === dataStr)
            .reduce((sum, d) => sum + d.valor, 0);
          dados.push({
            period: data.getDate().toString(),
            receitas: faturamentoDia,
            despesas: despesasDia,
            lucro: faturamentoDia - despesasDia
          });
        }
        break;
      default: // 6meses
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
        for (let i = 0; i < 6; i++) {
          const mes = new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1);
          const mesStr = mes.getMonth() + 1;
          const anoStr = mes.getFullYear();
          const faturamentoMes = receitas
            .filter(r => {
              const dataReceita = new Date(r.data);
              return dataReceita.getMonth() + 1 === mesStr && dataReceita.getFullYear() === anoStr;
            })
            .reduce((sum, r) => sum + r.valor, 0);
          const despesasMes = despesas
            .filter(d => {
              const dataDespesa = new Date(d.data);
              return dataDespesa.getMonth() + 1 === mesStr && dataDespesa.getFullYear() === anoStr;
            })
            .reduce((sum, d) => sum + d.valor, 0);
          dados.push({
            period: meses[i],
            receitas: faturamentoMes,
            despesas: despesasMes,
            lucro: faturamentoMes - despesasMes
          });
        }
    }

    return dados;
  };

  const chartData = gerarDadosGrafico();

  const categorias = receitas.reduce((acc, receita) => {
    acc[receita.categoria] = (acc[receita.categoria] || 0) + receita.valor;
    return acc;
  }, {} as Record<string, number>);

  const totalCategorias = Object.values(categorias).reduce((sum, val) => sum + val, 0);
  const categoriesData = Object.entries(categorias).map(([name, value], index) => ({
    name,
    value: totalCategorias > 0 ? Math.round((value / totalCategorias) * 100) : 0,
    realValue: value,
    color: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]
  }));

  const allTransactions = [
    ...receitas.map(r => ({ ...r, type: 'receita' as const })),
    ...despesas.map(d => ({ ...d, type: 'despesa' as const }))
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 5);

  const recentTransactions = allTransactions.map(transaction => ({
    date: transaction.data,
    description: transaction.descricao,
    value: transaction.type === 'receita' 
      ? `R$ ${transaction.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
      : `R$ -${transaction.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    type: transaction.type
  }));

  return (
    <section id="painel" className="space-y-8 p-6 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900 min-h-screen">
      {/* Header aprimorado */}
      <div className="flex justify-between items-center mb-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard Executivo
          </h1>
          <p className="text-lg text-muted-foreground">Visão estratégica completa dos seus resultados</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              Atualizado agora mesmo
            </span>
            <span>•</span>
            <span>{new Date().toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                Fechamento de Caixa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Fechamento de Caixa - Hoje</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <p className="text-sm text-muted-foreground">Total Receitas</p>
                    <p className="text-xl font-bold text-green-600">R$ {receitasHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <p className="text-sm text-muted-foreground">Total Despesas</p>
                    <p className="text-xl font-bold text-red-600">R$ {(despesasHoje + custoEquipeDiario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <p className="text-sm text-muted-foreground">Resultado do Dia</p>
                  <p className="text-2xl font-bold text-primary">R$ {(receitasHoje - despesasHoje - custoEquipeDiario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <Button 
                  className="w-full rounded-xl" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Registrar Fechamento
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Métricas principais com design premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {mainMetrics.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <Card key={index} className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <CardContent className={`p-0 ${metric.color}`}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <IconComponent className={`h-8 w-8 ${metric.textColor} opacity-80`} />
                    <span className={`text-sm font-medium px-2 py-1 rounded-full bg-white/20 ${metric.textColor}`}>
                      {metric.change}
                    </span>
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${metric.textColor} opacity-90`}>{metric.title}</p>
                    <p className={`text-3xl font-bold ${metric.textColor} mt-1`}>{metric.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Estatísticas secundárias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {secondaryStats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index} className="rounded-2xl shadow-sm border-border/50 hover:shadow-md transition-shadow bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700">
                    <IconComponent className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Inteligência Financeira aprimorada */}
      <InteligenciaFinanceira 
        receitas={receitas}
        despesas={despesas}
        impostos={impostos}
        membrosEquipe={membrosEquipe}
        metricas={{
          roi,
          roas,
          margemLucro,
          breakEvenPoint,
          custosOperacionais: totalCustosOperacionais
        }}
      />

      {/* Gráficos aprimorados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card className="rounded-2xl shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-bold">Performance Financeira</CardTitle>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-32 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1semana">1 Semana</SelectItem>
                  <SelectItem value="1mes">1 Mês</SelectItem>
                  <SelectItem value="6meses">6 Meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="receitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="despesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis dataKey="period" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: 'none', 
                    borderRadius: '12px', 
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' 
                  }}
                />
                <Area type="monotone" dataKey="receitas" stroke="#10B981" fillOpacity={1} fill="url(#receitas)" strokeWidth={3} />
                <Area type="monotone" dataKey="despesas" stroke="#EF4444" fillOpacity={1} fill="url(#despesas)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Distribuição de Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            {categoriesData.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoriesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoriesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, 'Participação']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {categoriesData.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: entry.color }}></div>
                        <span className="font-medium">{entry.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{entry.value}%</span>
                        <p className="text-sm text-muted-foreground">R$ {entry.realValue.toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[320px]">
                <p className="text-muted-foreground">Nenhuma receita cadastrada ainda</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transações recentes com design aprimorado */}
      <Card className="rounded-2xl shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((transaction, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      transaction.type === 'receita' 
                        ? 'bg-green-100 dark:bg-green-900/30' 
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {transaction.type === 'receita' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <p className={`font-bold text-lg ${
                    transaction.type === 'receita' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">Nenhuma transação realizada ainda</p>
              <p className="text-sm text-muted-foreground mt-2">Suas transações aparecerão aqui conforme você as registra</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default Dashboard;
