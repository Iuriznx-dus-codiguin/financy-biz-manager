
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

const Receitas = () => {
  const { receitas, addReceita } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [novaReceita, setNovaReceita] = useState({
    data: '',
    descricao: '',
    categoria: '',
    cliente: '',
    valor: '',
    formaPagamento: ''
  });

  const handleAddReceita = () => {
    if (novaReceita.descricao && novaReceita.valor && novaReceita.categoria) {
      addReceita({
        ...novaReceita,
        valor: parseFloat(novaReceita.valor)
      });
      setNovaReceita({
        data: '',
        descricao: '',
        categoria: '',
        cliente: '',
        valor: '',
        formaPagamento: ''
      });
      setIsDialogOpen(false);
    }
  };

  const totalReceitas = receitas.reduce((sum, receita) => sum + receita.valor, 0);

  return (
    <section className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Receitas</h2>
          <p className="text-muted-foreground">Gerencie suas entradas de dinheiro</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Receita
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Receita</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={novaReceita.data}
                  onChange={(e) => setNovaReceita({...novaReceita, data: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  placeholder="Descreva a receita"
                  value={novaReceita.descricao}
                  onChange={(e) => setNovaReceita({...novaReceita, descricao: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Select 
                  value={novaReceita.categoria} 
                  onValueChange={(value) => setNovaReceita({...novaReceita, categoria: value})}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="venda">Venda</SelectItem>
                    <SelectItem value="servico">Serviço</SelectItem>
                    <SelectItem value="consultoria">Consultoria</SelectItem>
                    <SelectItem value="comissao">Comissão</SelectItem>
                    <SelectItem value="investimento">Investimento</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cliente">Cliente</Label>
                <Input
                  id="cliente"
                  placeholder="Nome do cliente"
                  value={novaReceita.cliente}
                  onChange={(e) => setNovaReceita({...novaReceita, cliente: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  placeholder="0,00"
                  value={novaReceita.valor}
                  onChange={(e) => setNovaReceita({...novaReceita, valor: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                <Select 
                  value={novaReceita.formaPagamento} 
                  onValueChange={(value) => setNovaReceita({...novaReceita, formaPagamento: value})}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddReceita} className="w-full rounded-xl">
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <p className="text-sm text-muted-foreground">Total de Receitas</p>
            <p className="text-3xl font-bold text-green-600">R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Receitas */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Lista de Receitas</CardTitle>
        </CardHeader>
        <CardContent>
          {receitas.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-xl font-semibold mb-2">Nenhuma receita cadastrada</h3>
              <p className="text-muted-foreground mb-4">Comece adicionando sua primeira receita</p>
              <Button onClick={() => setIsDialogOpen(true)} className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeira Receita
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receitas.map((receita) => (
                  <TableRow key={receita.id}>
                    <TableCell>{receita.data}</TableCell>
                    <TableCell className="font-medium">{receita.descricao}</TableCell>
                    <TableCell>{receita.categoria}</TableCell>
                    <TableCell>{receita.cliente}</TableCell>
                    <TableCell>{receita.formaPagamento}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      R$ {receita.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
