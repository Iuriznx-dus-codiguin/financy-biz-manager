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
import { Plus, Filter, Search, Trash2, Calendar } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

const Despesas = () => {
  const { despesas, addDespesa, deleteDespesa } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
    proximaData: ''
  });

  const handleAddDespesa = (e: React.FormEvent) => {
    e.preventDefault();
    if (novaDespesa.descricao && novaDespesa.valor) {
      const despesaData = {
        ...novaDespesa,
        valor: parseFloat(novaDespesa.valor),
        categoria_personalizada: novaDespesa.categoria === 'outros' ? novaDespesa.categoriaPersonalizada : null,
        proxima_data: novaDespesa.recorrente ? novaDespesa.proximaData : null,
        tipo_recorrencia: novaDespesa.recorrente ? novaDespesa.tipoRecorrencia : null
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
        proximaData: ''
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

  const totalDespesas = despesas.reduce((sum, despesa) => sum + despesa.valor, 0);

  const handleDeleteDespesa = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta despesa?')) {
      await deleteDespesa(id);
    }
  };

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
          <DialogContent className="rounded-2xl max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Despesa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddDespesa} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select value={novaDespesa.categoria} onValueChange={handleCategoriaChange}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="moradia">Moradia</SelectItem>
                        <SelectItem value="alimentacao">Alimentação</SelectItem>
                        <SelectItem value="transporte">Transporte</SelectItem>
                        <SelectItem value="saude">Saúde</SelectItem>
                        <SelectItem value="educacao">Educação</SelectItem>
                        <SelectItem value="lazer">Lazer</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
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
                      id="recorrente"
                      checked={novaDespesa.recorrente}
                      onCheckedChange={(checked) => setNovaDespesa(prev => ({...prev, recorrente: !!checked, tipoRecorrencia: checked ? 'mensal' : ''}))}
                    />
                    <Label htmlFor="recorrente">Despesa recorrente mensal</Label>
                  </div>

                  {!novaDespesa.recorrente && (
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          Despesa Única
                        </Badge>
                        <span className="text-sm text-blue-700">Esta despesa será registrada apenas uma vez</span>
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
                <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <Calendar className="h-5 w-5 text-red-600" />
                    <h4 className="text-lg font-semibold text-red-700">Simulação Anual - Despesa Recorrente</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                    {generateMonthlySimulation.map((item, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-red-200">
                        <div className="text-sm font-medium text-red-700 capitalize">{item.month}</div>
                        <div className="text-xs text-muted-foreground">{item.date}</div>
                        <div className="text-sm font-bold text-red-600">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-red-100 rounded-lg">
                    <span className="text-red-700 font-semibold">Total Anual Estimado:</span>
                    <span className="text-xl font-bold text-red-600">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Despesa Total</p>
                <p className="text-2xl font-bold text-red-600">R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-red-600 text-2xl">💸</div>
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
              <div className="text-blue-600 text-2xl">📊</div>
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
          <div className="flex justify-between items-center">
            <CardTitle>Histórico de Despesas</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="rounded-lg">
                <Filter className="h-4 w-4 mr-2" />
                Filtrar
              </Button>
              <Button variant="outline" size="sm" className="rounded-lg">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {despesas.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💸</div>
              <h3 className="text-xl font-semibold mb-2">Nenhuma despesa cadastrada</h3>
              <p className="text-muted-foreground mb-4">Comece adicionando sua primeira despesa</p>
              <Button onClick={() => setIsDialogOpen(true)} className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeira Despesa
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
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
                {despesas.map((despesa) => (
                  <TableRow key={despesa.id}>
                    <TableCell>{despesa.data}</TableCell>
                    <TableCell>{despesa.descricao}</TableCell>
                    <TableCell>{despesa.categoria}</TableCell>
                    <TableCell>{despesa.fornecedor}</TableCell>
                    <TableCell>{despesa.formaPagamento}</TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      R$ {despesa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDespesa(despesa.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

export default Despesas;
