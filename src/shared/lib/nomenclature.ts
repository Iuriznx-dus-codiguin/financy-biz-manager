/**
 * Sistema de Nomenclatura Adaptativa
 * 
 * Adapta automaticamente os termos da plataforma baseado no contexto:
 * - Pessoal: Linguagem simples e orientada a controle pessoal
 * - Empresarial: Linguagem técnica e orientada a gestão de negócios
 */

type ContextType = 'personal' | 'business';

interface NomenclatureMap {
  [key: string]: {
    personal: string;
    business: string;
  };
}

const nomenclatureMap: NomenclatureMap = {
  // Receitas/Entradas
  'receitas': {
    personal: 'Entradas',
    business: 'Receitas'
  },
  'receita': {
    personal: 'Entrada',
    business: 'Receita'
  },
  'nova-receita': {
    personal: 'Nova Entrada',
    business: 'Nova Receita'
  },
  'total-receitas': {
    personal: 'Total de Entradas',
    business: 'Receita Total'
  },
  'receita-mensal': {
    personal: 'Entradas do Mês',
    business: 'Faturamento Mensal'
  },
  
  // Despesas/Gastos
  'despesas': {
    personal: 'Gastos',
    business: 'Despesas'
  },
  'despesa': {
    personal: 'Gasto',
    business: 'Despesa'
  },
  'nova-despesa': {
    personal: 'Novo Gasto',
    business: 'Nova Despesa'
  },
  'total-despesas': {
    personal: 'Total de Gastos',
    business: 'Despesas Totais'
  },
  'despesas-operacionais': {
    personal: 'Gastos Fixos',
    business: 'Despesas Operacionais'
  },
  
  // Cliente/Origem
  'cliente': {
    personal: 'Origem',
    business: 'Cliente'
  },
  'clientes': {
    personal: 'Origens',
    business: 'Clientes'
  },
  
  // Fornecedor/Descrição
  'fornecedor': {
    personal: 'Local/Descrição',
    business: 'Fornecedor'
  },
  'fornecedores': {
    personal: 'Locais',
    business: 'Fornecedores'
  },
  
  // Lucro/Saldo
  'lucro': {
    personal: 'Saldo',
    business: 'Lucro Líquido'
  },
  'lucro-liquido': {
    personal: 'Saldo Final',
    business: 'Lucro Líquido'
  },
  'margem-lucro': {
    personal: 'Taxa de Economia',
    business: 'Margem de Lucro'
  },
  
  // Metas
  'metas-titulo': {
    personal: 'Meus Objetivos Financeiros',
    business: 'Metas de Crescimento'
  },
  'nova-meta': {
    personal: 'Novo Objetivo',
    business: 'Nova Meta'
  },
  
  // Relatórios
  'analise-rentabilidade': {
    personal: 'Análise de Economia',
    business: 'Análise de Rentabilidade'
  },
  'fluxo-caixa': {
    personal: 'Controle Mensal',
    business: 'Fluxo de Caixa'
  },
  
  // Impostos
  'impostos-titulo': {
    personal: 'Contas e Compromissos',
    business: 'Impostos e Taxas'
  },
  'novo-imposto': {
    personal: 'Nova Conta',
    business: 'Novo Imposto/Taxa'
  },
  
  // Geral
  'painel': {
    personal: 'Meu Painel',
    business: 'Dashboard'
  },
  'configuracoes': {
    personal: 'Ajustes',
    business: 'Configurações'
  },
  
  // Dashboard/Perfil/Empresa
  'dashboard': { personal: 'Perfil', business: 'Empresa' },
  'dashboards': { personal: 'Perfis', business: 'Empresas' },
  'novo_dashboard': { personal: 'Novo Perfil', business: 'Nova Empresa' },
  'criar_dashboard': { personal: 'Criar Perfil', business: 'Criar Empresa' },
  'dashboard_principal': { personal: 'Perfil Principal', business: 'Empresa Principal' },
  'multi_dashboard': { personal: 'Múltiplos Perfis', business: 'Múltiplas Empresas' },
  'selecionar_dashboard': { personal: 'Selecionar Perfil', business: 'Selecionar Empresa' }
};

/**
 * Obtém o texto adaptado baseado na chave e contexto
 */
export const getLabel = (key: string, context: ContextType): string => {
  const label = nomenclatureMap[key];
  
  if (!label) {
    console.warn(`Chave de nomenclatura não encontrada: ${key}`);
    return key;
  }
  
  return label[context];
};

/**
 * Adapta múltiplas labels de uma vez
 */
export const getLabels = (
  keys: string[], 
  context: ContextType
): Record<string, string> => {
  return keys.reduce((acc, key) => {
    acc[key] = getLabel(key, context);
    return acc;
  }, {} as Record<string, string>);
};

/**
 * Hook personalizado para usar nomenclatura adaptativa
 */
export const useAdaptiveLabels = (context: ContextType) => {
  return {
    getLabel: (key: string) => getLabel(key, context),
    getLabels: (keys: string[]) => getLabels(keys, context)
  };
};
