import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface RecurringTransactionSelectorProps {
  onSelectType: (type: 'receita' | 'despesa') => void;
}

export const RecurringTransactionSelector: React.FC<RecurringTransactionSelectorProps> = ({ 
  onSelectType 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectType = (type: 'receita' | 'despesa') => {
    setIsOpen(false);
    onSelectType(type);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Registrar Primeira Transação Recorrente
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Escolha o Tipo de Transação
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground text-center mb-6">
            Selecione o tipo de transação que deseja configurar como recorrente:
          </p>
          
          <div className="grid grid-cols-1 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:border-green-200 dark:hover:border-green-800"
              onClick={() => handleSelectType('receita')}
            >
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-green-700 dark:text-green-400 mb-1">
                  Receita Recorrente
                </h3>
                <p className="text-sm text-muted-foreground">
                  Configure uma receita que se repete automaticamente
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:border-red-200 dark:hover:border-red-800"
              onClick={() => handleSelectType('despesa')}
            >
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-3">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-red-700 dark:text-red-400 mb-1">
                  Despesa Recorrente
                </h3>
                <p className="text-sm text-muted-foreground">
                  Configure uma despesa que se repete automaticamente
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};