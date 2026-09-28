/**
 * Centralized route configuration
 * Single source of truth for section ↔ route mappings
 */

export interface MenuItem {
  id: string;
  /** Rótulo em dashboards empresariais (e padrão). */
  label: string;
  /** Rótulo em dashboards pessoais, quando difere (vocabulário de shared/lib/nomenclature.ts). */
  labelPessoal?: string;
  icon?: string;
  businessOnly: boolean;
}

// Mapeamento de seção para rota
export const SECTION_TO_ROUTE: Record<string, string> = {
  'painel': '/dashboard',
  'receitas': '/receitas',
  'despesas': '/despesas',
  'categorias': '/categorias',
  'impostos': '/impostos',
  'equipe': '/equipe',
  'metas': '/metas',
  'relatorios': '/relatorios',
  'fechamento': '/fechamento',
  'agentes-ia': '/agentes-ia',
  'assinatura': '/assinatura',
  'configuracoes': '/configuracoes',
  'ajuda': '/ajuda',
  'suporte': '/suporte',
};

// Mapeamento de rota para seção (gerado automaticamente do inverso)
export const ROUTE_TO_SECTION: Record<string, string> = Object.fromEntries(
  Object.entries(SECTION_TO_ROUTE).map(([section, route]) => [route, section])
);

// Seções permitidas quando assinatura está bloqueada
export const ALLOWED_SECTIONS_WHEN_BLOCKED = ['assinatura', 'configuracoes', 'ajuda', 'suporte'] as const;

// Seções que requerem dashboard empresarial
export const BUSINESS_ONLY_SECTIONS = ['equipe', 'fechamento'] as const;

// Menu items compartilhados entre AppSidebar e MobileSidebar
export const MENU_ITEMS: MenuItem[] = [
  { id: 'painel', label: 'Painel', businessOnly: false },
  { id: 'receitas', label: 'Receitas', labelPessoal: 'Entradas', businessOnly: false },
  { id: 'despesas', label: 'Despesas', labelPessoal: 'Gastos', businessOnly: false },
  { id: 'categorias', label: 'Categorias', businessOnly: false },
  { id: 'impostos', label: 'Impostos e Taxas', labelPessoal: 'Contas e Compromissos', businessOnly: false },
  { id: 'equipe', label: 'Equipe', businessOnly: true },
  { id: 'metas', label: 'Metas', labelPessoal: 'Objetivos', businessOnly: false },
  { id: 'relatorios', label: 'Relatórios', businessOnly: false },
  { id: 'fechamento', label: 'Fechamento de Caixa', businessOnly: true },
  { id: 'agentes-ia', label: 'Assistente de IA', businessOnly: false },
  { id: 'assinatura', label: 'Assinatura', businessOnly: false },
  { id: 'configuracoes', label: 'Configurações', businessOnly: false },
  // Uma entrada para atendimento (chat + humano) e outra para o conteúdo de ajuda.
  { id: 'ajuda', label: 'Central de Ajuda', businessOnly: false },
  { id: 'suporte', label: 'Suporte', businessOnly: false },
];

/** Rótulo do item no contexto do dashboard atual (pessoal ou empresarial). */
export const rotuloDoMenu = (item: MenuItem, tipo: 'personal' | 'business' | null | undefined): string =>
  tipo === 'personal' && item.labelPessoal ? item.labelPessoal : item.label;

/**
 * Helpers
 */
export const getRouteForSection = (section: string): string => 
  SECTION_TO_ROUTE[section] || '/dashboard';

export const getSectionForRoute = (pathname: string): string => 
  ROUTE_TO_SECTION[pathname] || 'painel';

export const isSectionAllowedWhenBlocked = (section: string): boolean =>
  (ALLOWED_SECTIONS_WHEN_BLOCKED as readonly string[]).includes(section);

export const isBusinessOnlySection = (section: string): boolean =>
  (BUSINESS_ONLY_SECTIONS as readonly string[]).includes(section);
