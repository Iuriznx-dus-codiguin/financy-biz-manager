
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const Relatorios = () => {
  const [selectedReport, setSelectedReport] = useState('mensal');

  const monthlyData = [
    { month: 'Jan', receitas: 25000, despesas: 18000, lucro: 7000 },
    { month: 'Fev', receitas: 28000, despesas: 19500, lucro: 8500 },
    { month: 'Mar', receitas: 32000, despesas: 22000, lucro: 10000 },
    { month: 'Abr', receitas: 29000, despesas: 20500, lucro: 8500 },
    { month: 'Mai', receitas: 35000, despesas: 24000, lucro: 11000 },
    { month: 'Jun', receitas: 38000, despesas: 25500, lucro: 12500 }
  ];

  const categoryData = [
    { categoria: 'Vendas', valor: 45000 },
    { categoria: 'Serviços', valor: 28000 },
    { categoria: 'Licenças', valor: 15000 },
    { categoria: 'Consultoria', valor: 22000 }
  ];

  const insights = [
    {
      title: 'Crescimento das Receitas',
      description: 'Suas receitas cresceram 35% comparado ao mês anterior',
      type: 'positive'
    },
    {
      title: 'Aumento em Marketing',
      description: 'Você gastou 27% a mais com marketing em maio',
      type: 'warning'
    },
    {
      title: 'Melhor Categoria',
      description: 'Vendas representam 58% da sua receita total',
      type: 'info'
    }
  ];

  const rankings = {
    maioresGastos: [
      { item: 'Salários', valor: 'R$ 8.500,00' },
      { item: 'Aluguel', valor: 'R$ 3.200,00' },
      { item: 'Fornecedores', valor: 'R$ 2.800,00' },
      { item: 'Marketing', valor: 'R$ 1.950,00' },
      { item: 'Utilidades', valor: 'R$ 1.450,00' }
    ],
    maioresReceitas: [
      { item: 'Cliente Premium A', valor: 'R$ 12.500,00' },
      { item: 'Empresa XYZ', valor: 'R$ 8.900,00' },
      { item: 'Startup ABC', valor: 'R$ 6.200,00' },
      { item: 'Cliente Corporativo', valor: 'R$ 4.800,00' },
      { item: 'Freelancer Pro', valor: 'R$ 3.500,00' }
    ]
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'warning': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'info': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  return (
    <section id="relatorios" className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Relatórios</h2>
          <p className="text-muted-foreground">Análises e insights gerenciais do seu negócio</p>
        </div>
        <div className="flex space-x-4">
          <Button variant="outline" className="rounded-xl">
            📄 Exportar PDF
          </Button>
          <Button variant="outline" className="rounded-xl">
            📊 Exportar Excel
          </Button>
          <Button variant="outline" className="rounded-xl">
            📈 Google Sheets
          </Button>
        </div>
      </div>

      {/* Seletor de Relatório */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Tipo de Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione o relatório" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">Relatório Mensal</SelectItem>
                <SelectItem value="categoria">Por Categoria</SelectItem>
                <SelectItem value="cliente">Por Cliente</SelectItem>
                <SelectItem value="comparativo">Comparativo</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ultimo-mes">Último Mês</SelectItem>
                <SelectItem value="ultimos-3-meses">Últimos 3 Meses</SelectItem>
                <SelectItem value="ultimos-6-meses">Últimos 6 Meses</SelectItem>
                <SelectItem value="ano-atual">Ano Atual</SelectItem>
              </SelectContent>
            </Select>
            <Button className="rounded-xl">
              Gerar Relatório
            </Button>
            <Button variant="outline" className="rounded-xl">
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Insights Principais */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>💡 Insights Principais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-xl border ${getInsightColor(insight.type)}`}
              >
                <h4 className="font-semibold mb-2">{insight.title}</h4>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Evolução Mensal - Receitas vs Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value.toLocaleString()}`} />
                <Line type="monotone" dataKey="receitas" stroke="#22C55E" strokeWidth={3} name="Receitas" />
                <Line type="monotone" dataKey="despesas" stroke="#EF4444" strokeWidth={3} name="Despesas" />
                <Line type="monotone" dataKey="lucro" stroke="#3B82F6" strokeWidth={3} name="Lucro" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Receitas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="categoria" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value.toLocaleString()}`} />
                <Bar dataKey="valor" fill="#22C55E" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Rankings e Listas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>🔻 Maiores Gastos do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rankings.maioresGastos.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="font-medium">{item.item}</span>
                  </div>
                  <span className="font-bold text-red-600">{item.valor}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>🔸 Maiores Fontes de Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rankings.maioresReceitas.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="font-medium">{item.item}</span>
                  </div>
                  <span className="font-bold text-green-600">{item.valor}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Executivo */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>📋 Resumo Executivo - Junho 2025</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-sm text-muted-foreground">Receita Total</p>
              <p className="text-2xl font-bold text-blue-600">R$ 38.000,00</p>
              <p className="text-xs text-green-600 mt-1">↑ +8.7% vs mês anterior</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-sm text-muted-foreground">Despesas Total</p>
              <p className="text-2xl font-bold text-red-600">R$ 25.500,00</p>
              <p className="text-xs text-red-600 mt-1">↑ +6.2% vs mês anterior</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <p className="text-sm text-muted-foreground">Lucro Líquido</p>
              <p className="text-2xl font-bold text-green-600">R$ 12.500,00</p>
              <p className="text-xs text-green-600 mt-1">↑ +13.6% vs mês anterior</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <p className="text-sm text-muted-foreground">Margem de Lucro</p>
              <p className="text-2xl font-bold text-purple-600">32.9%</p>
              <p className="text-xs text-green-600 mt-1">↑ +1.8% vs mês anterior</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default Relatorios;
