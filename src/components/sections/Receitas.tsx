
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const Receitas = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const stats = [
    { title: 'Receita do Mês', value: 'R$ 28.450,00' },
    { title: 'Receita por Cliente', value: 'R$ 1.890,00' },
    { title: 'Receita Recorrente', value: 'R$ 12.300,00' }
  ];

  const receitas = [
    { 
      date: '2025-01-15', 
      description: 'Venda de Produto Premium', 
      category: 'Vendas', 
      client: 'Cliente A', 
      value: 'R$ 2.500,00', 
      payment: 'Cartão de Crédito' 
    },
    { 
      date: '2025-01-14', 
      description: 'Serviço de Consultoria', 
      category: 'Serviços', 
      client: 'Empresa XYZ', 
      value: 'R$ 3.200,00', 
      payment: 'Transferência' 
    },
    { 
      date: '2025-01-13', 
      description: 'Licenciamento Software', 
      category: 'Licenças', 
      client: 'StartupABC', 
      value: 'R$ 1.800,00', 
      payment: 'PIX' 
    },
    { 
      date: '2025-01-12', 
      description: 'Venda Produto Básico', 
      category: 'Vendas', 
      client: 'Cliente B', 
      value: 'R$ 890,00', 
      payment: 'Boleto' 
    }
  ];

  const chartData = [
    { name: 'Vendas', value: 45, color: '#22C55E' },
    { name: 'Serviços', value: 35, color: '#3B82F6' },
    { name: 'Licenças', value: 20, color: '#F59E0B' }
  ];

  return (
    <section id="receitas" className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Receitas</h2>
          <p className="text-muted-foreground">Gestão completa das entradas de dinheiro</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 py-3 font-semibold">
              + Nova Receita
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Adicionar Nova Receita</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" placeholder="Ex: Venda de produto" className="rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="value">Valor</Label>
                  <Input id="value" placeholder="R$ 0,00" className="rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendas">Vendas</SelectItem>
                      <SelectItem value="servicos">Serviços</SelectItem>
                      <SelectItem value="licencas">Licenças</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="client">Cliente</Label>
                  <Input id="client" placeholder="Nome do cliente" className="rounded-xl" />
                </div>
              </div>
              <div>
                <Label htmlFor="payment">Forma de Pagamento</Label>
                <Select>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full rounded-xl" 
                onClick={() => setIsDialogOpen(false)}
              >
                Salvar Receita
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="rounded-2xl shadow-sm border-border/50">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground mb-2">{stat.title}</p>
                <p className="text-2xl font-bold text-green-600">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfico e Filtros */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hoje">Hoje</SelectItem>
                    <SelectItem value="semana">Esta Semana</SelectItem>
                    <SelectItem value="mes">Este Mês</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="clientea">Cliente A</SelectItem>
                    <SelectItem value="empresaxyz">Empresa XYZ</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="vendas">Vendas</SelectItem>
                    <SelectItem value="servicos">Serviços</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="rounded-xl">
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Receitas por Origem</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  dataKey="value"
                  label={({ value }) => `${value}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Receitas */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Histórico de Receitas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-semibold">Data</th>
                  <th className="text-left p-4 font-semibold">Descrição</th>
                  <th className="text-left p-4 font-semibold">Categoria</th>
                  <th className="text-left p-4 font-semibold">Cliente</th>
                  <th className="text-left p-4 font-semibold">Forma Pagto</th>
                  <th className="text-right p-4 font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {receitas.map((receita, index) => (
                  <tr key={index} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-4">{receita.date}</td>
                    <td className="p-4">{receita.description}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-lg text-sm">
                        {receita.category}
                      </span>
                    </td>
                    <td className="p-4">{receita.client}</td>
                    <td className="p-4">{receita.payment}</td>
                    <td className="p-4 text-right font-bold text-green-600">{receita.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default Receitas;
