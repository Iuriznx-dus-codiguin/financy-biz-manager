
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

const Impostos = () => {
  const { impostos, addImposto, updateImposto } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [novoImposto, setNovoImposto] = useState({
    tipo: '',
    descricao: '',
    valor: '',
    vencimento: ''
  });

  const handleAddImposto = () => {
    if (novoImposto.tipo && novoImposto.valor) {
      addImposto({
        ...novoImposto,
        valor: parseFloat(novoImposto.valor),
        pago: false
      });
      setNovoImposto({
        tipo: '',
        descricao: '',
        valor: '',
        vencimento: ''
      });
      setIsDialogOpen(false);
    }
  };

  const handlePagar = (id: number) => {
    updateImposto(id, { pago: true });
  };

  const totalEmAberto = impostos.filter(i => !i.pago).reduce((sum, i) => sum + i.valor, 0);
  const totalPago = impostos.filter(i => i.pago).reduce((sum, i) => sum + i.valor, 0);

  const getStatusBadge = (pago: boolean) => {
    return pago ? 
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">Pago</Badge> :
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">Em aberto</Badge>;
  };

  return (
    <section className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Impostos e Taxas</h2>
          <p className="text-muted-foreground">Controle suas obrigações fiscais</p>
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
              <DialogTitle>Adicionar Imposto ou Taxa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="tipo">Tipo (Imposto ou Taxa)</Label>
                <Input
                  id="tipo"
                  placeholder="Ex: DAS, ISS, ICMS, Taxa de Limpeza..."
                  value={novoImposto.tipo}
                  onChange={(e) => setNovoImposto({...novoImposto, tipo: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  placeholder="Descrição do imposto ou taxa"
                  value={novoImposto.descricao}
                  onChange={(e) => setNovoImposto({...novoImposto, descricao: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  placeholder="0,00"
                  value={novoImposto.valor}
                  onChange={(e) => setNovoImposto({...novoImposto, valor: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="vencimento">Data de Vencimento</Label>
                <Input
                  id="vencimento"
                  type="date"
                  value={novoImposto.vencimento}
                  onChange={(e) => setNovoImposto({...novoImposto, vencimento: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <Button onClick={handleAddImposto} className="w-full rounded-xl">
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-sm text-muted-foreground">Total em Aberto</p>
              <p className="text-2xl font-bold text-red-600">R$ {totalEmAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <p className="text-sm text-muted-foreground">Já Pagos</p>
              <p className="text-2xl font-bold text-green-600">R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Impostos */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Lista de Impostos e Taxas</CardTitle>
        </CardHeader>
        <CardContent>
          {impostos.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold mb-2">Nenhum imposto ou taxa cadastrado</h3>
              <p className="text-muted-foreground mb-4">Comece adicionando o primeiro</p>
              <Button onClick={() => setIsDialogOpen(true)} className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {impostos.map((imposto) => (
                  <TableRow key={imposto.id}>
                    <TableCell className="font-semibold">{imposto.tipo}</TableCell>
                    <TableCell>{imposto.descricao}</TableCell>
                    <TableCell>{imposto.vencimento}</TableCell>
                    <TableCell>{getStatusBadge(imposto.pago)}</TableCell>
                    <TableCell className="text-right font-bold">
                      R$ {imposto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      {!imposto.pago && (
                        <Button 
                          size="sm" 
                          className="rounded-lg"
                          onClick={() => handlePagar(imposto.id)}
                        >
                          Marcar como Pago
                        </Button>
                      )}
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
