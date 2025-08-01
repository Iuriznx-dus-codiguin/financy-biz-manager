import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAppContext } from '@/contexts/AppContext';
import { InteligenciaFinanceiraAprimorada } from '@/components/InteligenciaFinanceiraAprimorada';
import { InteligenciaFinanceiraBasica } from '@/components/InteligenciaFinanceiraBasica';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { TimeFilter } from '@/components/TimeFilter';
import { TooltipInfo } from '@/components/TooltipInfo';
import { isDateInRange } from '@/utils/dateFilters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Lock, Crown } from 'lucide-react';
import { CompactDashboardSelector } from '@/components/CompactDashboardSelector';
import { useDashboard } from '@/hooks/useDashboard';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

interface DashboardProps {
  setActiveSection?: (section: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveSection }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [periodo, setPeriodo] = useState('6meses');
  const [timeFilter, setTimeFilter] = useState('hoje');
  const [isClosingCash, setIsClosingCash] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const { receitas, despesas, impostos, membrosEquipe } = useAppContext();
  const { user } = useAuth();
  const { currentDashboard } = useDashboard();

  // Verificar status da assinatura
  useEffect(() => {
    checkSubscriptionStatus();
  }, [user]);

  const checkSubscriptionStatus = async () => {
    if (!user) return;

    try {
      setLoadingSubscription(true);
      
      const { data: subscriber, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('email', user.email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar assinatura:', error);
        return;
      }

      if (subscriber) {
        setSubscriptionData({
          subscribed: subscriber.subscribed,
          subscription_tier: subscriber.subscription_tier,
          subscription_end: subscriber.subscription_end
        });
      } else {
        setSubscriptionData({
          subscribed: false,
          subscription_tier: null,
          subscription_end: null
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status da assinatura:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  // Verificar se o usuário tem acesso premium e plus
  const hasPreminumAccess = subscriptionData?.subscribed && subscriptionData?.subscription_tier === 'Premium';
  const hasPlusAccess = subscriptionData?.subscribed && subscriptionData?.subscription_tier === 'Plus';

  // Filtrar dados baseado no filtro de tempo e dashboard atual
  const filteredReceitas = receitas.filter(r => isDateInRange(r.data, timeFilter));
  const filteredDespesas = despesas.filter(d => isDateInRange(d.data, timeFilter));
  const filteredImpostos = impostos.filter(i => isDateInRange(i.vencimento, timeFilter));

  // Calcular estatísticas reais baseadas no filtro
  const totalReceitas = filteredReceitas.reduce((sum, receita) => sum + receita.valor, 0);
  const totalDespesas = filteredDespesas.reduce((sum, despesa) => sum + despesa.valor, 0);
  const totalImpostos = filteredImpostos.filter(imposto => imposto.pago).reduce((sum, imposto) => sum + imposto.valor, 0);
  
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
    
    if (timeFilter === 'hoje') {
      custoTotal = custoTotal / 30;
    } else if (timeFilter === 'esta-semana') {
      custoTotal = custoTotal / 4;
    }
    
    return custoTotal;
  };

  const custoEquipe = calcularCustosEquipe();
  const totalCustosOperacionais = totalDespesas + totalImpostos + custoEquipe;
  const lucro = totalReceitas - totalCustosOperacionais;
  const faturamentoBruto = totalReceitas;

  const calcularROI = () => {
    const lucroLiquido = totalReceitas - totalCustosOperacionais;
    const investimentoTotal = totalCustosOperacionais;
    
    if (investimentoTotal === 0) {
      return totalReceitas > 0 ? 1.0 : 0.0;
    }
    
    return lucroLiquido / investimentoTotal;
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
      value: roi.toFixed(1),
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
      default:
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
    setIsClosingCash(true);
    
    // Simular processo de fechamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsClosingCash(false);
    setIsDialogOpen(false);
  };

  return (
    <section id="painel" className="space-y-8">
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">
            Olá, {user?.user_metadata?.nome_completo || user?.email?.split('@')[0] || 'Usuário'}!
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <CompactDashboardSelector />
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
                  className={`w-full rounded-xl transition-all duration-300 ${
                    isClosingCash 
                      ? 'bg-green-600 hover:bg-green-700 animate-pulse' 
                      : 'bg-primary hover:bg-primary/90'
                  }`}
                  onClick={handleFecharCaixa}
                  disabled={isClosingCash}
                >
                  {isClosingCash ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    'Registrar Fechamento'
                  )}
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
      <SubscriptionStatus setActiveSection={setActiveSection} />

      {/* Inteligência Financeira - Baseada no plano */}
      {hasPreminumAccess ? (
        <InteligenciaFinanceiraAprimorada 
          receitas={receitas}
          despesas={despesas}
          impostos={impostos}
          membrosEquipe={membrosEquipe}
        />
      ) : hasPlusAccess ? (
        <InteligenciaFinanceiraBasica 
          receitas={receitas}
          despesas={despesas}
          impostos={impostos}
          membrosEquipe={membrosEquipe}
        />
      ) : (
        <Card className="rounded-2xl shadow-sm border-2 border-dashed border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Inteligência Financeira</h3>
                <p className="text-muted-foreground max-w-md">
                  Desbloqueie insights financeiros e análises personalizadas com nossos planos pagos.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-full">
                <Lock className="h-4 w-4" />
                <span>Recurso Premium</span>
              </div>
              <Button 
                onClick={() => setActiveSection?.('assinatura')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold transform hover:scale-105 transition-all"
              >
                <Crown className="mr-2 h-4 w-4" />
                Assinar Agora
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
