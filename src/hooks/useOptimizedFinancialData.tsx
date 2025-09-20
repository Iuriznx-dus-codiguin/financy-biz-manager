import { useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useFinancialCalculations } from './useFinancialCalculations';
import { isDateInRange } from '@/utils/dateFilters';

interface OptimizedFinancialData {
  calculations: ReturnType<typeof useFinancialCalculations>;
  filteredData: {
    receitas: any[];
    despesas: any[];
    impostos: any[];
  };
  rawData: {
    receitas: any[];
    despesas: any[];
    impostos: any[];
    membrosEquipe: any[];
  };
}

export const useOptimizedFinancialData = (timeFilter?: string): OptimizedFinancialData => {
  const { receitas, despesas, impostos, membrosEquipe } = useAppContext();

  const rawData = useMemo(() => ({
    receitas,
    despesas,
    impostos,
    membrosEquipe
  }), [receitas, despesas, impostos, membrosEquipe]);

  const filteredData = useMemo(() => {
    if (!timeFilter) {
      return {
        receitas,
        despesas,
        impostos
      };
    }
    
    return {
      receitas: receitas.filter(r => isDateInRange(r.data, timeFilter)),
      despesas: despesas.filter(d => isDateInRange(d.data, timeFilter)),
      impostos: impostos.filter(i => isDateInRange(i.vencimento, timeFilter))
    };
  }, [receitas, despesas, impostos, timeFilter]);

  const calculations = useFinancialCalculations(rawData, timeFilter);

  return {
    calculations,
    filteredData,
    rawData
  };
};