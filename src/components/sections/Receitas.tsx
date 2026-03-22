import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { CategorySelector } from '@/components/CategorySelector';
import { useSectionTutorialTrigger } from '@/hooks/useSectionTutorialTrigger';
import { SectionTutorial } from '@/components/tutorials/SectionTutorial';

const Receitas = () => {
  const { receitas, addReceita, deleteReceita, updateReceita } = useAppContext();
  const { isFeatureAvailable, getFeatureLimitMessage, getLimits } = useFeatureAccess();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todas');
  const { showTutorial, closeTutorial } = useSectionTutorialTrigger('receitas');
  const [novaReceita, setNovaReceita] = useState({
    data: '',
    descricao: '',
    categoria: '',
    categoriaPersonalizada: '',
    cliente: '',
    valor: '',
    formaPagamento: '',
    recorrente: false,
    tipoRecorrencia: '',
    proximaData: '',
    emAndamento: false
  });

  const handleAddReceita = (e: React.FormEvent) => {
    e.preventDefault();
    if (novaReceita.descricao && novaReceita.valor) {
      const receitaData = {
        ...novaReceita,
        valor: parseFloat(novaReceita.valor),
        categoria_personalizada: novaReceita.categoria === 'outros' ? novaReceita.categoriaPersonalizada : null,
        proxima_data: novaReceita.recorrente ? novaReceita.proximaData : null,
        tipo_recorrencia: novaReceita.recorrente ? novaReceita.tipoRecorrencia : null,
        status: novaReceita.emAndamento ? 'pendente' as const : 'paga' as const
      };
      addReceita(receitaData);
      setNovaReceita({
        data: '',
        descricao: '',
        categoria: '',
        categoriaPersonalizada: '',
        cliente: '',
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

  const handleDeleteReceita = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta receita?')) {
      await deleteReceita(id);
    }
  };

  const handleMarkAsPaid = async (id: number) => {
    await updateReceita(id, { status: 'paga' });
  };

  const totalReceitas = receitas
    .filter(receita => receita.status === 'paga')
    .reduce((sum, receita) => sum + receita.valor, 0);

  // Filtrar receitas por status e busca
  const filteredReceitas = useMemo(() => {
    return receitas.filter(receita => {
      const matchesStatus = statusFilter === 'todas' || 
        (statusFilter === 'pagas' && receita.status === 'paga') ||
        (statusFilter === 'pendentes' && receita.status === 'pendente');
      
      const matchesSearch = !searchTerm || 
        (receita.cliente && receita.cliente.toLowerCase().includes(searchTerm.toLowerCase())) ||
        receita.descricao.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  }, [receitas, statusFilter, searchTerm]);

  const receitasPagas = receitas.filter(r => r.status === 'paga').length;
  const receitasPendentes = receitas.filter(r => r.status === 'pendente').length;

  // Função para gerar simulação mensal
  const generateMonthlySimulation = useMemo(() => {
    if (!novaReceita.recorrente || !novaReceita.proximaData || !novaReceita.valor) {
      return [];
    }

    const startDate = new Date(novaReceita.proximaData);
    const value = parseFloat(novaReceita.valor);
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
  }, [novaReceita.recorrente, novaReceita.proximaData, novaReceita.valor]);

  const totalAnualSimulado = generateMonthlySimulation.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="space-y-8">
      <SectionTutorial 
        section="receitas"
        isOpen={showTutorial}
        onClose={(completed) => closeTutorial(completed)}
      />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Receitas</h2>
          <p className="text-muted-foreground">Controle completo das suas entradas de dinheiro</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Nova Receita
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Receita</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddReceita} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                {/* Coluna Esquerda - Dados Básicos */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b pb-2">Informações Básicas</h3>
                  
                  <div>
                    <Label htmlFor="descricao">Descrição</Label>
                    <Input
                      id="descricao"
                      placeholder="Descrição da receita"
                      value={novaReceita.descricao}
                      onChange={(e) => setNovaReceita(prev => ({...prev, descricao: e.target.value}))}
                      className="rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <CategorySelector
                      tipo="receita"
                      value={novaReceita.categoria}
                      onChange={(value) => setNovaReceita(prev => ({ ...prev, categoria: value }))}
                      className=""
                    />
                  </div>

                  {novaReceita.categoria === 'outros' && (
                    <div>
                      <Label htmlFor="categoriaPersonalizada">Nome da Categoria</Label>
                      <Input
                        id="categoriaPersonalizada"
                        placeholder="Digite o nome da categoria"
                        value={novaReceita.categoriaPersonalizada}
                        onChange={(e) => setNovaReceita(prev => ({...prev, categoriaPersonalizada: e.target.value}))}
                        className="rounded-xl"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="cliente">Cliente</Label>
                    <Input
                      id="cliente"
                      placeholder="Nome do cliente"
                      value={novaReceita.cliente}
                      onChange={(e) => setNovaReceita(prev => ({...prev, cliente: e.target.value}))}
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
                      value={novaReceita.data}
                      onChange={(e) => setNovaReceita(prev => ({...prev, data: e.target.value}))}
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
                      value={novaReceita.valor}
                      onChange={(e) => setNovaReceita(prev => ({...prev, valor: e.target.value}))}
                      className="rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                    <Select value={novaReceita.formaPagamento} onValueChange={(value) => setNovaReceita(prev => ({ ...prev, formaPagamento: value }))}>
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
                      checked={novaReceita.emAndamento}
                      onCheckedChange={(checked) => setNovaReceita(prev => ({...prev, emAndamento: !!checked}))}
                    />
                    <Label htmlFor="emAndamento">Em andamento (ainda não foi paga)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="recorrente"
                      checked={novaReceita.recorrente}
                      onCheckedChange={(checked) => setNovaReceita(prev => ({...prev, recorrente: !!checked, tipoRecorrencia: checked ? 'mensal' : ''}))}
                    />
                    <Label htmlFor="recorrente">Receita recorrente mensal</Label>
                  </div>

                  {novaReceita.emAndamento && (
                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-200">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                          Em Andamento
                        </Badge>
                        <span className="text-sm text-orange-700">Esta receita não será contabilizada até ser marcada como paga</span>
                      </div>
                    </div>
                  )}

                  {!novaReceita.recorrente && !novaReceita.emAndamento && (
                    <div className="bg-green-50 p-3 rounded-xl border border-green-200">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          Receita Única
                        </Badge>
                        <span className="text-sm text-green-700">Esta receita será registrada apenas uma vez</span>
                      </div>
                    </div>
                  )}

                  {novaReceita.recorrente && (
                    <div>
                      <Label htmlFor="proximaData">Data de Início da Recorrência</Label>
                      <Input
                        id="proximaData"
                        type="date"
                        value={novaReceita.proximaData}
                        onChange={(e) => setNovaReceita(prev => ({...prev, proximaData: e.target.value}))}
                        className="rounded-xl"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Seção de Simulação Mensal */}
              {novaReceita.recorrente && generateMonthlySimulation.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <h4 className="text-lg font-semibold text-green-700">Simulação Anual - Receita Recorrente</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                    {generateMonthlySimulation.map((item, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-green-200">
                        <div className="text-sm font-medium text-green-700 capitalize">{item.month}</div>
                        <div className="text-xs text-muted-foreground">{item.date}</div>
                        <div className="text-sm font-bold text-green-600">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-green-100 rounded-lg">
                    <span className="text-green-700 font-semibold">Total Anual Estimado:</span>
                    <span className="text-xl font-bold text-green-600">
                      R$ {totalAnualSimulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full rounded-xl">
                Adicionar Receita
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
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <p className="text-2xl font-bold text-green-600">R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-green-600 text-2xl">💰</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Transações</p>
                <p className="text-2xl font-bold">{receitas.length}</p>
              </div>
              <div className="text-blue-600 text-2xl">📊</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média por Transação</p>
                <p className="text-2xl font-bold">R$ {receitas.length > 0 ? (totalReceitas / receitas.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</p>
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
                  Todas ({receitas.length})
                </Button>
                <Button 
                  variant={statusFilter === 'pagas' ? 'default' : 'outline'} 
                  size="sm" 
                  className="rounded-lg"
                  onClick={() => setStatusFilter('pagas')}
                >
                  Pagas ({receitasPagas})
                </Button>
                <Button 
                  variant={statusFilter === 'pendentes' ? 'default' : 'outline'} 
                  size="sm" 
                  className="rounded-lg"
                  onClick={() => setStatusFilter('pendentes')}
                >
                  Pendentes ({receitasPendentes})
                </Button>
              </div>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-lg"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredReceitas.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-xl font-semibold mb-2">
                {receitas.length === 0 ? 'Nenhuma receita cadastrada' : 'Nenhuma receita encontrada'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {receitas.length === 0 ? 'Comece adicionando sua primeira receita' : 'Tente ajustar os filtros de busca'}
              </p>
              {receitas.length === 0 && (
                <Button onClick={() => setIsDialogOpen(true)} className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Primeira Receita
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
                  <TableHead>Cliente</TableHead>
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceitas.map((receita) => (
                  <TableRow key={receita.id}>
                    <TableCell>
                      {receita.status === 'paga' ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          <Check className="h-3 w-3 mr-1" />
                          Paga
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{receita.data}</TableCell>
                    <TableCell>{receita.descricao}</TableCell>
                    <TableCell>{receita.categoria}</TableCell>
                    <TableCell>{receita.cliente}</TableCell>
                    <TableCell>{receita.formaPagamento}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      R$ {receita.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center">
                        {receita.status === 'pendente' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsPaid(receita.id)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteReceita(receita.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
    </section>
  );
};

export default Receitas;
