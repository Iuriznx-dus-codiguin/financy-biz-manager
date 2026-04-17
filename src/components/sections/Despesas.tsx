import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Filter, Search, Trash2, Calendar, Check, Clock } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { CategorySelector } from '@/components/CategorySelector';
import { useSectionTutorialTrigger } from '@/hooks/useSectionTutorialTrigger';
import { SectionTutorial } from '@/components/tutorials/SectionTutorial';

const Despesas = () => {
  const { despesas, addDespesa, deleteDespesa, updateDespesa } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todas');
  const { showTutorial, closeTutorial } = useSectionTutorialTrigger('despesas');
  const [novaDespesa, setNovaDespesa] = useState({
    data: '',
    descricao: '',
    categoria: '',
    categoriaPersonalizada: '',
    fornecedor: '',
    valor: '',
    formaPagamento: '',
    recorrente: false,
    tipoRecorrencia: '',
    proximaData: '',
    emAndamento: false
  });

  const handleAddDespesa = (e: React.FormEvent) => {
    e.preventDefault();
    if (novaDespesa.descricao && novaDespesa.valor) {
      const despesaData = {
        ...novaDespesa,
        valor: parseFloat(novaDespesa.valor),
        categoria_personalizada: novaDespesa.categoria === 'outros' ? novaDespesa.categoriaPersonalizada : null,
        proxima_data: novaDespesa.recorrente ? novaDespesa.proximaData : null,
        tipo_recorrencia: novaDespesa.recorrente ? novaDespesa.tipoRecorrencia : null,
        status: novaDespesa.emAndamento ? 'pendente' as const : 'paga' as const
      };
      addDespesa(despesaData);
      setNovaDespesa({
        data: '',
        descricao: '',
        categoria: '',
        categoriaPersonalizada: '',
        fornecedor: '',
        valor: '',
        formaPagamento: '',
        recorrente: false,
        tipoRecorrencia: '',
        proximaData: '',
        emAndamento: false
      });
      setIsDialogOpen(false);
    }
  };

  const handleCategoriaChange = (value: string) => {
    setNovaDespesa(prev => ({ ...prev, categoria: value }));
  };

  const handleFormaPagamentoChange = (value: string) => {
    setNovaDespesa(prev => ({ ...prev, formaPagamento: value }));
  };

  const totalDespesas = despesas
    .filter(despesa => despesa.status === 'paga')
    .reduce((sum, despesa) => sum + despesa.valor, 0);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDeleteDespesa = async () => {
    if (deleteId !== null) {
      await deleteDespesa(deleteId);
      setDeleteId(null);
    }
  };

  const handleMarkAsPaid = async (id: number) => {
    await updateDespesa(id, { status: 'paga' });
  };

  // Filtrar despesas por status e busca
  const filteredDespesas = useMemo(() => {
    return despesas.filter(despesa => {
      const matchesStatus = statusFilter === 'todas' || 
        (statusFilter === 'pagas' && despesa.status === 'paga') ||
        (statusFilter === 'pendentes' && despesa.status === 'pendente');
      
      const matchesSearch = !searchTerm || 
        (despesa.fornecedor && despesa.fornecedor.toLowerCase().includes(searchTerm.toLowerCase())) ||
        despesa.descricao.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  }, [despesas, statusFilter, searchTerm]);

  const despesasPagas = despesas.filter(d => d.status === 'paga').length;
  const despesasPendentes = despesas.filter(d => d.status === 'pendente').length;

  // Função para gerar simulação mensal
  const generateMonthlySimulation = useMemo(() => {
    if (!novaDespesa.recorrente || !novaDespesa.proximaData || !novaDespesa.valor) {
      return [];
    }

    const startDate = new Date(novaDespesa.proximaData);
    const value = parseFloat(novaDespesa.valor);
    const simulation = [];

    for (let i = 0; i < 12; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      simulation.push({
        month: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        date: date.toLocaleDateString('pt-BR'),
        value: value
      });
    }

    return simulation;
  }, [novaDespesa.recorrente, novaDespesa.proximaData, novaDespesa.valor]);

  const totalAnualSimulado = generateMonthlySimulation.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="space-y-8">
      <SectionTutorial 
        section="despesas"
        isOpen={showTutorial}
        onClose={(completed) => closeTutorial(completed)}
      />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Despesas</h2>
          <p className="text-muted-foreground">Controle completo das suas saídas de dinheiro</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Despesa</DialogTitle>
              <DialogDescription>
                Registre uma nova despesa com todos os detalhes necessários para controle financeiro.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddDespesa} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                {/* Coluna Esquerda - Dados Básicos */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b pb-2">Informações Básicas</h3>
                  
                  <div>
                    <Label htmlFor="descricao">Descrição</Label>
                    <Input
                      id="descricao"
                      placeholder="Descrição da despesa"
                      value={novaDespesa.descricao}
                      onChange={(e) => setNovaDespesa(prev => ({...prev, descricao: e.target.value}))}
                      className="rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <CategorySelector
                      tipo="despesa"
                      value={novaDespesa.categoria}
                      onChange={handleCategoriaChange}
                      className=""
                    />
                  </div>

                  {novaDespesa.categoria === 'outros' && (
                    <div>
                      <Label htmlFor="categoriaPersonalizada">Nome da Categoria</Label>
                      <Input
                        id="categoriaPersonalizada"
                        placeholder="Digite o nome da categoria"
                        value={novaDespesa.categoriaPersonalizada}
                        onChange={(e) => setNovaDespesa(prev => ({...prev, categoriaPersonalizada: e.target.value}))}
                        className="rounded-xl"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="fornecedor">Fornecedor</Label>
                    <Input
                      id="fornecedor"
                      placeholder="Nome do fornecedor"
                      value={novaDespesa.fornecedor}
                      onChange={(e) => setNovaDespesa(prev => ({...prev, fornecedor: e.target.value}))}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {/* Coluna Direita - Dados Financeiros */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b pb-2">Detalhes Financeiros</h3>
                  
                  <div>
                    <Label htmlFor="data">Data</Label>
                    <Input
                      id="data"
                      type="date"
                      value={novaDespesa.data}
                      onChange={(e) => setNovaDespesa(prev => ({...prev, data: e.target.value}))}
                      className="rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="valor">Valor (R$)</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={novaDespesa.valor}
                      onChange={(e) => setNovaDespesa(prev => ({...prev, valor: e.target.value}))}
                      className="rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                    <Select value={novaDespesa.formaPagamento} onValueChange={handleFormaPagamentoChange}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="cartao">Cartão</SelectItem>
                        <SelectItem value="transferencia">Transferência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="emAndamento"
                      checked={novaDespesa.emAndamento}
                      onCheckedChange={(checked) => setNovaDespesa(prev => ({...prev, emAndamento: !!checked}))}
                    />
                    <Label htmlFor="emAndamento">Em andamento (ainda não foi paga)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="recorrente"
                      checked={novaDespesa.recorrente}
                      onCheckedChange={(checked) => setNovaDespesa(prev => ({...prev, recorrente: !!checked, tipoRecorrencia: checked ? 'mensal' : ''}))}
                    />
                    <Label htmlFor="recorrente">Despesa recorrente mensal</Label>
                  </div>

                  {novaDespesa.emAndamento && (
                    <div className="bg-warning/10 p-3 rounded-xl border border-warning/30">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="bg-warning/10 text-warning">
                          Em Andamento
                        </Badge>
                        <span className="text-sm text-warning">Esta despesa não será contabilizada até ser marcada como paga</span>
                      </div>
                    </div>
                  )}

                  {!novaDespesa.recorrente && !novaDespesa.emAndamento && (
                    <div className="bg-primary/10 p-3 rounded-xl border border-primary/30">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          Despesa Única
                        </Badge>
                        <span className="text-sm text-primary">Esta despesa será registrada apenas uma vez</span>
                      </div>
                    </div>
                  )}

                  {novaDespesa.recorrente && (
                    <div>
                      <Label htmlFor="proximaData">Data de Início da Recorrência</Label>
                      <Input
                        id="proximaData"
                        type="date"
                        value={novaDespesa.proximaData}
                        onChange={(e) => setNovaDespesa(prev => ({...prev, proximaData: e.target.value}))}
                        className="rounded-xl"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Seção de Simulação Mensal */}
              {novaDespesa.recorrente && generateMonthlySimulation.length > 0 && (
                <div className="mt-6 p-4 bg-destructive/10 rounded-xl border border-destructive/30">
                  <div className="flex items-center space-x-2 mb-4">
                    <Calendar className="h-5 w-5 text-destructive" />
                    <h4 className="text-lg font-semibold text-destructive">Simulação Anual - Despesa Recorrente</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                    {generateMonthlySimulation.map((item, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-destructive/30">
                        <div className="text-sm font-medium text-destructive capitalize">{item.month}</div>
                        <div className="text-xs text-muted-foreground">{item.date}</div>
                        <div className="text-sm font-bold text-destructive">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg">
                    <span className="text-destructive font-semibold">Total Anual Estimado:</span>
                    <span className="text-xl font-bold text-destructive">
                      R$ {totalAnualSimulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full rounded-xl">
                Adicionar Despesa
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Despesa Total</p>
                <p className="text-2xl font-bold text-destructive">R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-destructive text-2xl">💸</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Transações</p>
                <p className="text-2xl font-bold">{despesas.length}</p>
              </div>
              <div className="text-primary text-2xl">📊</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média por Transação</p>
                <p className="text-2xl font-bold">R$ {despesas.length > 0 ? (totalDespesas / despesas.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</p>
              </div>
              <div className="text-purple-600 text-2xl">📈</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <CardTitle>Transações Recentes</CardTitle>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex gap-2">
                <Button 
                  variant={statusFilter === 'todas' ? 'default' : 'outline'} 
                  size="sm" 
                  className="rounded-lg"
                  onClick={() => setStatusFilter('todas')}
                >
                  Todas ({despesas.length})
                </Button>
                <Button 
                  variant={statusFilter === 'pagas' ? 'default' : 'outline'} 
                  size="sm" 
                  className="rounded-lg"
                  onClick={() => setStatusFilter('pagas')}
                >
                  Pagas ({despesasPagas})
                </Button>
                <Button 
                  variant={statusFilter === 'pendentes' ? 'default' : 'outline'} 
                  size="sm" 
                  className="rounded-lg"
                  onClick={() => setStatusFilter('pendentes')}
                >
                  Pendentes ({despesasPendentes})
                </Button>
              </div>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por fornecedor ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-lg"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDespesas.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💸</div>
              <h3 className="text-xl font-semibold mb-2">
                {despesas.length === 0 ? 'Nenhuma despesa cadastrada' : 'Nenhuma despesa encontrada'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {despesas.length === 0 ? 'Comece adicionando sua primeira despesa' : 'Tente ajustar os filtros de busca'}
              </p>
              {despesas.length === 0 && (
                <Button onClick={() => setIsDialogOpen(true)} className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Primeira Despesa
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDespesas.map((despesa) => (
                  <TableRow key={despesa.id}>
                    <TableCell>
                      {despesa.status === 'paga' ? (
                        <Badge variant="secondary" className="bg-success/10 text-success">
                          <Check className="h-3 w-3 mr-1" />
                          Paga
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-warning/10 text-warning">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{despesa.data}</TableCell>
                    <TableCell>{despesa.descricao}</TableCell>
                    <TableCell>{despesa.categoria}</TableCell>
                    <TableCell>{despesa.fornecedor}</TableCell>
                    <TableCell>{despesa.formaPagamento}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      R$ {despesa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center">
                        {despesa.status === 'pendente' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsPaid(despesa.id)}
                            className="text-success hover:text-success hover:bg-success/10"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteId(despesa.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDespesa} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default Despesas;
