// Tipos compatíveis com os existentes no contexto
export interface FinancialReceita {
  id: number;
  data: string;
  descricao: string;
  categoria: string;
  valor: number;
  cliente?: string;
  formaPagamento: string; // Compatível com o contexto existente
  dashboard_id?: string;
  status: 'paga' | 'pendente';
}

export interface FinancialDespesa {
  id: number;
  data: string;
  descricao: string;
  categoria: string;
  valor: number;
  fornecedor?: string;
  formaPagamento: string; // Compatível com o contexto existente
  dashboard_id?: string;
  status: 'paga' | 'pendente';
}

export interface FinancialImposto {
  id: number;
  descricao: string;
  tipo: string; // Mais flexível para compatibilidade
  valor: number;
  valorTipo?: 'fixo' | 'porcentagem'; // Opcional para compatibilidade
  vencimento: string;
  pago: boolean;
  tipoRecorrencia?: 'unico' | 'recorrente'; // Compatível com contexto
  dashboard_id?: string;
}

export interface FinancialMembro {
  id: number; // Compatível com interface existente
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  salario: number;
  status: 'ativo' | 'inativo';
  periodicidade: 'mensal' | 'semanal' | 'quinzenal';
  dataAdmissao: string; // Compatível com interface existente
}

export type FinancialDataTypes = {
  receitas: FinancialReceita[];
  despesas: FinancialDespesa[];
  impostos: FinancialImposto[];
  membrosEquipe?: FinancialMembro[];
};