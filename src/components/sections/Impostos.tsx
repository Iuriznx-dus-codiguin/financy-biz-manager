import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Filter, Search, CheckCircle, XCircle } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

const Impostos = () => {
  const { impostos, addImposto, updateImposto } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [novoImposto, setNovoImposto] = useState({
    tipo: '',
    descricao: '',
    valor: '',
    vencimento: '',
    recorrente: false
  });

  const handleAddImposto = (e: React.FormEvent) => {
    e.preventDefault();
    if (novoImposto.tipo && novoImposto.valor && novoImposto.vencimento) {
      addImposto({
        tipo: novoImposto.tipo,
        descricao: novoImposto.descricao,
        valor: parseFloat(novoImposto.valor),
        vencimento: novoImposto.vencimento,
        pago: false,
        recorrente: novoImposto.recorrente
      });
      setNovoImposto({
        tipo: '',
        descricao: '',
        valor: '',
        vencimento: '',
        recorrente: false
      });
      setIsDialogOpen(false);
    }
  };

  const handleTipoChange = (value: string) => {
    setNovoImposto(prev => ({ ...prev, tipo: value }));
  };

  const togglePago = (id: number, pago: boolean) => {
    updateImposto(id, { pago: !pago });
  };

  const totalImpostos = impostos.reduce((sum, imposto) => sum + imposto.valor, 0);
  const impostosPagos = impostos.filter(imposto => imposto.pago);
  const impostosVencidos = impostos.filter(imposto => !imposto.pago && new Date(imposto.vencimento) < new Date());

  return (
    <section className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Impostos e Taxas</h2>
          <p className="text-muted-foreground">Gerencie seus impostos e taxas de forma simples</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Imposto/Taxa
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Imposto ou Taxa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddImposto} className="space-y-4">
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Select value={novoImposto.tipo} onValueChange={handleTipoChange}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imposto">Imposto</SelectItem>
                    <SelectItem value="taxa">Taxa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  placeholder="Ex: DAS, IPTU, Taxa de bombeiros..."
                  value={novoImposto.descricao}
                  onChange={(e) => setNovoImposto(prev => ({...prev, descricao: e.target.value}))}
                  className="rounded-xl"
                  required
                />
              </div>
              <div>
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={novoImposto.valor}
                  onChange={(e) => setNovoImposto(prev => ({...prev, valor: e.target.value}))}
                  className="rounded-xl"
                  required
                />
              </div>
              <div>
                <Label htmlFor="vencimento">Data de Vencimento</Label>
                <Input
                  id="vencimento"
                  type="date"
                  value={novoImposto.vencimento}
                  onChange={(e) => setNovoImposto(prev => ({...prev, vencimento: e.target.value}))}
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="recorrente"
                  checked={novoImposto.recorrente}
                  onCheckedChange={(checked) => setNovoImposto(prev => ({...prev, recorrente: checked}))}
                />
                <Label htmlFor="recorrente">É um gasto recorrente?</Label>
              </div>
              <Button type="submit" className="w-full rounded-xl">
                Adicionar {novoImposto.tipo || 'Imposto/Taxa'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Impostos</p>
                <p className="text-2xl font-bold text-orange-600">R$ {totalImpostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-orange-600 text-2xl">🏛️</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pagos</p>
                <p className="text-2xl font-bold text-green-600">{impostosPagos.length}</p>
              </div>
              <div className="text-green-600 text-2xl">✅</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vencidos</p>
                <p className="text-2xl font-bold text-red-600">{impostosVencidos.length}</p>
              </div>
              <div className="text-red-600 text-2xl">⚠️</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Itens</p>
                <p className="text-2xl font-bold">{impostos.length}</p>
              </div>
              <div className="text-blue-600 text-2xl">📊</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Lista de Impostos e Taxas</CardTitle>
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
          {impostos.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏛️</div>
              <h3 className="text-xl font-semibold mb-2">Nenhum imposto ou taxa cadastrado</h3>
              <p className="text-muted-foreground mb-4">Comece adicionando seu primeiro imposto ou taxa</p>
              <Button onClick={() => setIsDialogOpen(true)} className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Item
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Recorrente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {impostos.map((imposto) => (
                  <TableRow key={imposto.id}>
                    <TableCell className="capitalize">{imposto.tipo}</TableCell>
                    <TableCell>{imposto.descricao}</TableCell>
                    <TableCell>{new Date(imposto.vencimento).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{imposto.recorrente ? 'Sim' : 'Não'}</TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {imposto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      {imposto.pago ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePago(imposto.id, imposto.pago)}
                        className="rounded-lg"
                      >
                        {imposto.pago ? 'Marcar como Pendente' : 'Marcar como Pago'}
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

export default Impostos;
