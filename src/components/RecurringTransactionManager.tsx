import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Calendar, Plus, Edit, Trash2, Play, Pause, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { LoadingSpinner, LoadingCard } from '@/components/LoadingStates';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RecurringTransactionManagerProps {
  className?: string;
}

export const RecurringTransactionManager: React.FC<RecurringTransactionManagerProps> = ({ className }) => {
  const {
    transactions,
    loading,
    setupRecurringTransaction,
    disableRecurring,
    getTransactionsDueToday,
    getTransactionsDueSoon,
    processRecurringTransactions
  } = useRecurringTransactions();

  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [recurringConfig, setRecurringConfig] = useState({
    enabled: true,
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    interval: 1,
    end_date: '',
    max_occurrences: undefined as number | undefined
  });

  const dueToday = getTransactionsDueToday();
  const dueSoon = getTransactionsDueSoon(7);

  const handleProcessRecurring = async () => {
    try {
      await processRecurringTransactions();
      toast({
        title: 'Sucesso',
        description: 'Transações recorrentes processadas com sucesso!'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao processar transações recorrentes.',
        variant: 'destructive'
      });
    }
  };

  const handleToggleRecurring = async (transactionId: string, type: 'receita' | 'despesa', enabled: boolean) => {
    try {
      if (enabled) {
        const nextDate = new Date();
        nextDate.setMonth(nextDate.getMonth() + recurringConfig.interval);
        
        await setupRecurringTransaction(type, transactionId, {
          ...recurringConfig,
          next_date: nextDate.toISOString()
        });
      } else {
        await disableRecurring(type, transactionId);
      }
    } catch (error) {
      console.error('Erro ao configurar recorrência:', error);
    }
  };

  const getFrequencyText = (frequency: string, interval: number) => {
    const freqMap = {
      daily: interval === 1 ? 'Diariamente' : `A cada ${interval} dias`,
      weekly: interval === 1 ? 'Semanalmente' : `A cada ${interval} semanas`,
      monthly: interval === 1 ? 'Mensalmente' : `A cada ${interval} meses`,
      yearly: interval === 1 ? 'Anualmente' : `A cada ${interval} anos`
    };
    return freqMap[frequency as keyof typeof freqMap] || 'Personalizado';
  };

  const getNextExecutionDate = (nextDate: string) => {
    const date = new Date(nextDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Vencido';
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays <= 7) return `Em ${diffDays} dias`;
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <LoadingCard />
        <LoadingCard />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transações Recorrentes</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencendo Hoje</p>
                <p className="text-2xl font-bold">{dueToday.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Próximos 7 dias</p>
                <p className="text-2xl font-bold">{dueSoon.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Gerenciar Transações Recorrentes
            </CardTitle>
            <Button onClick={handleProcessRecurring} size="sm">
              <Play className="h-4 w-4 mr-2" />
              Processar Agora
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Nenhuma Transação Recorrente</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure transações automáticas para receitas e despesas que se repetem regularmente.
              </p>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Configurar Primeira Recorrência
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        transaction.type === 'receita' 
                          ? "bg-green-100 dark:bg-green-900/20" 
                          : "bg-red-100 dark:bg-red-900/20"
                      )}>
                        {transaction.type === 'receita' ? (
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{transaction.description}</h4>
                          <Badge variant="outline" className="text-xs">
                            {transaction.type}
                          </Badge>
                          <Badge variant={transaction.config.enabled ? "default" : "secondary"}>
                            {transaction.config.enabled ? 'Ativo' : 'Pausado'}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {transaction.category} • R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{getFrequencyText(transaction.config.frequency, transaction.config.interval)}</span>
                          <span>Próxima: {getNextExecutionDate(transaction.config.next_date)}</span>
                          <span>Criadas: {transaction.created_count}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={transaction.config.enabled}
                        onCheckedChange={(enabled) => 
                          handleToggleRecurring(transaction.id, transaction.type, enabled)
                        }
                      />
                      
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => disableRecurring(transaction.type, transaction.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Transactions */}
      {dueSoon.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximas Execuções
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dueSoon.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={transaction.type === 'receita' ? 'default' : 'destructive'}>
                      {transaction.type === 'receita' ? '+' : '-'} R$ {transaction.amount.toFixed(2)}
                    </Badge>
                    <span className="text-sm">{transaction.description}</span>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {getNextExecutionDate(transaction.config.next_date)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getFrequencyText(transaction.config.frequency, transaction.config.interval)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};