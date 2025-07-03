import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAppContext } from '@/contexts/AppContext';
import { InteligenciaFinanceiraAprimorada } from '@/components/InteligenciaFinanceiraAprimorada';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { TimeFilter } from '@/components/TimeFilter';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { TooltipInfo } from '@/components/TooltipInfo';
import { isDateInRange } from '@/utils/dateFilters';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [periodo, setPeriodo] = useState('6meses');
  const [timeFilter, setTimeFilter] = useState('hoje');
  const { receitas, despesas, impostos, membrosEquipe } = useAppContext();
  const { toast } = useToast();

  // Filtrar dados baseado no filtro de tempo
  const filteredReceitas = receitas.filter(r => isDateInRange(r.data, timeFilter));
  const filteredDespesas = despesas.filter(d => isDateInRange(d.data, timeFilter));
  const filteredImpostos = impostos.filter(i => isDateInRange(i.vencimento, timeFilter));

  // Calcular estatísticas reais baseadas no filtro
  const totalReceitas = filteredReceitas.reduce((sum, receita) => sum + receita.valor, 0);
  const totalDespesas = filteredDespesas.reduce((sum, despesa) => sum + despesa.valor, 0);
  const totalImpostos = filteredImpostos.filter(imposto => imposto.pago).reduce((sum, imposto) => sum + imposto.valor, 0);
  
  // Calcular custos de equipe para o período
  const calcularCustosEquipe = () => {
    let custoTotal = 0;
    
    membrosEquipe.forEach(membro => {
      if (membro.status === 'ativo') {
        let custoMembro = 0;
        switch (membro.periodicidade) {
          case 'mensal':
            custoMembro = membro.salario;
            break;
          case 'semanal':
            custoMembro = membro.salario * 4;
            break;
          case 'quinzenal':
            custoMembro = membro.salario * 2;
            break;
        }
        custoTotal += custoMembro;
      }
    });
    
    // Ajustar custo baseado no período de tempo
    if (timeFilter === 'hoje') {
      custoTotal = custoTotal / 30; // Custo diário
    } else if (timeFilter === 'esta-semana') {
      custoTotal = custoTotal / 4; // Custo semanal
    }
    
    return custoTotal;
  };

  const custoEquipe = calcularCustosEquipe();
  const totalCustosOperacionais = totalDespesas + totalImpostos + custoEquipe;
  const lucro = totalReceitas - totalCustosOperacionais;
  const faturamentoBruto = totalReceitas;

  // Calcular ROI
  const calcularROI = () => {
    const lucroLiquido = totalReceitas - totalCustosOperacionais;
    const investimentoTotal = totalCustosOperacionais;
    
    if (investimentoTotal === 0) {
      return totalReceitas > 0 ? 100.0 : 0.0;
    }
    
    return (lucroLiquido / investimentoTotal) * 100;
  };

  const roi = calcularROI();

  // Dados para hoje (sempre mostrar dados do dia atual)
  const hoje = new Date().toISOString().split('T')[0];
  const receitasHoje = receitas.filter(r => r.data === hoje).reduce((sum, r) => sum + r.valor, 0);
  const despesasHoje = despesas.filter(d => d.data === hoje).reduce((sum, d) => sum + d.valor, 0);
  const custoEquipeDiario = membrosEquipe
    .filter(m => m.status === 'ativo')
    .reduce((sum, m) => {
      switch (m.periodicidade) {
        case 'mensal': return sum + (m.salario / 30);
        case 'semanal': return sum + (m.salario / 7);
        case 'quinzenal': return sum + (m.salario / 15);
        default: return sum;
      }
    }, 0);

  const getTimeFilterLabel = (filter: string) => {
    const labels: Record<string, string> = {
      'hoje': 'de Hoje',
      'ontem': 'de Ontem',
      'esta-semana': 'desta Semana',
      'semana-passada': 'da Semana Passada',
      'este-mes': 'deste Mês',
      'mes-passado': 'do Mês Passado',
      'ultimos-30-dias': 'dos Últimos 30 Dias',
      'ultimos-90-dias': 'dos Últimos 90 Dias',
      'este-ano': 'deste Ano',
      'ano-passado': 'do Ano Passado'
    };
    return labels[filter] || '';
  };

  const stats = [
    { 
      title: 'Faturamento Bruto', 
      value: `R$ ${faturamentoBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      positive: true,
      color: faturamentoBruto === 0 ? 'text-muted-foreground' : 'text-green-600'
    },
    { 
      title: `Receitas ${getTimeFilterLabel(timeFilter)}`, 
      value: `R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      positive: true,
      color: totalReceitas === 0 ? 'text-muted-foreground' : 'text-green-600'
    },
    { 
      title: `Despesas ${getTimeFilterLabel(timeFilter)}`, 
      value: `R$ ${totalCustosOperacionais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      positive: false,
      color: totalCustosOperacionais === 0 ? 'text-muted-foreground' : 'text-red-600'
    },
    { 
      title: 'Impostos Pagos', 
      value: `R$ ${totalImpostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      positive: false,
      color: totalImpostos === 0 ? 'text-muted-foreground' : 'text-red-600'
    },
    { 
      title: 'Lucro', 
      value: `R$ ${lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      positive: lucro >= 0,
      color: lucro === 0 ? 'text-muted-foreground' : (lucro >= 0 ? 'text-green-600' : 'text-red-600')
    },
    {
      title: 'ROI',
      value: `${roi.toFixed(1)}%`,
      positive: roi >= 0,
      color: roi === 0 ? 'text-muted-foreground' : (roi >= 0 ? 'text-green-600' : 'text-red-600'),
      tooltip: 'Retorno sobre Investimento - mostra o lucro obtido em relação ao investimento feito'
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
          dados.push({
            period: data.toLocaleDateString('pt-BR', { weekday: 'short' }),
            faturamento: faturamentoDia
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
          dados.push({
            period: data.getDate().toString(),
            faturamento: faturamentoDia
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
          dados.push({
            period: meses[i],
            faturamento: faturamentoMes
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

  const handleFecharCaixa = async () => {
    setIsLoading(true);
    
    // Simular salvamento no banco de dados
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Sucesso!",
        description: "Fechamento de caixa registrado com sucesso!",
        duration: 3000,
      });
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao registrar fechamento de caixa",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="painel" className="space-y-8">
      <LoadingAnimation 
        isLoading={isLoading}
        message="Salvando fechamento de caixa..."
        successMessage="Fechamento salvo com sucesso!"
        onComplete={() => {
          // Não mostrar toast adicional aqui, já está sendo mostrado no handleFecharCaixa
        }}
      />
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
        </div>
        <div className="flex items-center gap-3">
          <TimeFilter value={timeFilter} onChange={setTimeFilter} />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 py-3 font-semibold shadow-lg">
                Fechar Caixa Diário
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
                  <p className="text-sm text-muted-foreground">Saldo Líquido</p>
                  <p className="text-2xl font-bold text-primary">R$ {(receitasHoje - despesasHoje - custoEquipeDiario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <Button 
                  className="w-full rounded-xl" 
                  onClick={handleFecharCaixa}
                  disabled={isLoading}
                >
                  {isLoading ? 'Salvando...' : 'Registrar Fechamento'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="rounded-2xl shadow-sm border-border/50 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  {stat.tooltip && <TooltipInfo content={stat.tooltip} />}
                </div>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status da Assinatura */}
      <SubscriptionStatus />

      {/* Inteligência Financeira Aprimorada */}
      <InteligenciaFinanceiraAprimorada 
        receitas={receitas}
        despesas={despesas}
        impostos={impostos}
        membrosEquipe={membrosEquipe}
      />

      {/* Gráficos e Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Evolução do Faturamento</CardTitle>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-32">
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
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Faturamento']} />
                <Line type="monotone" dataKey="faturamento" stroke="#10B981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Receitas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoriesData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {categoriesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">Nenhuma receita cadastrada ainda</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Últimas Transações</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {recentTransactions.map((transaction, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground">{transaction.date}</p>
                  </div>
                  <p className={`font-bold ${
                    transaction.type === 'receita' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma transação realizada ainda</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default Dashboard;
