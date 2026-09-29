// Categorias predefinidas do sistema

export interface CategoryOption {
  value: string;
  label: string;
  icon?: string;
}

// Categorias predefinidas para versão EMPRESARIAL
export const BUSINESS_REVENUE_CATEGORIES: CategoryOption[] = [
  { value: 'vendas', label: 'Vendas', icon: 'shopping-cart' },
  { value: 'servicos', label: 'Serviços', icon: 'briefcase' },
  { value: 'juros-rendimentos', label: 'Juros e rendimentos', icon: 'trending-up' },
  { value: 'outros', label: 'Outros', icon: 'folder' },
];

export const BUSINESS_EXPENSE_CATEGORIES: CategoryOption[] = [
  { value: 'fornecedores', label: 'Fornecedores / Compras', icon: 'shopping-cart' },
  { value: 'marketing', label: 'Marketing / Publicidade', icon: 'megaphone' },
  { value: 'tecnologia', label: 'Tecnologia / Software', icon: 'laptop' },
  { value: 'impostos', label: 'Impostos / Taxas', icon: 'file-text' },
  { value: 'salarios', label: 'Salários / RH', icon: 'users' },
  { value: 'aluguel', label: 'Aluguel / Estrutura', icon: 'building' },
  { value: 'outros', label: 'Outros gastos operacionais', icon: 'folder' },
];

// Categorias predefinidas para versão PESSOAL
export const PERSONAL_REVENUE_CATEGORIES: CategoryOption[] = [
  { value: 'salario', label: 'Salário', icon: 'banknote' },
  { value: 'renda-extra', label: 'Renda extra', icon: 'coins' },
  { value: 'vendas-pessoais', label: 'Vendas pessoais', icon: 'shopping-bag' },
  { value: 'outros', label: 'Outros', icon: 'folder' },
];

export const PERSONAL_EXPENSE_CATEGORIES: CategoryOption[] = [
  { value: 'alimentacao', label: 'Alimentação', icon: 'utensils' },
  { value: 'moradia', label: 'Moradia', icon: 'home' },
  { value: 'transporte', label: 'Transporte', icon: 'car' },
  { value: 'educacao', label: 'Educação', icon: 'graduation-cap' },
  { value: 'saude', label: 'Saúde', icon: 'heart-pulse' },
  { value: 'lazer', label: 'Lazer', icon: 'gamepad-2' },
  { value: 'outros', label: 'Outros', icon: 'folder' },
];

/**
 * Retorna as categorias predefinidas baseadas no tipo de dashboard e tipo de transação
 */
export const getPredefinedCategories = (
  dashboardType: 'pessoal' | 'empresarial' | null,
  transactionType: 'receita' | 'despesa'
): CategoryOption[] => {
  if (!dashboardType) {
    // Se não houver dashboard definido, retorna categorias empresariais por padrão
    if (transactionType === 'receita') {
      return BUSINESS_REVENUE_CATEGORIES;
    }
    return BUSINESS_EXPENSE_CATEGORIES;
  }

  if (dashboardType === 'empresarial') {
    return transactionType === 'receita' 
      ? BUSINESS_REVENUE_CATEGORIES 
      : BUSINESS_EXPENSE_CATEGORIES;
  }

  return transactionType === 'receita'
    ? PERSONAL_REVENUE_CATEGORIES
    : PERSONAL_EXPENSE_CATEGORIES;
};
