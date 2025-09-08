import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useCategoriasPersonalizadas } from '@/hooks/useCategoriasPersonalizadas';
import * as Icons from 'lucide-react';

interface CategorySelectorProps {
  tipo: 'receita' | 'despesa';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const categoriasPadrao = {
  receita: [
    { nome: 'Vendas', valor: 'vendas' },
    { nome: 'Serviços', valor: 'servicos' },
    { nome: 'Consultoria', valor: 'consultoria' },
    { nome: 'Salário', valor: 'salario' },
    { nome: 'Freelance', valor: 'freelance' },
    { nome: 'Investimentos', valor: 'investimentos' },
    { nome: 'Outros', valor: 'outros' }
  ],
  despesa: [
    { nome: 'Moradia', valor: 'moradia' },
    { nome: 'Alimentação', valor: 'alimentacao' },
    { nome: 'Transporte', valor: 'transporte' },
    { nome: 'Saúde', valor: 'saude' },
    { nome: 'Educação', valor: 'educacao' },
    { nome: 'Lazer', valor: 'lazer' },
    { nome: 'Outros', valor: 'outros' }
  ]
};

const coresDisponiveis = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
  '#06B6D4', '#F97316', '#EC4899', '#84CC16', '#6366F1'
];

const iconOptions = [
  'folder', 'utensils', 'car', 'home', 'heart', 'book-open', 'gamepad-2',
  'shopping-cart', 'briefcase', 'trending-up', 'credit-card', 'banknote'
];

export function CategorySelector({ tipo, value, onChange, placeholder, className }: CategorySelectorProps) {
  const { categorias, adicionarCategoria, getCategoriasParaTipo } = useCategoriasPersonalizadas();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState({
    nome: '',
    cor: '#3B82F6',
    icone: 'folder'
  });

  const categoriasPersonalizadas = getCategoriasParaTipo(tipo);
  const categoriasParaExibir = categoriasPadrao[tipo];

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await adicionarCategoria({
        ...novaCategoria,
        tipo,
        ativo: true
      });
      
      setIsDialogOpen(false);
      setNovaCategoria({
        nome: '',
        cor: '#3B82F6',
        icone: 'folder'
      });
      
      // Selecionar a nova categoria
      onChange(novaCategoria.nome);
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.Folder;
    return IconComponent;
  };

  return (
    <div className={className}>
      <Label htmlFor="categoria">Categoria</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="rounded-xl flex-1">
            <SelectValue placeholder={placeholder || "Selecione uma categoria"} />
          </SelectTrigger>
          <SelectContent>
            {/* Categorias padrão */}
            {categoriasParaExibir.map(categoria => (
              <SelectItem key={categoria.valor} value={categoria.valor}>
                {categoria.nome}
              </SelectItem>
            ))}
            
            {/* Separador se houver categorias personalizadas */}
            {categoriasPersonalizadas.length > 0 && (
              <div className="border-t my-1" />
            )}
            
            {/* Categorias personalizadas */}
            {categoriasPersonalizadas.map(categoria => {
              const IconComponent = getIcon(categoria.icone);
              return (
                <SelectItem key={categoria.id} value={categoria.nome}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: categoria.cor }}
                    />
                    <IconComponent className="h-4 w-4" />
                    {categoria.nome}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        
        {/* Botão para criar nova categoria */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="rounded-xl">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Categoria de {tipo === 'receita' ? 'Receita' : 'Despesa'}</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome da Categoria</Label>
                <Input
                  id="nome"
                  value={novaCategoria.nome}
                  onChange={(e) => setNovaCategoria(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Marketing, Delivery..."
                  required
                />
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
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Criar Categoria
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}