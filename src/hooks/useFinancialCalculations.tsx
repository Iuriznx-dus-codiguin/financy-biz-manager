import { useMemo } from 'react';
import { isDateInRange } from '@/utils/dateFilters';
// Usar tipos compatíveis com o contexto existente
import type { Receita, Despesa, Imposto, MembroEquipe } from '@/contexts/AppContext';

interface FinancialCalculations {
  totalReceitas: number;
  totalDespesas: number;
  totalImpostos: number;
  totalTaxas: number;
  totalImpostosAberto: number;
  totalTaxasAberto: number;
  saldo: number;
  lucroLiquido: number;
  margemLiquida: number;
  receitasPagas: number;
  receitasPendentes: number;
  despesasPorCategoria: Record<string, number>;
  gastosComEquipe: number;
  gastosComFornecedores: number;
  totalTodasDespesas: number;
}

export const useFinancialCalculations = (
  data: {
    receitas: Receita[];
    despesas: Despesa[];
    impostos: Imposto[];
    membrosEquipe?: MembroEquipe[];
  },
  timeFilter?: string
): FinancialCalculations => {
  return useMemo(() => {
    const { receitas, despesas, impostos, membrosEquipe = [] } = data;

    // Aplicar filtro de tempo se fornecido
    const filteredReceitas = timeFilter 
      ? receitas.filter(r => isDateInRange(r.data, timeFilter))
      : receitas;
    
    const filteredDespesas = timeFilter
      ? despesas.filter(d => isDateInRange(d.data, timeFilter))
      : despesas;
    
    const filteredImpostos = timeFilter
      ? impostos.filter(i => isDateInRange(i.vencimento, timeFilter))
      : impostos;

    // Cálculos básicos
    const totalReceitas = filteredReceitas.reduce((sum, r) => sum + r.valor, 0);
    const totalDespesas = filteredDespesas.reduce((sum, d) => sum + d.valor, 0);
    
    const totalImpostos = filteredImpostos
      .filter(i => i.tipo === 'imposto')
      .reduce((sum, i) => {
        if (i.valorTipo === 'porcentagem') {
          return sum + (totalReceitas * (i.valor / 100));
        }
        return sum + i.valor;
      }, 0);
    
    const totalTaxas = filteredImpostos
      .filter(i => i.tipo === 'taxa')
      .reduce((sum, i) => {
        if (i.valorTipo === 'porcentagem') {
          return sum + (totalReceitas * (i.valor / 100));
        }
        return sum + i.valor;
      }, 0);

    const totalImpostosAberto = filteredImpostos
      .filter(i => !i.pago && i.tipo === 'imposto')
      .reduce((sum, i) => sum + i.valor, 0);

    const totalTaxasAberto = filteredImpostos
      .filter(i => !i.pago && i.tipo === 'taxa')
      .reduce((sum, i) => sum + i.valor, 0);

    // Gastos com equipe
    const gastosComEquipe = membrosEquipe
      .filter(m => m.status === 'ativo')
      .reduce((total, membro) => {
        switch (membro.periodicidade) {
          case 'mensal':
            return total + membro.salario;
          case 'semanal':
            return total + (membro.salario * 4);
          case 'quinzenal':
            return total + (membro.salario * 2);
          default:
            return total;
        }
      }, 0);

    // Cálculos derivados
    const saldo = totalReceitas - totalDespesas;
    const lucroLiquido = totalReceitas - totalDespesas - totalImpostos - totalTaxas - gastosComEquipe;
    const margemLiquida = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;

    // Status das receitas (usando dados filtrados)
    const receitasPagas = filteredReceitas.filter(r => r.status === 'paga').length;
    const receitasPendentes = filteredReceitas.filter(r => r.status === 'pendente').length;

    // Despesas por categoria
    const despesasPorCategoria = filteredDespesas.reduce((acc, despesa) => {
      acc[despesa.categoria] = (acc[despesa.categoria] || 0) + despesa.valor;
      return acc;
    }, {} as Record<string, number>);

    // Gastos com fornecedores - excluir categorias operacionais
    const categorias_operacionais = ['equipe', 'salarios', 'salários', 'folha'];
    const gastosComFornecedores = filteredDespesas
      .filter(d => d.fornecedor && d.fornecedor.trim() !== '' && 
                  !categorias_operacionais.includes(d.categoria.toLowerCase()))
      .reduce((sum, d) => sum + d.valor, 0);

    // Total de todas as despesas (incluindo impostos, taxas e equipe)
    const totalTodasDespesas = totalDespesas + totalImpostos + totalTaxas + gastosComEquipe;

    return {
      totalReceitas,
      totalDespesas,
      totalImpostos,
      totalTaxas,
      totalImpostosAberto,
      totalTaxasAberto,
      saldo,
      lucroLiquido,
      margemLiquida,
      receitasPagas,
      receitasPendentes,
      despesasPorCategoria,
      gastosComEquipe,
      gastosComFornecedores,
      totalTodasDespesas,
    };
  }, [data, timeFilter]);
};