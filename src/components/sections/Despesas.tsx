
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const Despesas = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const stats = [
    { title: 'Total Despesas do Mês', value: 'R$ 18.750,00' },
    { title: 'Despesa Fixa Mensal', value: 'R$ 12.400,00' },
    { title: 'Média Gastos por Dia', value: 'R$ 625,00' }
  ];

  const despesas = [
    { 
      date: '2025-01-15', 
      description: 'Pagamento Fornecedor A', 
      category: 'Fornecedores', 
      value: 'R$ 2.500,00', 
      status: 'Pago' 
    },
    { 
      date: '2025-01-18', 
      description: 'Conta de Energia Elétrica', 
      category: 'Utilidades', 
      value: 'R$ 450,00', 
      status: 'Em aberto' 
    },
    { 
      date: '2025-01-12', 
      description: 'Aluguel do Escritório', 
      category: 'Infraestrutura', 
      value: 'R$ 3.200,00', 
      status: 'Pago' 
    },
    { 
      date: '2025-01-20', 
      description: 'Material de Escritório', 
      category: 'Suprimentos', 
      value: 'R$ 180,00', 
      status: 'Em aberto' 
    },
    { 
      date: '2025-01-08', 
      description: 'Salários Funcionários', 
      category: 'Pessoal', 
      value: 'R$ 8.500,00', 
      status: 'Pago' 
    }
  ];

  const getStatusColor = (status: string) => {
    return status === 'Pago' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 
           'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
  };

  return (
    <section id="despesas" className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Despesas</h2>
          <p className="text-muted-foreground">Registro de todos os gastos empresariais</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 py-3 font-semibold">
              + Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Adicionar Nova Despesa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" placeholder="Ex: Pagamento fornecedor" className="rounded-xl" />
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
                      <SelectItem value="fornecedores">Fornecedores</SelectItem>
                      <SelectItem value="utilidades">Utilidades</SelectItem>
                      <SelectItem value="pessoal">Pessoal</SelectItem>
                      <SelectItem value="infraestrutura">Infraestrutura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="aberto">Em aberto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="date">Data de Vencimento</Label>
                <Input id="date" type="date" className="rounded-xl" />
              </div>
              <Button 
                className="w-full rounded-xl" 
                onClick={() => setIsDialogOpen(false)}
              >
                Salvar Despesa
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
                <p className="text-2xl font-bold text-red-600">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alertas */}
      <Card className="rounded-2xl shadow-sm border-orange-200 dark:border-orange-800">
        <CardHeader>
          <CardTitle className="text-orange-600">⚠️ Alertas Importantes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
              <p className="font-medium">Conta de Energia vencendo em 3 dias</p>
              <p className="text-sm text-muted-foreground">Valor: R$ 450,00 - Vencimento: 18/01/2025</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="font-medium">Material de Escritório vencido há 2 dias</p>
              <p className="text-sm text-muted-foreground">Valor: R$ 180,00 - Venceu: 20/01/2025</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="fornecedores">Fornecedores</SelectItem>
                <SelectItem value="utilidades">Utilidades</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="aberto">Em aberto</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Método Pagto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="rounded-xl">
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Despesas */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Histórico de Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-semibold">Data</th>
                  <th className="text-left p-4 font-semibold">Descrição</th>
                  <th className="text-left p-4 font-semibold">Categoria</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-right p-4 font-semibold">Valor</th>
                  <th className="text-center p-4 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {despesas.map((despesa, index) => (
                  <tr key={index} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-4">{despesa.date}</td>
                    <td className="p-4">{despesa.description}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg text-sm">
                        {despesa.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge className={getStatusColor(despesa.status)}>
                        {despesa.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right font-bold text-red-600">{despesa.value}</td>
                    <td className="p-4 text-center">
                      <Button variant="outline" size="sm" className="rounded-lg">
                        Editar
                      </Button>
                    </td>
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

export default Despesas;
