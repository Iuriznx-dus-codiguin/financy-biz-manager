import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { CashClosingToast } from '@/components/CashClosingToast';

const Fechamento = () => {
  const { receitas, despesas, impostos, membrosEquipe } = useAppContext();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showToast, setShowToast] = useState(false);

  // Calcular valores reais baseados na data selecionada
  const calcularValoresDia = (data: string) => {
    const receitasDia = receitas
      .filter(r => r.data === data)
      .reduce((sum, r) => sum + r.valor, 0);
    
    const despesasDia = despesas
      .filter(d => d.data === data)
      .reduce((sum, d) => sum + d.valor, 0);
    
    const impostosVencendoDia = impostos
      .filter(i => i.vencimento === data && !i.pago)
      .reduce((sum, i) => sum + i.valor, 0);
    
    // Calcular custos proporcionais da equipe para o dia
    let custosEquipeDia = 0;
    membrosEquipe.forEach(membro => {
      if (membro.status === 'ativo') {
        switch (membro.periodicidade) {
          case 'mensal':
            custosEquipeDia += membro.salario / 30;
            break;
          case 'semanal':
            custosEquipeDia += membro.salario / 7;
            break;
          case 'quinzenal':
            custosEquipeDia += membro.salario / 15;
            break;
        }
      }
    });

    return { receitasDia, despesasDia, impostosVencendoDia, custosEquipeDia };
  };

  const { receitasDia, despesasDia, impostosVencendoDia, custosEquipeDia } = calcularValoresDia(selectedDate);
  const saldoLiquido = receitasDia - despesasDia - impostosVencendoDia - custosEquipeDia;

  const handleFechamento = async () => {
    // Simular o processo de fechamento (aqui você faria a chamada real para a API)
    try {
      // Simular delay de processamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Só mostrar o toast após o fechamento ser concluído com sucesso
      setShowToast(true);
    } catch (error) {
      console.error('Erro ao processar fechamento:', error);
      // Aqui você poderia mostrar um toast de erro se necessário
    }
  };

  return (
    <section className="space-y-8">
      <CashClosingToast 
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        message="Fechamento de caixa registrado com sucesso!"
      />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Fechamento de Caixa</h2>
          <p className="text-muted-foreground">Controle diário do fluxo de caixa</p>
        </div>
        <Button onClick={handleFechamento} className="rounded-xl">
          <CalendarDays className="mr-2 h-4 w-4" />
          Registrar Fechamento
        </Button>
      </div>

      {/* Seleção de Data */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Selecionar Data</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-3 border border-border rounded-xl bg-background"
          />
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Receitas</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {receitasDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingDown className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Despesas</p>
                <p className="text-2xl font-bold text-red-600">
                  R$ {despesasDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <CalendarDays className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Impostos Vencendo</p>
                <p className="text-2xl font-bold text-orange-600">
                  R$ {impostosVencendoDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saldo Líquido</p>
                <p className={`text-2xl font-bold ${
                  saldoLiquido >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  R$ {saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo do Dia */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Resumo do Dia - {new Date(selectedDate).toLocaleDateString('pt-BR')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3">Entradas</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Receitas Operacionais:</span>
                    <span className="font-medium">R$ {receitasDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Outras Receitas:</span>
                    <span className="font-medium">R$ 0,00</span>
                  </div>
                  <hr className="border-green-200 dark:border-green-800" />
                  <div className="flex justify-between font-bold">
                    <span>Total de Entradas:</span>
                    <span>R$ {receitasDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <h3 className="font-semibold text-red-800 dark:text-red-200 mb-3">Saídas</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Despesas Operacionais:</span>
                    <span className="font-medium">R$ {despesasDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Impostos e Taxas:</span>
                    <span className="font-medium">R$ {impostosVencendoDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Custos com Equipe:</span>
                    <span className="font-medium">R$ {custosEquipeDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <hr className="border-red-200 dark:border-red-800" />
                  <div className="flex justify-between font-bold">
                    <span>Total de Saídas:</span>
                    <span>R$ {(despesasDia + impostosVencendoDia + custosEquipeDia).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                Resultado do Dia
              </h3>
              <p className={`text-3xl font-bold ${
                saldoLiquido >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {saldoLiquido >= 0 ? 'Lucro' : 'Prejuízo'}: R$ {Math.abs(saldoLiquido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex justify-center">
              <Button onClick={handleFechamento} size="lg" className="rounded-xl px-8">
                Confirmar Fechamento de Caixa
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default Fechamento;
