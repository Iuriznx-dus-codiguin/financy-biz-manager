
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, TrendingUp, TrendingDown, DollarSign, Search, Filter, ArrowUpCircle, ArrowDownCircle, FileText, Users, Calendar } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useSectionTutorialTrigger } from '@/hooks/useSectionTutorialTrigger';
import { SectionTutorial } from '@/components/tutorials/SectionTutorial';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TransacaoFluxoCaixa {
  id: string;
  tipo: 'receita' | 'despesa' | 'imposto' | 'equipe';
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  status: 'paga' | 'pendente' | 'recorrente' | 'automático';
  origem?: string;
  formaPagamento?: string;
  isRecorrente?: boolean;
}

const Fechamento = () => {
  const { receitas, despesas, impostos, membrosEquipe } = useAppContext();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todas' | 'paga' | 'pendente' | 'recorrente'>('todas');
  const [tipoFilter, setTipoFilter] = useState<'todas' | 'entradas' | 'saidas'>('todas');
  const [transacaoSelecionada, setTransacaoSelecionada] = useState<TransacaoFluxoCaixa | null>(null);
  const { showTutorial, closeTutorial } = useSectionTutorialTrigger('fechamento');

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

  // Consolidar todas as transações do período
  const todasTransacoes = useMemo(() => {
    const transacoes: TransacaoFluxoCaixa[] = [];

    // Receitas
    receitas
      .filter(r => r.data >= startDate && r.data <= endDate)
      .forEach(r => {
        transacoes.push({
          id: `receita-${r.id}`,
          tipo: 'receita',
          descricao: r.descricao,
          categoria: r.categoria_personalizada || r.categoria,
          valor: r.valor,
          data: r.data,
          status: r.recorrente ? 'recorrente' : r.status,
          origem: r.cliente,
          formaPagamento: r.formaPagamento,
          isRecorrente: r.recorrente
        });
      });

    // Despesas
    despesas
      .filter(d => d.data >= startDate && d.data <= endDate)
      .forEach(d => {
        transacoes.push({
          id: `despesa-${d.id}`,
          tipo: 'despesa',
          descricao: d.descricao,
          categoria: d.categoria_personalizada || d.categoria,
          valor: d.valor,
          data: d.data,
          status: d.recorrente ? 'recorrente' : d.status,
          origem: d.fornecedor,
          formaPagamento: d.formaPagamento,
          isRecorrente: d.recorrente
        });
      });

    // Impostos
    impostos
      .filter(i => i.vencimento >= startDate && i.vencimento <= endDate)
      .forEach(i => {
        transacoes.push({
          id: `imposto-${i.id}`,
          tipo: 'imposto',
          descricao: i.descricao,
          categoria: i.tipo,
          valor: i.valor,
          data: i.vencimento,
          status: i.recorrente ? 'recorrente' : (i.pago ? 'paga' : 'pendente'),
          isRecorrente: i.recorrente
        });
      });

    // Custos da equipe (proporcionais por dia)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    membrosEquipe
      .filter(m => m.status === 'ativo')
      .forEach(m => {
        let custoDiario = 0;
        switch (m.periodicidade) {
          case 'mensal':
            custoDiario = m.salario / 30;
            break;
          case 'semanal':
            custoDiario = m.salario / 7;
            break;
          case 'quinzenal':
            custoDiario = m.salario / 15;
            break;
        }
        
        for (let i = 0; i < days; i++) {
          const currentDate = new Date(start);
          currentDate.setDate(start.getDate() + i);
          const dateStr = currentDate.toISOString().split('T')[0];
          
          transacoes.push({
            id: `equipe-${m.id}-${dateStr}`,
            tipo: 'equipe',
            descricao: `Custo proporcional - ${m.nome}`,
            categoria: 'Folha de Pagamento',
            valor: custoDiario,
            data: dateStr,
            status: 'automático',
            origem: m.nome
          });
        }
      });

    return transacoes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [receitas, despesas, impostos, membrosEquipe, startDate, endDate]);

  // Filtrar transações
  const transacoesFiltradas = useMemo(() => {
    return todasTransacoes.filter(t => {
      // Filtro de busca
      if (searchTerm) {
        const termo = searchTerm.toLowerCase();
        if (!t.descricao.toLowerCase().includes(termo) && 
            !t.categoria.toLowerCase().includes(termo) &&
            !(t.origem?.toLowerCase().includes(termo))) {
          return false;
        }
      }

      // Filtro de status
      if (statusFilter !== 'todas') {
        if (statusFilter === 'recorrente' && !t.isRecorrente) return false;
        if (statusFilter !== 'recorrente' && t.status !== statusFilter) return false;
      }

      // Filtro de tipo
      if (tipoFilter === 'entradas' && t.tipo !== 'receita') return false;
      if (tipoFilter === 'saidas' && t.tipo === 'receita') return false;

      return true;
    });
  }, [todasTransacoes, searchTerm, statusFilter, tipoFilter]);

  // Calcular totais das transações filtradas
  const totaisFiltrados = useMemo(() => {
    const entradas = transacoesFiltradas
      .filter(t => t.tipo === 'receita')
      .reduce((sum, t) => sum + t.valor, 0);
    
    const saidas = transacoesFiltradas
      .filter(t => t.tipo !== 'receita')
      .reduce((sum, t) => sum + t.valor, 0);

    return { entradas, saidas, saldo: entradas - saidas };
  }, [transacoesFiltradas]);

  return (
    <section className="space-y-8">
      <SectionTutorial 
        section="fechamento"
        isOpen={showTutorial}
        onClose={(completed) => closeTutorial(completed)}
      />

      <div>
        <h2 className="text-3xl font-bold text-foreground">Fechamento de Caixa</h2>
        <p className="text-muted-foreground">Controle diário do fluxo de caixa e transações</p>
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
          </div>
        </CardContent>
      </Card>

      {/* Fluxo de Caixa Detalhado */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Fluxo de Caixa Detalhado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filtros e Busca */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição, categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Inicial</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Final</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="paga">Pagas</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="recorrente">Recorrentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={tipoFilter === 'todas' ? 'default' : 'outline'}
              onClick={() => setTipoFilter('todas')}
              className="rounded-xl"
            >
              Todas ({todasTransacoes.length})
            </Button>
            <Button
              variant={tipoFilter === 'entradas' ? 'default' : 'outline'}
              onClick={() => setTipoFilter('entradas')}
              className="rounded-xl"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Entradas ({todasTransacoes.filter(t => t.tipo === 'receita').length})
            </Button>
            <Button
              variant={tipoFilter === 'saidas' ? 'default' : 'outline'}
              onClick={() => setTipoFilter('saidas')}
              className="rounded-xl"
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Saídas ({todasTransacoes.filter(t => t.tipo !== 'receita').length})
            </Button>
          </div>

          {/* Totalizadores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-xl">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Entradas</p>
              <p className="text-xl font-bold text-green-600">
                R$ {totaisFiltrados.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Saídas</p>
              <p className="text-xl font-bold text-red-600">
                R$ {totaisFiltrados.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Saldo</p>
              <p className={`text-xl font-bold ${totaisFiltrados.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {totaisFiltrados.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Tabela de Transações */}
          <div className="border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Origem/Destino</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoesFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma transação encontrada para o período selecionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    transacoesFiltradas.map((transacao) => (
                      <TableRow 
                        key={transacao.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setTransacaoSelecionada(transacao)}
                      >
                        <TableCell className="font-medium">
                          {new Date(transacao.data).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {transacao.tipo === 'receita' && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Receita
                            </Badge>
                          )}
                          {transacao.tipo === 'despesa' && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              Despesa
                            </Badge>
                          )}
                          {transacao.tipo === 'imposto' && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              Imposto
                            </Badge>
                          )}
                          {transacao.tipo === 'equipe' && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Equipe
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{transacao.descricao}</TableCell>
                        <TableCell className="text-muted-foreground">{transacao.categoria}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {transacao.origem || '-'}
                        </TableCell>
                        <TableCell>
                          {transacao.status === 'paga' && (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paga</Badge>
                          )}
                          {transacao.status === 'pendente' && (
                            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendente</Badge>
                          )}
                          {transacao.status === 'recorrente' && (
                            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Recorrente</Badge>
                          )}
                          {transacao.status === 'automático' && (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Automático</Badge>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${
                          transacao.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transacao.tipo === 'receita' ? '+' : '-'} R$ {transacao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {transacoesFiltradas.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Exibindo {transacoesFiltradas.length} de {todasTransacoes.length} transações
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes da Transação */}
      <Dialog open={!!transacaoSelecionada} onOpenChange={() => setTransacaoSelecionada(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {transacaoSelecionada?.tipo === 'receita' && (
                <ArrowUpCircle className="h-5 w-5 text-green-500" />
              )}
              {transacaoSelecionada?.tipo === 'despesa' && (
                <ArrowDownCircle className="h-5 w-5 text-red-500" />
              )}
              {transacaoSelecionada?.tipo === 'imposto' && (
                <FileText className="h-5 w-5 text-orange-500" />
              )}
              {transacaoSelecionada?.tipo === 'equipe' && (
                <Users className="h-5 w-5 text-blue-500" />
              )}
              Detalhes da Transação
            </DialogTitle>
            <DialogDescription>
              Informações completas sobre esta transação
            </DialogDescription>
          </DialogHeader>

          {transacaoSelecionada && (
            <div className="space-y-4">
              {/* Descrição */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                <p className="text-base font-semibold">{transacaoSelecionada.descricao}</p>
              </div>

              {/* Tipo */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                <p className="text-base capitalize">
                  {transacaoSelecionada.tipo === 'receita' && '💰 Receita'}
                  {transacaoSelecionada.tipo === 'despesa' && '💸 Despesa'}
                  {transacaoSelecionada.tipo === 'imposto' && '📄 Imposto'}
                  {transacaoSelecionada.tipo === 'equipe' && '👥 Custo de Equipe'}
                </p>
              </div>

              {/* Valor */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Valor</label>
                <p className={`text-2xl font-bold ${
                  transacaoSelecionada.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transacaoSelecionada.tipo === 'receita' ? '+' : '-'} R$ {Number(transacaoSelecionada.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Categoria */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Categoria</label>
                <p className="text-base">{transacaoSelecionada.categoria}</p>
              </div>

              {/* Data */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data</label>
                <p className="text-base">
                  {format(new Date(transacaoSelecionada.data), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>

              {/* Status */}
              {transacaoSelecionada.status && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge 
                      variant={
                        transacaoSelecionada.status === 'paga' ? 'default' :
                        transacaoSelecionada.status === 'pendente' ? 'secondary' :
                        'outline'
                      }
                    >
                      {transacaoSelecionada.status === 'paga' && '✅ Pago'}
                      {transacaoSelecionada.status === 'pendente' && '⏳ Pendente'}
                      {transacaoSelecionada.status === 'recorrente' && '🔄 Recorrente'}
                      {transacaoSelecionada.status === 'automático' && '🤖 Automático'}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Origem (Cliente/Fornecedor/Membro) */}
              {transacaoSelecionada.origem && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {transacaoSelecionada.tipo === 'receita' ? 'Cliente' : 
                     transacaoSelecionada.tipo === 'despesa' ? 'Fornecedor' :
                     transacaoSelecionada.tipo === 'equipe' ? 'Membro' : 'Origem'}
                  </label>
                  <p className="text-base">{transacaoSelecionada.origem}</p>
                </div>
              )}

              {/* Forma de Pagamento */}
              {transacaoSelecionada.formaPagamento && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Forma de Pagamento</label>
                  <p className="text-base">{transacaoSelecionada.formaPagamento}</p>
                </div>
              )}

              {/* Indicador de Recorrência */}
              {transacaoSelecionada.isRecorrente && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700 dark:text-blue-400">
                    Esta é uma transação recorrente
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default Fechamento;
