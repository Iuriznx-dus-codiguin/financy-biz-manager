import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

type CategoriaPersonalizadaFromDB = {
  id: string;
  user_id: string;
  nome: string;
  tipo: string;
  cor: string;
  icone: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  dashboard_id: string | null;
};

export interface CategoriaPersonalizada {
  id: string;
  user_id: string;
  nome: string;
  tipo: 'receita' | 'despesa' | 'ambos';
  cor: string;
  icone: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  dashboard_id?: string;
}

export const useCategoriasPersonalizadas = () => {
  const [categorias, setCategorias] = useState<CategoriaPersonalizada[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCategorias = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categorias_personalizadas')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      const categoriasFormatadas = (data || []).map((cat: CategoriaPersonalizadaFromDB): CategoriaPersonalizada => ({
        ...cat,
        tipo: cat.tipo as 'receita' | 'despesa' | 'ambos',
        dashboard_id: cat.dashboard_id || undefined
      }));
      setCategorias(categoriasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as categorias.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const adicionarCategoria = async (categoria: Omit<CategoriaPersonalizada, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { ativo?: boolean }) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('categorias_personalizadas')
        .insert({
          ...categoria,
          user_id: user.id,
          ativo: categoria.ativo ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      
      const novaCategoria: CategoriaPersonalizada = {
        ...data,
        tipo: data.tipo as 'receita' | 'despesa' | 'ambos',
        dashboard_id: data.dashboard_id || undefined
      };
      setCategorias(prev => [...prev, novaCategoria]);
      toast({
        title: "Sucesso",
        description: "Categoria criada com sucesso!",
      });
      
      return data;
    } catch (error) {
      console.error('Erro ao adicionar categoria:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a categoria.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const atualizarCategoria = async (id: string, updates: Partial<CategoriaPersonalizada>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('categorias_personalizadas')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      const categoriaAtualizada: CategoriaPersonalizada = {
        ...data,
        tipo: data.tipo as 'receita' | 'despesa' | 'ambos',
        dashboard_id: data.dashboard_id || undefined
      };
      setCategorias(prev => prev.map(cat => cat.id === id ? categoriaAtualizada : cat));
      toast({
        title: "Sucesso",
        description: "Categoria atualizada com sucesso!",
      });
      
      return data;
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a categoria.",
        variant: "destructive",
      });
      throw error;
    }
  };

  /**
   * Conta quantas transações (receitas + despesas) ainda referenciam a categoria.
   * Útil para alertar o usuário antes de remover.
   */
  const contarUsoCategoria = async (categoriaNome: string): Promise<number> => {
    if (!user) return 0;
    try {
      const [{ count: receitasCount }, { count: despesasCount }] = await Promise.all([
        supabase
          .from('receitas')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('categoria', categoriaNome),
        supabase
          .from('despesas')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('categoria', categoriaNome),
      ]);
      return (receitasCount || 0) + (despesasCount || 0);
    } catch (e) {
      console.error('Erro ao contar uso de categoria:', e);
      return 0;
    }
  };

  const removerCategoria = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('categorias_personalizadas')
        .update({ ativo: false })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setCategorias(prev => prev.filter(cat => cat.id !== id));
      toast({
        title: "Sucesso",
        description: "Categoria removida com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao remover categoria:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a categoria.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getCategoriasParaTipo = (tipo: 'receita' | 'despesa') => {
    return categorias.filter(cat => cat.tipo === tipo || cat.tipo === 'ambos');
  };

  const getCategoriasPorCor = () => {
    const cores = new Map<string, CategoriaPersonalizada[]>();
    categorias.forEach(categoria => {
      const categoriasComCor = cores.get(categoria.cor) || [];
      cores.set(categoria.cor, [...categoriasComCor, categoria]);
    });
    return cores;
  };

  useEffect(() => {
    fetchCategorias();
  }, [user]);

  return {
    categorias,
    loading,
    adicionarCategoria,
    atualizarCategoria,
    removerCategoria,
    getCategoriasParaTipo,
    getCategoriasPorCor,
    refetch: fetchCategorias
  };
};