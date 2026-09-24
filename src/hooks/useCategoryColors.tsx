import { useMemo } from 'react';
import { useCategoriasPersonalizadas } from './useCategoriasPersonalizadas';

// Cores padrão para categorias que não têm categorias personalizadas
const defaultColors: Record<string, string> = {
  // Despesas
  'moradia': '#8B5CF6',
  'alimentacao': '#F59E0B', 
  'transporte': '#10B981',
  'saude': '#EF4444',
  'educacao': '#3B82F6',
  'lazer': '#F97316',
  'outros': '#6B7280',
  
  // Receitas
  'vendas': '#22C55E',
  'servicos': '#06B6D4',
  'consultoria': '#8B5CF6',
  'salario': '#10B981',
  'freelance': '#F59E0B',
  'investimentos': '#8B5CF6',
};

export const useCategoryColors = () => {
  const { categorias } = useCategoriasPersonalizadas();

  const getCategoryColor = useMemo(() => {
    const colorMap = new Map<string, string>();
    
    // Adicionar cores das categorias personalizadas
    categorias.forEach(categoria => {
      colorMap.set(categoria.nome, categoria.cor);
    });
    
    // Função para obter cor da categoria
    return (categoryName: string): string => {
      // Verificar se é uma categoria personalizada
      if (colorMap.has(categoryName)) {
        return colorMap.get(categoryName)!;
      }
      
      // Verificar se é uma categoria padrão
      if (defaultColors[categoryName.toLowerCase()]) {
        return defaultColors[categoryName.toLowerCase()];
      }
      
      // Cor padrão se não encontrar
      return '#6B7280';
    };
  }, [categorias]);

  const getChartColors = (data: Array<{ name: string; [key: string]: any }>) => {
    return data.map(item => getCategoryColor(item.name));
  };

  return {
    getCategoryColor,
    getChartColors,
    categorias
  };
};