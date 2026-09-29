import { SectionSkeleton } from '@/components/ui/section-skeleton';

import React, { useState } from 'react';
import { SectionTourTrigger } from '@/features/onboarding/tour/SectionTourTrigger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Target, Plus, TrendingUp, DollarSign, Calendar, Award, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { type Meta, useAppContext } from '@/features/financeiro/AppContext';
import { dataLocal } from '@/shared/lib/datas';
import { useUserContext } from '@/features/dashboards/useUserContext';
import { getLabel } from '@/shared/lib/nomenclature';

type FormularioMeta = Omit<Meta, 'id' | 'dashboard_id'>;

const FORMULARIO_VAZIO: FormularioMeta = {
  titulo: '',
  valorMeta: 0,
  valorAtual: 0,
  progresso: 0,
  prazo: '',
  categoria: '',
  status: 'em_andamento',
  cor: 'bg-blue-500'
};

// Fora do componente: declarado dentro, era recriado a cada render e o campo perdia o foco a cada tecla.
function MetaFormFields<T extends FormularioMeta>({ form, setForm }: { form: T; setForm: (f: T) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="titulo">Título da Meta</Label>
        <Input id="titulo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
      </div>
      <div>
        <Label htmlFor="categoria">Categoria</Label>
        <Select value={form.categoria} onValueChange={(value) => setForm({ ...form, categoria: value })}>
          <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Receita">Receita</SelectItem>
            <SelectItem value="Economia">Economia</SelectItem>
            <SelectItem value="Poupança">Poupança</SelectItem>
            <SelectItem value="Investimento">Investimento</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="valorMeta">Valor da Meta</Label>
        <Input id="valorMeta" type="number" value={form.valorMeta} onChange={(e) => setForm({ ...form, valorMeta: Number(e.target.value) })} required />
      </div>
      <div>
        <Label htmlFor="valorAtual">Valor Atual</Label>
        <Input id="valorAtual" type="number" value={form.valorAtual} onChange={(e) => {
          const valorAtual = Number(e.target.value);
          const progresso = form.valorMeta > 0 ? Math.round((valorAtual / form.valorMeta) * 100) : 0;
          setForm({ ...form, valorAtual, progresso });
        }} />
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as Meta['status'] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="atrasada">Atrasada</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="prazo">Prazo</Label>
        <Input id="prazo" type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} required />
      </div>
    </div>
  );
}

const Metas = () => {
  const { metas, addMeta, updateMeta, deleteMeta, loading } = useAppContext();
  const { currentDashboardType } = useUserContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteMetaId, setDeleteMetaId] = useState<string | null>(null);
  
  const emptyForm = FORMULARIO_VAZIO;

  const [novaMetaForm, setNovaMetaForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState<{ id: string } & typeof emptyForm>({ id: '', ...emptyForm });

  const handleSubmitMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addMeta(novaMetaForm);
      toast.success('Meta adicionada com sucesso!');
      setNovaMetaForm(emptyForm);
      setIsDialogOpen(false);
    } catch {
      toast.error('Erro ao salvar meta', { description: 'Verifique sua conexão e tente novamente.' });
    }
  };

  const handleEditMeta = (meta: Meta) => {
    setEditForm({
      id: meta.id,
      titulo: meta.titulo,
      valorMeta: meta.valorMeta,
      valorAtual: meta.valorAtual,
      progresso: meta.progresso,
      prazo: meta.prazo,
      categoria: meta.categoria,
      status: meta.status,
      cor: meta.cor,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id, ...data } = editForm;
    try {
      await updateMeta(id, {
        titulo: data.titulo,
        valorMeta: data.valorMeta,
        valorAtual: data.valorAtual,
        progresso: data.progresso,
        prazo: data.prazo,
        categoria: data.categoria,
        status: data.status,
        cor: data.cor,
      });
      toast.success('Meta atualizada.');
      setIsEditDialogOpen(false);
    } catch {
      toast.error('Erro ao atualizar meta.');
    }
  };

  const handleDeleteMeta = async () => {
    if (deleteMetaId) {
      try {
        await deleteMeta(deleteMetaId);
        toast.success('Meta excluída.');
      } catch {
        toast.error('Erro ao excluir meta.');
      }
      setDeleteMetaId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluida':
        return <Badge className="bg-success/10 text-green-800">Concluída</Badge>;
      case 'em_andamento':
        return <Badge className="bg-primary/10 text-blue-800">Em Andamento</Badge>;
      case 'atrasada':
        return <Badge className="bg-destructive/10 text-red-800">Atrasada</Badge>;
      default:
        return <Badge>Indefinido</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString: string) => {
    return dataLocal(dateString).toLocaleDateString('pt-BR');
  };

  const progressoMedio = metas.length > 0 
    ? Math.round(metas.reduce((acc, meta) => acc + meta.progresso, 0) / metas.length)
    : 0;

  if (loading) {
    return <SectionSkeleton rows={4} />;
  }


  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2 min-w-0">
          <Target className="h-6 w-6 text-primary shrink-0" />
          <div className="flex items-center gap-1"><h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight">{getLabel('metas-titulo', currentDashboardType)}</h2><SectionTourTrigger tourId="metas" /></div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-tutorial="add-meta-btn" className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />{getLabel('nova-meta', currentDashboardType)}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar {getLabel('nova-meta', currentDashboardType)}</DialogTitle>
              <DialogDescription>Defina uma nova meta financeira com valor, prazo e categoria.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitMeta} className="space-y-4">
              <MetaFormFields form={novaMetaForm} setForm={setNovaMetaForm} />
              <Button type="submit" className="w-full">Criar Meta</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Metas</p>
                <p className="text-2xl font-bold">{metas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold">{metas.filter(m => m.status === 'concluida').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
                <p className="text-2xl font-bold">{metas.filter(m => m.status === 'em_andamento').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Progresso Médio</p>
                <p className="text-2xl font-bold">{progressoMedio}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Metas */}
      {metas.length === 0 ? (
        <Card className="p-8 text-center">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma meta cadastrada</h3>
          <p className="text-muted-foreground mb-4">Crie sua primeira meta financeira para começar a acompanhar seu progresso.</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Criar Primeira Meta
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {metas.map((meta) => (
            <Card key={meta.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{meta.titulo}</CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(meta.status)}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditMeta(meta)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteMetaId(meta.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Prazo: {formatDate(meta.prazo)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span className="font-medium">{meta.progresso}%</span>
                  </div>
                  <Progress value={meta.progresso} className="h-2" />
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Atual</p>
                    <p className="font-semibold text-lg">{formatCurrency(meta.valorAtual)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Meta</p>
                    <p className="font-semibold text-lg">{formatCurrency(meta.valorMeta)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <Badge variant="outline" className={`${meta.cor} text-white`}>{meta.categoria}</Badge>
                  <div className="text-sm text-muted-foreground">Faltam: {formatCurrency(meta.valorMeta - meta.valorAtual)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Meta</DialogTitle>
            <DialogDescription>Atualize os dados da sua meta financeira.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateMeta} className="space-y-4">
            <MetaFormFields<typeof editForm> form={editForm} setForm={setEditForm} />
            <Button type="submit" className="w-full">Salvar Alterações</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteMetaId !== null} onOpenChange={() => setDeleteMetaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMeta} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Metas;
