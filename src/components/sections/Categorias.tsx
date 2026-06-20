import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useCategoriasPersonalizadas, CategoriaPersonalizada } from '@/hooks/useCategoriasPersonalizadas';
import { useAppContext } from '@/contexts/AppContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const iconOptions = [
  'folder', 'utensils', 'car', 'home', 'heart', 'book-open', 'gamepad-2',
  'shopping-cart', 'briefcase', 'trending-up', 'credit-card', 'banknote',
  'building', 'plane', 'smartphone', 'laptop', 'shirt', 'coffee', 'fuel',
  'graduation-cap', 'stethoscope', 'dumbbell', 'music', 'palette'
];

const coresDisponiveis = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
  '#06B6D4', '#F97316', '#EC4899', '#84CC16', '#6366F1',
  '#14B8A6', '#F43F5E', '#A855F7', '#22D3EE', '#FB923C'
];

export function Categorias() {
  const { categorias, loading, adicionarCategoria, atualizarCategoria, removerCategoria } = useCategoriasPersonalizadas();
  const { despesas, receitas } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<CategoriaPersonalizada | null>(null);
  const [deletingCategoria, setDeletingCategoria] = useState<CategoriaPersonalizada | null>(null);
  const [novaCategoria, setNovaCategoria] = useState({
    nome: '',
    tipo: 'despesa' as 'receita' | 'despesa' | 'ambos',
    cor: '#3B82F6',
    icone: 'folder'
  });

  // Calcular gastos do mês atual por categoria
  const gastosPorCategoria = useMemo(() => {
    const inicio = startOfMonth(new Date());
    const fim = endOfMonth(new Date());
    
    const despesasDoMes = despesas.filter(despesa => {
      const dataDespesa = new Date(despesa.data);
      return dataDespesa >= inicio && dataDespesa <= fim;
    });

    const receitasDoMes = receitas.filter(receita => {
      const dataReceita = new Date(receita.data);
      return dataReceita >= inicio && dataReceita <= fim;
    });

    const gastos = new Map<string, { despesas: number; receitas: number }>();

    despesasDoMes.forEach(despesa => {
      const categoria = (despesa as any).categoria_personalizada || despesa.categoria;
      const atual = gastos.get(categoria) || { despesas: 0, receitas: 0 };
      gastos.set(categoria, { ...atual, despesas: atual.despesas + Number(despesa.valor) });
    });

    receitasDoMes.forEach(receita => {
      const categoria = (receita as any).categoria_personalizada || receita.categoria;
      const atual = gastos.get(categoria) || { despesas: 0, receitas: 0 };
      gastos.set(categoria, { ...atual, receitas: atual.receitas + Number(receita.valor) });
    });

    return gastos;
  }, [despesas, receitas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCategoria) {
        await atualizarCategoria(editingCategoria.id, novaCategoria);
      } else {
        await adicionarCategoria({ ...novaCategoria, ativo: true });
      }
      
      setIsDialogOpen(false);
      setEditingCategoria(null);
      setNovaCategoria({
        nome: '',
        tipo: 'despesa',
        cor: '#3B82F6',
        icone: 'folder'
      });
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
    }
  };

  const handleEdit = (categoria: CategoriaPersonalizada) => {
    setEditingCategoria(categoria);
    setNovaCategoria({
      nome: categoria.nome,
      tipo: categoria.tipo,
      cor: categoria.cor,
      icone: categoria.icone
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (categoria: CategoriaPersonalizada) => {
    setDeletingCategoria(categoria);
  };

  const confirmDelete = async () => {
    if (deletingCategoria) {
      await removerCategoria(deletingCategoria.id);
      setDeletingCategoria(null);
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.Folder;
    return IconComponent;
  };

  if (loading) {
    return <div className="p-6">Carregando categorias...</div>;
  }

  return (
    <div className="p-6 space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-display tracking-tight">Categorias</h1>
          <p className="text-muted-foreground">Gerencie suas categorias personalizadas de receitas e despesas</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-tutorial="add-categoria-btn">
              <Plus className="mr-2 h-4 w-4" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome da Categoria</Label>
                <Input
                  id="nome"
                  value={novaCategoria.nome}
                  onChange={(e) => setNovaCategoria(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Alimentação, Vendas..."
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="tipo">Tipo da Categoria</Label>
                <Select
                  value={novaCategoria.tipo}
                  onValueChange={(value: 'receita' | 'despesa' | 'ambos') => 
                    setNovaCategoria(prev => ({ ...prev, tipo: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="despesa">Apenas Despesas</SelectItem>
                    <SelectItem value="receita">Apenas Receitas</SelectItem>
                    <SelectItem value="ambos">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="cor">Cor da Categoria</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {coresDisponiveis.map(cor => (
                    <button
                      key={cor}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        novaCategoria.cor === cor ? 'border-primary' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: cor }}
                      onClick={() => setNovaCategoria(prev => ({ ...prev, cor }))}
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <Label htmlFor="icone">Ícone da Categoria</Label>
                <Select
                  value={novaCategoria.icone}
                  onValueChange={(value) => setNovaCategoria(prev => ({ ...prev, icone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map(icon => {
                      const IconComponent = getIcon(icon);
                      return (
                        <SelectItem key={icon} value={icon}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            {icon}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingCategoria(null);
                    setNovaCategoria({
                      nome: '',
                      tipo: 'despesa',
                      cor: '#3B82F6',
                      icone: 'folder'
                    });
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCategoria ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grid de categorias com gastos do mês */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categorias.map(categoria => {
          const IconComponent = getIcon(categoria.icone);
          const gastos = gastosPorCategoria.get(categoria.nome) || { despesas: 0, receitas: 0 };
          const valorLiquido = gastos.receitas - gastos.despesas;
          
          return (
            <Card key={categoria.id} className="p-4 relative group">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(categoria)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(categoria)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${categoria.cor}20`, color: categoria.cor }}
                >
                  <IconComponent className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{categoria.nome}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {categoria.tipo === 'ambos' ? 'Receitas & Despesas' : 
                     categoria.tipo === 'receita' ? 'Receitas' : 'Despesas'}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                {categoria.tipo !== 'receita' && gastos.despesas > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      Despesas
                    </div>
                    <span className="text-sm font-medium text-destructive">
                      -R$ {gastos.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                
                {categoria.tipo !== 'despesa' && gastos.receitas > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Receitas
                    </div>
                    <span className="text-sm font-medium text-green-500">
                      +R$ {gastos.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                
                {categoria.tipo === 'ambos' && (gastos.receitas > 0 || gastos.despesas > 0) && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Saldo:</span>
                      <span className={`text-sm font-bold ${
                        valorLiquido >= 0 ? 'text-green-500' : 'text-destructive'
                      }`}>
                        {valorLiquido >= 0 ? '+' : ''}R$ {valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
                
                {gastos.receitas === 0 && gastos.despesas === 0 && (
                  <div className="text-center py-2">
                    <span className="text-sm text-muted-foreground">Nenhuma movimentação este mês</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      
      {categorias.length === 0 && (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-muted rounded-full">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Nenhuma categoria encontrada</h3>
              <p className="text-muted-foreground">Crie sua primeira categoria personalizada para organizar melhor suas finanças.</p>
            </div>
          </div>
        </Card>
      )}

      <AlertDialog open={!!deletingCategoria} onOpenChange={(open) => !open && setDeletingCategoria(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a categoria "{deletingCategoria?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}