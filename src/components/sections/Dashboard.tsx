
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Dados simulados
  const stats = [
    { title: 'Lucro Total', value: 'R$ 45.320,00', positive: true },
    { title: 'Receitas do Dia', value: 'R$ 2.450,00', positive: true },
    { title: 'Despesas do Dia', value: 'R$ 1.200,00', positive: false },
    { title: 'Impostos Pagos', value: 'R$ 850,00', positive: false },
    { title: 'Saldo Atual', value: 'R$ 12.870,00', positive: true }
  ];

  const chartData = [
    { month: 'Jan', saldo: 15000 },
    { month: 'Fev', saldo: 18000 },
    { month: 'Mar', saldo: 22000 },
    { month: 'Abr', saldo: 19000 },
    { month: 'Mai', saldo: 25000 },
    { month: 'Jun', saldo: 28000 }
  ];

  const categoriesData = [
    { name: 'Vendas', value: 65, color: '#22C55E' },
    { name: 'Serviços', value: 25, color: '#3B82F6' },
    { name: 'Outros', value: 10, color: '#F59E0B' }
  ];

  const recentTransactions = [
    { date: '2025-01-15', description: 'Venda de Produto A', value: 'R$ 1.200,00', type: 'receita' },
    { date: '2025-01-15', description: 'Pagamento Fornecedor', value: 'R$ -450,00', type: 'despesa' },
    { date: '2025-01-14', description: 'Serviço Consultoria', value: 'R$ 2.800,00', type: 'receita' },
    { date: '2025-01-14', description: 'Conta de Luz', value: 'R$ -320,00', type: 'despesa' },
    { date: '2025-01-13', description: 'Venda de Produto B', value: 'R$ 950,00', type: 'receita' }
  ];

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
                  <p className="text-xl font-bold text-green-600">R$ 2.450,00</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <p className="text-sm text-muted-foreground">Total Despesas</p>
                  <p className="text-xl font-bold text-red-600">R$ 1.200,00</p>
                </div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-sm text-muted-foreground">Saldo Líquido</p>
                <p className="text-2xl font-bold text-primary">R$ 1.250,00</p>
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
        {/* Gráfico de Evolução */}
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
                <Tooltip formatter={(value) => [`R$ ${value.toLocaleString()}`, 'Saldo']} />
                <Line type="monotone" dataKey="saldo" stroke="#22C55E" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Categorias */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Receitas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* Últimas Transações */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Últimas Transações</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </section>
  );
};

export default Dashboard;
