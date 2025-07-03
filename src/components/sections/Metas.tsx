
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Plus, TrendingUp, DollarSign, Calendar, Award } from 'lucide-react';

const Metas = () => {
  const metas = [
    {
      id: 1,
      titulo: 'Receita Mensal',
      valorMeta: 50000,
      valorAtual: 32500,
      progresso: 65,
      prazo: '2025-01-31',
      categoria: 'Receita',
      status: 'em_andamento',
      cor: 'bg-green-500'
    },
    {
      id: 2,
      titulo: 'Redução de Gastos',
      valorMeta: 15000,
      valorAtual: 8200,
      progresso: 45,
      prazo: '2025-02-28',
      categoria: 'Economia',
      status: 'em_andamento',
      cor: 'bg-blue-500'
    },
    {
      id: 3,
      titulo: 'Reserva de Emergência',
      valorMeta: 100000,
      valorAtual: 75000,
      progresso: 75,
      prazo: '2025-06-30',
      categoria: 'Poupança',
      status: 'em_andamento',
      cor: 'bg-purple-500'
    },
    {
      id: 4,
      titulo: 'Investimento Anual',
      valorMeta: 80000,
      valorAtual: 80000,
      progresso: 100,
      prazo: '2024-12-31',
      categoria: 'Investimento',
      status: 'concluida',
      cor: 'bg-yellow-500'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluida':
        return <Badge className="bg-green-100 text-green-800">Concluída</Badge>;
      case 'em_andamento':
        return <Badge className="bg-blue-100 text-blue-800">Em Andamento</Badge>;
      case 'atrasada':
        return <Badge className="bg-red-100 text-red-800">Atrasada</Badge>;
      default:
        return <Badge>Indefinido</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Target className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Metas Financeiras</h2>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Metas</p>
                <p className="text-2xl font-bold">{metas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold">
                  {metas.filter(m => m.status === 'concluida').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
                <p className="text-2xl font-bold">
                  {metas.filter(m => m.status === 'em_andamento').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Progresso Médio</p>
                <p className="text-2xl font-bold">
                  {Math.round(metas.reduce((acc, meta) => acc + meta.progresso, 0) / metas.length)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Metas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {metas.map((meta) => (
          <Card key={meta.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{meta.titulo}</CardTitle>
                {getStatusBadge(meta.status)}
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Prazo: {formatDate(meta.prazo)}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso</span>
                  <span className="font-medium">{meta.progresso}%</span>
                </div>
                <Progress value={meta.progresso} className="h-2" />
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Atual</p>
                  <p className="font-semibold text-lg">
                    {formatCurrency(meta.valorAtual)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Meta</p>
                  <p className="font-semibold text-lg">
                    {formatCurrency(meta.valorMeta)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <Badge variant="outline" className={`${meta.cor} text-white`}>
                  {meta.categoria}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  Faltam: {formatCurrency(meta.valorMeta - meta.valorAtual)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Metas;
