
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Filter, Search } from 'lucide-react';

const Despesas = () => {
  const [despesas, setDespesas] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [novaDespesa, setNovaDespesa] = useState({
    data: '',
    descricao: '',
    categoria: '',
    valor: '',
    status: 'em_aberto'
  });

  const handleAddDespesa = () => {
    if (novaDespesa.descricao && novaDespesa.valor) {
      const despesa = {
        id: Date.now(),
        ...novaDespesa,
        valor: parseFloat(novaDespesa.valor)
      };
      setDespesas([...despesas, despesa]);
      setNovaDespesa({
        data: '',
        descricao: '',
        categoria: '',
        valor: '',
        status: 'em_aberto'
      });
      setIsDialogOpen(false);
    }
  };

  const totalDespesas = despesas.reduce((sum, despesa) => sum + despesa.valor, 0);
  const despesasPagas = despesas.filter(d => d.status === 'pago');
  const despesasEmAberto = despesas.filter(d => d.status === 'em_aberto');

  return (
    <section className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Despesas</h2>
          <p className="text-muted-foreground">Controle total dos seus gastos empresariais</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Despesa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={novaDespesa.data}
                  onChange={(e) => setNovaDespesa({...novaDespesa, data: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  placeholder="Descrição da despesa"
                  value={novaDespesa.descricao}
                  onChange={(e) => setNovaDespesa({...novaDespesa, descricao: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Select value={novaDespesa.categoria} onValueChange={(value) => setNovaDespesa({...novaDespesa, categoria: value})}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="escritorio">Escritório</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="fornecedores">Fornecedores</SelectItem>
                    <SelectItem value="impostos">Impostos</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  placeholder="0,00"
                  value={novaDespesa.valor}
                  onChange={(e) => setNovaDespesa({...novaDespesa, valor: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={novaDespesa.status} onValueChange={(value) => setNovaDespesa({...novaDespesa, status: value})}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="em_aberto">Em Aberto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddDespesa} className="w-full rounded-xl">
                Adicionar Despesa
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Despesas</p>
                <p className="text-2xl font-bold text-red-600">R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-red-600 text-2xl">💳</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Despesas Pagas</p>
                <p className="text-2xl font-bold text-green-600">{despesasPagas.length}</p>
              </div>
              <div className="text-green-600 text-2xl">✅</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Aberto</p>
                <p className="text-2xl font-bold text-orange-600">{despesasEmAberto.length}</p>
              </div>
              <div className="text-orange-600 text-2xl">⏰</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média por Despesa</p>
                <p className="text-2xl font-bold">R$ {despesas.length > 0 ? (totalDespesas / despesas.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</p>
              </div>
              <div className="text-blue-600 text-2xl">📊</div>
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
              <div className="text-6xl mb-4">💳</div>
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despesas.map((despesa) => (
                  <TableRow key={despesa.id}>
                    <TableCell>{despesa.data}</TableCell>
                    <TableCell>{despesa.descricao}</TableCell>
                    <TableCell>{despesa.categoria}</TableCell>
                    <TableCell>
                      <Badge variant={despesa.status === 'pago' ? 'default' : 'secondary'}>
                        {despesa.status === 'pago' ? 'Pago' : 'Em Aberto'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      R$ {despesa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
