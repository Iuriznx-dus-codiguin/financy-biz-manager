import React, { useState } from 'react';
import { SectionTourTrigger } from '@/components/onboarding/SectionTourTrigger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Filter, Search, CheckCircle, XCircle, Trash2, Calendar, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { useAppContext } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';

const Impostos = () => {
  const { impostos, addImposto, updateImposto, deleteImposto, receitas, loading } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [novoImposto, setNovoImposto] = useState({
    tipo: '',
    descricao: '',
    valor: '',
    valorTipo: 'fixo' as 'fixo' | 'porcentagem',
    vencimento: '',
    tipoRecorrencia: 'unico' as 'unico' | 'recorrente',
    tipo_recorrencia: 'mensal' as 'diaria' | 'semanal' | 'mensal' | 'anual',
    baseCalculo: '' // Para impostos em porcentagem
  });

  const handleAddImposto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novoImposto.tipo && novoImposto.valor && novoImposto.vencimento) {
      let proximaData = null;
      if (novoImposto.tipoRecorrencia === 'recorrente') {
        const vencimentoDate = new Date(novoImposto.vencimento);
        switch (novoImposto.tipo_recorrencia) {
          case 'diaria':
            vencimentoDate.setDate(vencimentoDate.getDate() + 1);
            break;
          case 'semanal':
            vencimentoDate.setDate(vencimentoDate.getDate() + 7);
            break;
          case 'mensal':
            vencimentoDate.setMonth(vencimentoDate.getMonth() + 1);
            break;
          case 'anual':
            vencimentoDate.setFullYear(vencimentoDate.getFullYear() + 1);
            break;
        }
        proximaData = vencimentoDate.toISOString().split('T')[0];
      }

      try {
        await addImposto({
          tipo: novoImposto.tipo,
          descricao: novoImposto.descricao,
          valor: parseFloat(novoImposto.valor),
          valorTipo: novoImposto.valorTipo,
          vencimento: novoImposto.vencimento,
          pago: false,
          tipoRecorrencia: novoImposto.tipoRecorrencia,
          recorrente: novoImposto.tipoRecorrencia === 'recorrente',
          tipo_recorrencia: novoImposto.tipoRecorrencia === 'recorrente' ? novoImposto.tipo_recorrencia : undefined,
          proxima_data: proximaData
        });
        toast.success('Imposto adicionado com sucesso!');
        setNovoImposto({
          tipo: '',
          descricao: '',
          valor: '',
          valorTipo: 'fixo',
          vencimento: '',
          tipoRecorrencia: 'unico',
          tipo_recorrencia: 'mensal',
          baseCalculo: ''
        });
        setIsDialogOpen(false);
      } catch {
        toast.error('Erro ao salvar imposto', { description: 'Verifique sua conexão e tente novamente.' });
      }
    }
  };

  const togglePago = async (id: number, pago: boolean) => {
    try {
      await updateImposto(id, { pago: !pago });
    } catch {
      toast.error('Erro ao atualizar imposto.');
    }
  };

  const handleDeleteImposto = (id: number) => {
    setDeletingId(id);
  };

  const confirmDeleteImposto = async () => {
    if (deletingId !== null) {
      try {
        await deleteImposto(deletingId);
        toast.success('Imposto excluído.');
      } catch {
        toast.error('Erro ao excluir imposto.');
      }
      setDeletingId(null);
    }
  };

  // Calcular total de receitas para base de cálculo de impostos em porcentagem
  const totalReceitas = receitas.reduce((sum, r) => sum + r.valor, 0);

  // Calcular total de impostos considerando porcentagem
  const totalImpostos = impostos.reduce((sum, imposto) => {
    if (imposto.valorTipo === 'porcentagem') {
      // Se for porcentagem, calcular sobre o total de receitas
      return sum + (totalReceitas * (imposto.valor / 100));
    }
    return sum + imposto.valor;
  }, 0);
  
  const impostosPagos = impostos.filter(imposto => imposto.pago);
  const impostosVencidos = impostos.filter(imposto => !imposto.pago && new Date(imposto.vencimento) < new Date());

  if (loading) {
    return <SectionSkeleton rows={6} />;
  }


  return (
    <section className="space-y-6 sm:space-y-8">

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1"><h2 className="text-2xl sm:text-3xl font-bold text-foreground font-display tracking-tight">Impostos e Taxas</h2><SectionTourTrigger tourId="impostos" /></div>
          <p className="text-muted-foreground">Gerencie seus impostos e taxas de forma simples</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl w-full sm:w-auto" data-tutorial="add-imposto-btn">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Imposto/Taxa
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-[95vw] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Imposto ou Taxa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddImposto} className="space-y-4">
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Select value={novoImposto.tipo} onValueChange={(value) => setNovoImposto(prev => ({ ...prev, tipo: value }))}>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valor">Valor</Label>
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
                  <Label htmlFor="valorTipo">Tipo de Valor</Label>
                  <Select value={novoImposto.valorTipo} onValueChange={(value: 'fixo' | 'porcentagem') => setNovoImposto(prev => ({ ...prev, valorTipo: value }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
                      <SelectItem value="porcentagem">Porcentagem (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              <div>
                <Label htmlFor="tipoRecorrencia">Tipo de Pagamento</Label>
                <Select value={novoImposto.tipoRecorrencia} onValueChange={(value: 'unico' | 'recorrente') => setNovoImposto(prev => ({ ...prev, tipoRecorrencia: value }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unico">Pagamento Único</SelectItem>
                    <SelectItem value="recorrente">Recorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {novoImposto.tipoRecorrencia === 'recorrente' && (
                <div>
                  <Label htmlFor="tipo_recorrencia" className="flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    Frequência da Recorrência
                  </Label>
                  <Select 
                    value={novoImposto.tipo_recorrencia} 
                    onValueChange={(value: 'diaria' | 'semanal' | 'mensal' | 'anual') => setNovoImposto(prev => ({ ...prev, tipo_recorrencia: value }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diaria">Diária</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    A próxima cobrança será gerada automaticamente na data configurada
                  </p>
                </div>
              )}

              {novoImposto.valorTipo === 'porcentagem' && (
                <div className="p-4 bg-primary/10 rounded-xl border border-primary/30">
                  <p className="text-sm text-primary flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    O valor será calculado como {novoImposto.valor || '0'}% sobre o total de receitas
                  </p>
                </div>
              )}
              <Button type="submit" className="w-full rounded-xl">
                Adicionar {novoImposto.tipo || 'Imposto/Taxa'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Impostos</p>
                <p className="text-2xl font-bold text-warning">R$ {totalImpostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-warning text-2xl">🏛️</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pagos</p>
                <p className="text-2xl font-bold text-success">{impostosPagos.length}</p>
              </div>
              <div className="text-success text-2xl">✅</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vencidos</p>
                <p className="text-2xl font-bold text-destructive">{impostosVencidos.length}</p>
              </div>
              <div className="text-destructive text-2xl">⚠️</div>
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
              <div className="text-primary text-2xl">📊</div>
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
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Recorrência</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Valor Calculado</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {impostos.map((imposto) => {
                    const valorCalculado = imposto.valorTipo === 'porcentagem'
                      ? totalReceitas * (imposto.valor / 100)
                      : imposto.valor;

                    return (
                      <TableRow key={imposto.id}>
                        <TableCell className="capitalize">{imposto.tipo}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{imposto.descricao}</span>
                            {imposto.recorrente && imposto.tipo_recorrencia && (
                              <Badge variant="secondary" className="w-fit mt-1 text-xs">
                                <Repeat className="h-3 w-3 mr-1" />
                                {imposto.tipo_recorrencia}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{new Date(imposto.vencimento).toLocaleDateString('pt-BR')}</span>
                            {imposto.proxima_data && (
                              <span className="text-xs text-muted-foreground">
                                Próx: {new Date(imposto.proxima_data).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">
                          {imposto.recorrente ? (
                            <Badge variant="outline" className="text-xs">
                              Recorrente
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Único
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {imposto.valorTipo === 'porcentagem' ? `${imposto.valor}%` : `R$ ${imposto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          R$ {valorCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          {imposto.pago ? (
                            <CheckCircle className="h-5 w-5 text-success mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => togglePago(imposto.id, imposto.pago)}
                              className="rounded-lg whitespace-nowrap"
                            >
                              {imposto.pago ? 'Marcar Pendente' : 'Marcar Pago'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteImposto(imposto.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir imposto/taxa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteImposto} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default Impostos;
