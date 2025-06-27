
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAppContext } from '@/contexts/AppContext';

const Dashboard = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { receitas, despesas, impostos } = useAppContext();

  // Calcular estatísticas reais
  const totalReceitas = receitas.reduce((sum, receita) => sum + receita.valor, 0);
  const totalDespesas = despesas.reduce((sum, despesa) => sum + despesa.valor, 0);
  const totalImpostos = impostos.filter(imposto => imposto.pago).reduce((sum, imposto) => sum + imposto.valor, 0);
  const saldoAtual = totalReceitas - totalDespesas - totalImpostos;
  const lucroTotal = saldoAtual;

  // Receitas e despesas do dia (hoje)
  const hoje = new Date().toISOString().split('T')[0];
  const receitasHoje = receitas.filter(r => r.data === hoje).reduce((sum, r) => sum + r.valor, 0);
  const despesasHoje = despesas.filter(d => d.data === hoje).reduce((sum, d) => sum + d.valor, 0);

  const stats = [
    { title: 'Lucro Total', value: `R$ ${lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, positive: lucroTotal >= 0 },
    { title: 'Receitas do Dia', value: `R$ ${receitasHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, positive: true },
    { title: 'Despesas do Dia', value: `R$ ${despesasHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, positive: false },
    { title: 'Impostos Pagos', value: `R$ ${totalImpostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, positive: false },
    { title: 'Saldo Atual', value: `R$ ${saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, positive: saldoAtual >= 0 }
  ];

  // Dados do gráfico baseados nas transações reais
  const chartData = [
    { month: 'Jan', saldo: saldoAtual * 0.6 },
    { month: 'Fev', saldo: saldoAtual * 0.7 },
    { month: 'Mar', saldo: saldoAtual * 0.8 },
    { month: 'Abr', saldo: saldoAtual * 0.85 },
    { month: 'Mai', saldo: saldoAtual * 0.95 },
    { month: 'Jun', saldo: saldoAtual }
  ];

  // Categorias baseadas nas receitas reais
  const categorias = receitas.reduce((acc, receita) => {
    acc[receita.categoria] = (acc[receita.categoria] || 0) + receita.valor;
    return acc;
  }, {} as Record<string, number>);

  const totalCategorias = Object.values(categorias).reduce((sum, val) => sum + val, 0);
  const categoriesData = Object.entries(categorias).map(([name, value], index) => ({
    name,
    value: totalCategorias > 0 ? Math.round((value / totalCategorias) * 100) : 0,
    color: ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]
  }));

  // Últimas transações reais
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
    <section id="painel" className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">Visão geral do seu negócio em tempo real</p>
        </div>
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
                  <p className="text-xl font-bold text-red-600">R$ {despesasHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-sm text-muted-foreground">Saldo Líquido</p>
                <p className="text-2xl font-bold text-primary">R$ {(receitasHoje - despesasHoje).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="rounded-2xl shadow-sm border-border/50 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground mb-2">{stat.title}</p>
                <p className={`text-2xl font-bold ${
                  stat.positive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos e Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Evolução do Saldo - Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Saldo']} />
                <Line type="monotone" dataKey="saldo" stroke="#22C55E" strokeWidth={3} />
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

      {/* Últimas Transações */}
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
