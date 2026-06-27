import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar, TrendingUp, TrendingDown, RefreshCw, Loader2 } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { toast } from 'sonner';

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
  const { receitas, despesas, carregarDados, loading } = useAppContext();
  const { user } = useAuth();
  const { runNow } = useRecurringTransactions();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const recurringTransactions = useMemo<RecurringTransaction[]>(() => {
    const r = receitas
      .filter(r => r.recorrente && r.proxima_data)
      .map(r => ({
        id: r.id,
        descricao: r.descricao,
        valor: r.valor,
        tipo: 'receita' as const,
        categoria: r.categoria,
        tipo_recorrencia: r.tipo_recorrencia || 'mensal',
        proxima_data: r.proxima_data!,
      }));
    const d = despesas
      .filter(d => d.recorrente && d.proxima_data)
      .map(d => ({
        id: d.id,
        descricao: d.descricao,
        valor: d.valor,
        tipo: 'despesa' as const,
        categoria: d.categoria,
        tipo_recorrencia: d.tipo_recorrencia || 'mensal',
        proxima_data: d.proxima_data!,
      }));
    return [...r, ...d].sort(
      (a, b) => new Date(a.proxima_data).getTime() - new Date(b.proxima_data).getTime()
    );
  }, [receitas, despesas]);

  const getRecurrenceLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      diaria: 'Diária',
      semanal: 'Semanal',
      mensal: 'Mensal',
      anual: 'Anual',
    };
    return labels[tipo] || tipo;
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const handleRunNow = async () => {
    if (!user?.id) {
      toast.error('Sessão não encontrada');
      return;
    }
    setProcessing(true);
    try {
      const result = await runNow(user.id);
      await carregarDados();
      const total = result?.total ?? 0;
      if (total > 0) {
        toast.success(`${total} transação(ões) processada(s)`, {
          description: `Receitas: ${result?.receitas_processadas ?? 0} · Despesas: ${result?.despesas_processadas ?? 0}`,
        });
      } else {
        toast.info('Nenhuma transação pendente para processar');
      }
    } catch (e) {
      toast.error('Falha ao processar transações recorrentes');
    } finally {
      setProcessing(false);
      setConfirmOpen(false);
    }
  };

  const RunButton = (
    <Button
      variant="outline"
      size="sm"
      className="rounded-xl gap-2"
      onClick={() => setConfirmOpen(true)}
      disabled={processing || loading}
    >
      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      <span className="hidden sm:inline">{processing ? 'Processando...' : 'Processar agora'}</span>
    </Button>
  );

  const Confirm = (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Processar recorrentes agora?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação cria imediatamente as transações vencidas com base nas configurações
            recorrentes. As datas seguintes serão recalculadas automaticamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleRunNow} disabled={processing}>
            {processing ? 'Processando...' : 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (recurringTransactions.length === 0) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Transações Recorrentes
            </span>
            {RunButton}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Nenhuma transação recorrente configurada</p>
            <p className="text-sm mt-2">
              Configure receitas ou despesas como recorrentes para vê-las aqui
            </p>
          </div>
        </CardContent>
        {Confirm}
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Transações Recorrentes
            <Badge variant="secondary" className="ml-2">
              {recurringTransactions.length}{' '}
              {recurringTransactions.length === 1 ? 'transação' : 'transações'}
            </Badge>
          </span>
          {RunButton}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          As transações serão processadas automaticamente na próxima data agendada
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 overflow-x-auto">
          {recurringTransactions.map((transaction) => (
            <div
              key={`${transaction.tipo}-${transaction.id}`}
              className="flex items-center justify-between gap-3 p-4 rounded-xl border-2 hover:shadow-md transition-all min-w-0"
            >
              <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    transaction.tipo === 'receita' ? 'bg-success/10' : 'bg-destructive/10'
                  }`}
                >
                  {transaction.tipo === 'receita' ? (
                    <TrendingUp className="h-5 w-5 text-success" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm sm:text-base truncate">
                      {transaction.descricao}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {transaction.categoria}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
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

              <div className="text-right shrink-0">
                <p
                  className={`text-base sm:text-xl font-bold whitespace-nowrap ${
                    transaction.tipo === 'receita' ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {transaction.tipo === 'receita' ? '+' : '-'} R${' '}
                  {transaction.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/30 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">Como funciona?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                As transações recorrentes são processadas automaticamente na data agendada.
                Use <strong>Processar agora</strong> para criar imediatamente as transações
                que já venceram.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      {Confirm}
    </Card>
  );
};
