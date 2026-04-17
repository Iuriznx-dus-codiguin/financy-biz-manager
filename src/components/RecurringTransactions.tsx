import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

interface RecurringTransaction {
  id: number;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  categoria: string;
  tipo_recorrencia: string;
  proxima_data: string;
}

export const RecurringTransactions: React.FC = () => {
  const { receitas, despesas } = useAppContext();

  const recurringTransactions = useMemo(() => {
    const receitasRecorrentes: RecurringTransaction[] = receitas
      .filter(r => r.recorrente && r.proxima_data)
      .map(r => ({
        id: r.id,
        descricao: r.descricao,
        valor: r.valor,
        tipo: 'receita' as const,
        categoria: r.categoria,
        tipo_recorrencia: r.tipo_recorrencia || 'mensal',
        proxima_data: r.proxima_data!
      }));

    const despesasRecorrentes: RecurringTransaction[] = despesas
      .filter(d => d.recorrente && d.proxima_data)
      .map(d => ({
        id: d.id,
        descricao: d.descricao,
        valor: d.valor,
        tipo: 'despesa' as const,
        categoria: d.categoria,
        tipo_recorrencia: d.tipo_recorrencia || 'mensal',
        proxima_data: d.proxima_data!
      }));

    return [...receitasRecorrentes, ...despesasRecorrentes].sort((a, b) => 
      new Date(a.proxima_data).getTime() - new Date(b.proxima_data).getTime()
    );
  }, [receitas, despesas]);

  const getRecurrenceLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'diaria': 'Diária',
      'semanal': 'Semanal',
      'mensal': 'Mensal',
      'anual': 'Anual'
    };
    return labels[tipo] || tipo;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (recurringTransactions.length === 0) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Transações Recorrentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Nenhuma transação recorrente configurada</p>
            <p className="text-sm mt-2">Configure receitas ou despesas como recorrentes para vê-las aqui</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Transações Recorrentes
          </span>
          <Badge variant="secondary" className="ml-2">
            {recurringTransactions.length} {recurringTransactions.length === 1 ? 'transação' : 'transações'}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          As transações serão processadas automaticamente na próxima data agendada
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recurringTransactions.map((transaction) => (
            <div
              key={`${transaction.tipo}-${transaction.id}`}
              className="flex items-center justify-between p-4 rounded-xl border-2 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4 flex-1">
                <div className={`p-2 rounded-lg ${
                  transaction.tipo === 'receita' 
                    ? 'bg-success/10' 
                    : 'bg-destructive/10'
                }`}>
                  {transaction.tipo === 'receita' ? (
                    <TrendingUp className="h-5 w-5 text-success" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base truncate">
                      {transaction.descricao}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {transaction.categoria}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(transaction.proxima_data)}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {getRecurrenceLabel(transaction.tipo_recorrencia)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`text-xl font-bold ${
                    transaction.tipo === 'receita' 
                      ? 'text-success' 
                      : 'text-destructive'
                  }`}>
                    {transaction.tipo === 'receita' ? '+' : '-'} R$ {transaction.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/30 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">Como funciona?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                As transações recorrentes são processadas automaticamente na data agendada. 
                Você pode usar o botão de atualizar no topo da página para processar manualmente as transações que já venceram.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
