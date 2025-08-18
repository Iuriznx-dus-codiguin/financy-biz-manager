
export interface OnboardingData {
  user_type: string;
  how_did_you_know: string;
  salary_range?: string;
  revenue_range?: string;
  nome_preferido?: string;
  termos_aceitos?: boolean;
  // Dados financeiros básicos
  saldo_conta?: number;
  saldo_carteira?: number;
  dividas_atuais?: number;
  receita_mensal?: number;
  // Planilha de gastos
  gastos_iniciais?: GastoInicial[];
  // Meta financeira
  meta_financeira?: string;
  valor_meta?: number;
  prazo_meta?: string;
}

export interface GastoInicial {
  id: string;
  categoria: string;
  descricao: string;
  valor_mensal: number;
  forma_pagamento: string;
}
