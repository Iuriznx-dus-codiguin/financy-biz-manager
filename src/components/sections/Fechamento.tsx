
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const Fechamento = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fechamentos = [
    {
      data: '2025-01-15',
      entradas: 2450.00,
      saidas: 1200.00,
      saldoLiquido: 1250.00,
      impostosPagos: 850.00,
      status: 'Fechado',
      observacoes: 'Dia com boa movimentação. Cliente premium pagou fatura.'
    },
    {
      data: '2025-01-14',
      entradas: 3200.00,
      saidas: 890.00,
      saldoLiquido: 2310.00,
      impostosPagos: 420.00,
      status: 'Fechado',
      observacoes: 'Recebimento de consultoria. Pagamento de conta de luz.'
    },
    {
      data: '2025-01-13',
      entradas: 1800.00,
      saidas: 450.00,
      saldoLiquido: 1350.00,
      impostosPagos: 0,
      status: 'Fechado',
      observacoes: 'Venda de licença de software para startup.'
    },
    {
      data: '2025-01-12',
      entradas: 890.00,
      saidas: 3200.00,
      saldoLiquido: -2310.00,
      impostosPagos: 980.00,
      status: 'Fechado',
      observacoes: 'Pagamento de aluguel e salários. Dia com saldo negativo.'
    }
  ];

  const getStatusBadge = (status: string) => {
    return status === 'Fechado' ? 
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">Fechado</Badge> :
      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">Pendente</Badge>;
  };

  const getSaldoColor = (saldo: number) => {
    return saldo >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <section id="fechamento" className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Fechamento de Caixa</h2>
          <p className="text-muted-foreground">Histórico e controle dos fechamentos diários</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 py-3 font-semibold">
              Fechar Novo Caixa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Novo Fechamento de Caixa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <p className="text-sm text-muted-foreground">Entradas Hoje</p>
                  <p className="text-xl font-bold text-green-600">R$ 1.850,00</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <p className="text-sm text-muted-foreground">Saídas Hoje</p>
                  <p className="text-xl font-bold text-red-600">R$ 780,00</p>
                </div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-sm text-muted-foreground">Saldo Líquido</p>
                <p className="text-2xl font-bold text-primary">R$ 1.070,00</p>
              </div>
              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea 
                  id="observacoes" 
                  placeholder="Adicione observações sobre o dia..."
                  className="rounded-xl"
                />
              </div>
              <Button 
                className="w-full rounded-xl" 
                onClick={() => setIsDialogOpen(false)}
              >
                Confirmar Fechamento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo do Mês */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-2xl shadow-sm border-border/50">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground mb-2">Dias Fechados</p>
              <p className="text-3xl font-bold text-blue-600">15</p>
              <p className="text-xs text-muted-foreground">de 31 dias</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm border-border/50">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground mb-2">Média Diária</p>
              <p className="text-3xl font-bold text-green-600">R$ 1.420</p>
              <p className="text-xs text-green-600">↑ +12% vs mês anterior</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm border-border/50">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground mb-2">Melhor Dia</p>
              <p className="text-3xl font-bold text-primary">R$ 2.310</p>
              <p className="text-xs text-muted-foreground">14/01/2025</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm border-border/50">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground mb-2">Total Acumulado</p>
              <p className="text-3xl font-bold text-green-600">R$ 21.300</p>
              <p className="text-xs text-green-600">em 15 dias</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dicas e Instruções */}
      <Card className="rounded-2xl shadow-sm border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-600">💡 Como Fazer um Bom Fechamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold">Checklist Diário:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✅ Registrar todas as vendas do dia</li>
                <li>✅ Lançar gastos e despesas</li>
                <li>✅ Verificar recebimentos pendentes</li>
                <li>✅ Conferir caixa físico (se houver)</li>
                <li>✅ Anotar observações importantes</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold">Benefícios:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>📊 Controle total do fluxo de caixa</li>
                <li>📈 Identificação de tendências</li>
                <li>💰 Melhor planejamento financeiro</li>
                <li>📋 Histórico para análises</li>
                <li>🎯 Tomada de decisão assertiva</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Fechamentos */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Histórico de Fechamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-semibold">Data</th>
                  <th className="text-right p-4 font-semibold">Entradas</th>
                  <th className="text-right p-4 font-semibold">Saídas</th>
                  <th className="text-right p-4 font-semibold">Saldo Líquido</th>
                  <th className="text-right p-4 font-semibold">Impostos</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-center p-4 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {fechamentos.map((fechamento, index) => (
                  <tr key={index} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-4 font-medium">{fechamento.data}</td>
                    <td className="p-4 text-right font-bold text-green-600">
                      R$ {fechamento.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right font-bold text-red-600">
                      R$ {fechamento.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`p-4 text-right font-bold ${getSaldoColor(fechamento.saldoLiquido)}`}>
                      R$ {fechamento.saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right font-medium">
                      R$ {fechamento.impostosPagos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4">{getStatusBadge(fechamento.status)}</td>
                    <td className="p-4 text-center space-x-2">
                      <Button variant="outline" size="sm" className="rounded-lg">
                        Ver Detalhes
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-lg">
                        📄 Relatório
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Análise dos Fechamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>📊 Análise dos Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <span className="font-medium">Dias com saldo positivo</span>
                <span className="font-bold text-green-600">6 de 7 dias</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <span className="font-medium">Média de entradas</span>
                <span className="font-bold text-blue-600">R$ 1.890,00</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                <span className="font-medium">Média de saídas</span>
                <span className="font-bold text-orange-600">R$ 1.187,00</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <span className="font-medium">Tendência</span>
                <span className="font-bold text-purple-600">↗️ Crescimento</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>🎯 Metas e Objetivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl">
                <h4 className="font-semibold mb-2">Meta Mensal</h4>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Progresso</span>
                  <span className="text-sm font-bold">71% (R$ 21.300 / R$ 30.000)</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full" style={{ width: '71%' }}></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <p className="text-sm text-muted-foreground">Faltam</p>
                  <p className="text-lg font-bold text-green-600">R$ 8.700</p>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <p className="text-sm text-muted-foreground">Dias restantes</p>
                  <p className="text-lg font-bold text-blue-600">16 dias</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default Fechamento;
