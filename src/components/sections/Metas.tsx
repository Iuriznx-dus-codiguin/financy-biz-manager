
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Plus, TrendingUp, DollarSign, Calendar, Award } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useSectionTutorialTrigger } from '@/hooks/useSectionTutorialTrigger';
import { SectionTutorial } from '@/components/tutorials/SectionTutorial';

const Metas = () => {
  const { metas, addMeta } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { showTutorial, closeTutorial } = useSectionTutorialTrigger('metas');
  const [novaMetaForm, setNovaMetaForm] = useState({
    titulo: '',
    valorMeta: 0,
    valorAtual: 0,
    progresso: 0,
    prazo: '',
    categoria: '',
    status: 'em_andamento' as const,
    cor: 'bg-blue-500'
  });

  const handleSubmitMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    await addMeta(novaMetaForm);
    setNovaMetaForm({
      titulo: '',
      valorMeta: 0,
      valorAtual: 0,
      progresso: 0,
      prazo: '',
      categoria: '',
      status: 'em_andamento',
      cor: 'bg-blue-500'
    });
    setIsDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluida':
        return <Badge className="bg-green-100 text-green-800">Concluída</Badge>;
      case 'em_andamento':
        return <Badge className="bg-blue-100 text-blue-800">Em Andamento</Badge>;
      case 'atrasada':
        return <Badge className="bg-red-100 text-red-800">Atrasada</Badge>;
      default:
        return <Badge>Indefinido</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const progressoMedio = metas.length > 0 
    ? Math.round(metas.reduce((acc, meta) => acc + meta.progresso, 0) / metas.length)
    : 0;

  return (
    <div className="space-y-6">
      <SectionTutorial 
        section="metas"
        isOpen={showTutorial}
        onClose={(completed) => closeTutorial(completed)}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Target className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Metas Financeiras</h2>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Meta</DialogTitle>
              <DialogDescription>
                Defina uma nova meta financeira com valor, prazo e categoria para acompanhar seu progresso.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitMeta} className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título da Meta</Label>
                <Input
                  id="titulo"
                  value={novaMetaForm.titulo}
                  onChange={(e) => setNovaMetaForm({...novaMetaForm, titulo: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Select
                  value={novaMetaForm.categoria}
                  onValueChange={(value) => setNovaMetaForm({...novaMetaForm, categoria: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
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
                <Input
                  id="valorMeta"
                  type="number"
                  value={novaMetaForm.valorMeta}
                  onChange={(e) => setNovaMetaForm({...novaMetaForm, valorMeta: Number(e.target.value)})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="valorAtual">Valor Atual</Label>
                <Input
                  id="valorAtual"
                  type="number"
                  value={novaMetaForm.valorAtual}
                  onChange={(e) => {
                    const valorAtual = Number(e.target.value);
                    const progresso = novaMetaForm.valorMeta > 0 
                      ? Math.round((valorAtual / novaMetaForm.valorMeta) * 100)
                      : 0;
                    setNovaMetaForm({...novaMetaForm, valorAtual, progresso});
                  }}
                />
              </div>
              <div>
                <Label htmlFor="prazo">Prazo</Label>
                <Input
                  id="prazo"
                  type="date"
                  value={novaMetaForm.prazo}
                  onChange={(e) => setNovaMetaForm({...novaMetaForm, prazo: e.target.value})}
                  required
                />
              </div>
              <Button type="submit" className="w-full">Criar Meta</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
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
                <p className="text-2xl font-bold">
                  {metas.filter(m => m.status === 'concluida').length}
                </p>
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
                <p className="text-2xl font-bold">
                  {metas.filter(m => m.status === 'em_andamento').length}
                </p>
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
          <p className="text-muted-foreground mb-4">
            Crie sua primeira meta financeira para começar a acompanhar seu progresso.
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeira Meta
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {metas.map((meta) => (
            <Card key={meta.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{meta.titulo}</CardTitle>
                  {getStatusBadge(meta.status)}
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
                    <p className="font-semibold text-lg">
                      {formatCurrency(meta.valorAtual)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Meta</p>
                    <p className="font-semibold text-lg">
                      {formatCurrency(meta.valorMeta)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <Badge variant="outline" className={`${meta.cor} text-white`}>
                    {meta.categoria}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    Faltam: {formatCurrency(meta.valorMeta - meta.valorAtual)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Metas;
