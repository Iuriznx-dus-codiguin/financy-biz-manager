export type TourPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface TourStep {
  id: string;
  target: string | null; // CSS selector, ou null para tooltip centralizado
  title: string;
  content: string;
  position: TourPosition;
  badge?: string;
}

export type TourId =
  | 'general'
  | 'dashboard'
  | 'receitas'
  | 'despesas'
  | 'categorias'
  | 'metas'
  | 'relatorios'
  | 'agentes-ia'
  | 'impostos'
  | 'equipe'
  | 'fechamento';

// Tours that should only appear for business-type dashboards. Must mirror the
// menu-level access rules (only Equipe and Fechamento are business-exclusive).
export const BUSINESS_ONLY_TOURS: TourId[] = ['equipe', 'fechamento'];

// ─────────────────────────────────────────────────────────────────
// General tour — adaptativo (desktop destaca itens da sidebar,
// mobile destaca o botão do menu e elementos do header).
// ─────────────────────────────────────────────────────────────────
const generalDesktop: TourStep[] = [
  {
    id: 'g-welcome',
    target: null,
    title: 'Bem-vindo ao Financy! 👋',
    content:
      'Em 1 minuto vamos te mostrar os principais botões da plataforma e o que cada um faz. Use as setas do teclado ou os botões abaixo para navegar.',
    position: 'center',
  },
  {
    id: 'g-dashboard-selector',
    target: '[data-tutorial="dashboard-selector"]',
    title: '🗂️ Seletor de Dashboards',
    content:
      'Aqui você troca entre seus perfis e empresas — e cria novos. Útil para separar finanças da família, setores do negócio (vendas, transporte, marketing…) ou misturar pessoal e empresarial num só plano.',
    position: 'bottom',
    badge: 'Importante',
  },
  {
    id: 'g-painel',
    target: '[data-tutorial="nav-painel"]',
    title: '📊 Painel',
    content:
      'Seu hub principal: saldo, receitas, despesas, gráficos e insights da IA — tudo em tempo real.',
    position: 'right',
  },
  {
    id: 'g-receitas',
    target: '[data-tutorial="nav-receitas"]',
    title: '💰 Receitas',
    content:
      'Onde você registra todas as entradas (salário, vendas, freelas). Clique no item para abrir e use o botão "Nova Receita".',
    position: 'right',
  },
  {
    id: 'g-despesas',
    target: '[data-tutorial="nav-despesas"]',
    title: '💸 Despesas',
    content:
      'Lance seus gastos por categoria, fornecedor e forma de pagamento. Marque como recorrente para gerar automaticamente.',
    position: 'right',
  },
  {
    id: 'g-categorias',
    target: '[data-tutorial="nav-categorias"]',
    title: '🗂️ Categorias',
    content:
      'Crie e organize categorias personalizadas. Quanto melhor a organização, mais úteis os relatórios e a IA.',
    position: 'right',
  },
  {
    id: 'g-metas',
    target: '[data-tutorial="nav-metas"]',
    title: '🎯 Metas',
    content:
      'Defina objetivos com valor alvo e prazo. O progresso é calculado automaticamente.',
    position: 'right',
  },
  {
    id: 'g-relatorios',
    target: '[data-tutorial="nav-relatorios"]',
    title: '📈 Relatórios',
    content:
      'Gráficos, tendências e exportação em PDF/Excel para acompanhar sua evolução.',
    position: 'right',
  },
  {
    id: 'g-ia',
    target: '[data-tutorial="nav-agentes-ia"]',
    title: '🤖 IA Financeira',
    content:
      'Seu assistente em português. Pergunte "quanto gastei este mês?" ou peça "registra R$150 em alimentação". Ele também substitui o suporte por WhatsApp para dúvidas do dia a dia.',
    position: 'right',
    badge: 'Destaque',
  },
  {
    id: 'g-assinatura',
    target: '[data-tutorial="nav-assinatura"]',
    title: '💎 Assinatura',
    content:
      'Veja seu plano, recursos liberados e faça upgrade para desbloquear múltiplos dashboards e IA avançada.',
    position: 'right',
  },
  {
    id: 'g-config',
    target: '[data-tutorial="nav-configuracoes"]',
    title: '⚙️ Configurações',
    content:
      'Perfil, preferências, notificações e gerenciamento da conta.',
    position: 'right',
  },
  {
    id: 'g-finish',
    target: null,
    title: 'Pronto para começar! 🎉',
    content:
      'Em cada seção um mini-guia aparece na primeira visita. Para rever qualquer tour, clique no ícone de ajuda (?) ao lado do título da página, ou abra a Central de Ajuda.',
    position: 'center',
  },
];

const generalMobile: TourStep[] = [
  {
    id: 'gm-welcome',
    target: null,
    title: 'Bem-vindo ao Financy! 👋',
    content:
      'Vamos te mostrar rapidamente como usar a plataforma no celular. Toque em "Próximo" para começar.',
    position: 'center',
  },
  {
    id: 'gm-menu',
    target: '[data-tutorial="mobile-menu-trigger"]',
    title: '☰ Menu principal',
    content:
      'Toque aqui para abrir o menu lateral. Você encontra Painel, Receitas, Despesas, Metas, Relatórios, IA, Assinatura e Configurações.',
    position: 'bottom',
  },
  {
    id: 'gm-theme',
    target: '[data-tutorial="mobile-theme-toggle"]',
    title: '🌗 Tema',
    content:
      'Alterne entre modo claro e escuro com um toque.',
    position: 'bottom',
  },
  {
    id: 'gm-painel-info',
    target: null,
    title: '📊 Painel',
    content:
      'A primeira tela após o login. Mostra seu saldo, receitas, despesas, gráficos e insights da IA. Tudo em tempo real.',
    position: 'center',
  },
  {
    id: 'gm-fluxo-info',
    target: null,
    title: '💰 Receitas e 💸 Despesas',
    content:
      'Pelo menu lateral você acessa Receitas (entradas) e Despesas (gastos). Os botões "Nova Receita" e "Nova Despesa" lançam novas transações.',
    position: 'center',
  },
  {
    id: 'gm-metas-info',
    target: null,
    title: '🎯 Metas e 📈 Relatórios',
    content:
      'Defina objetivos com prazo e acompanhe o progresso. Os relatórios mostram tendências e podem ser exportados em PDF.',
    position: 'center',
  },
  {
    id: 'gm-ia',
    target: null,
    title: '🤖 IA Financeira',
    content:
      'No menu acesse "IA Financeira". Pergunte em português: "quanto gastei este mês?" ou peça "registra R$150 em alimentação". Também é seu canal de suporte do dia a dia.',
    position: 'center',
    badge: 'Destaque',
  },
  {
    id: 'gm-dashboard-selector',
    target: '[data-tutorial="dashboard-selector"]',
    title: '🗂️ Seletor de Dashboards',
    content:
      'Toque aqui para alternar entre perfis e empresas — ou criar novos. Ideal para família, setores do negócio ou misturar pessoal e empresarial.',
    position: 'bottom',
    badge: 'Importante',
  },
  {
    id: 'gm-finish',
    target: null,
    title: 'Pronto! 🎉',
    content:
      'Em cada seção um mini-guia aparece na primeira visita. Para rever um tour, toque no ícone de ajuda (?) ao lado do título da página ou abra a Central de Ajuda.',
    position: 'center',
  },
];

// ─────────────────────────────────────────────────────────────────
// Section tours (compartilhados desktop/mobile; fallback central
// quando o seletor não existe na viewport).
// ─────────────────────────────────────────────────────────────────
const sectionTours: Record<Exclude<TourId, 'general'>, TourStep[]> = {
  dashboard: [
    {
      id: 'dashboard-metrics',
      target: '[data-tutorial="metric-cards"]',
      title: 'Seu resumo financeiro',
      content: 'Cards com receitas, despesas, impostos e saldo do período selecionado.',
      position: 'bottom',
    },
    {
      id: 'dashboard-intelligence',
      target: '[data-tutorial="intelligence"]',
      title: 'Insights da IA',
      content: 'A IA analisa seus dados e gera alertas, dicas e oportunidades específicas para você.',
      position: 'top',
    },
    {
      id: 'dashboard-period',
      target: '[data-tutorial="time-filter"]',
      title: 'Período de análise',
      content: 'Alterne entre este mês, últimos 3 meses, este ano ou período personalizado.',
      position: 'bottom',
    },
  ],
  receitas: [
    {
      id: 'receitas-add',
      target: '[data-tutorial="add-receita-btn"]',
      title: 'Registre suas entradas',
      content: 'Clique para adicionar uma receita: valor, data, categoria e (opcional) cliente.',
      position: 'bottom',
    },
    {
      id: 'receitas-filter',
      target: '[data-tutorial="filter-receitas"]',
      title: 'Filtre por período',
      content: 'Veja receitas de hoje, da semana, do mês ou de um período personalizado.',
      position: 'bottom',
    },
    {
      id: 'receitas-tip',
      target: null,
      title: 'Edite com 1 clique',
      content: 'Qualquer receita da lista pode ser editada ou marcada como paga/pendente.',
      position: 'center',
    },
  ],
  despesas: [
    {
      id: 'despesas-add',
      target: '[data-tutorial="add-despesa-btn"]',
      title: 'Registre seus gastos',
      content: 'Adicione despesas com categoria, fornecedor e forma de pagamento.',
      position: 'bottom',
    },
    {
      id: 'despesas-filter',
      target: '[data-tutorial="filter-despesas"]',
      title: 'Despesas recorrentes',
      content: 'Marque uma despesa como recorrente (aluguel, assinaturas) e ela será lançada todo mês automaticamente.',
      position: 'bottom',
    },
    {
      id: 'despesas-tip',
      target: null,
      title: 'Tudo agrupado por categoria',
      content: 'Suas despesas alimentam os gráficos do painel e os insights da IA.',
      position: 'center',
    },
  ],
  categorias: [
    {
      id: 'categorias-add',
      target: '[data-tutorial="add-categoria-btn"]',
      title: 'Crie categorias',
      content: 'Categorias personalizadas tornam relatórios e IA muito mais úteis.',
      position: 'bottom',
    },
    {
      id: 'categorias-tip',
      target: null,
      title: 'Dica',
      content: 'Edite ou exclua categorias a qualquer momento — as mudanças refletem em todas as transações.',
      position: 'center',
    },
  ],
  metas: [
    {
      id: 'metas-add',
      target: '[data-tutorial="add-meta-btn"]',
      title: 'Defina objetivos',
      content: 'Crie metas com valor alvo, prazo e categoria. O progresso é calculado automaticamente.',
      position: 'bottom',
    },
    {
      id: 'metas-tip',
      target: null,
      title: 'Metas + IA',
      content: 'Pergunte ao assistente: "como estou indo nas minhas metas?" e receba uma análise personalizada.',
      position: 'center',
    },
  ],
  relatorios: [
    {
      id: 'relatorios-charts',
      target: '[data-tutorial="charts"]',
      title: 'Evolução visual',
      content: 'Os gráficos mostram tendências ao longo do tempo. Passe o mouse para ver valores exatos.',
      position: 'top',
    },
    {
      id: 'relatorios-export',
      target: null,
      title: 'Exporte seus dados',
      content: 'Baixe relatórios em PDF ou Excel para contadores, investidores ou arquivo pessoal.',
      position: 'center',
    },
  ],
  'agentes-ia': [
    {
      id: 'ia-input',
      target: '[data-tutorial="ai-input"]',
      title: 'Converse em português',
      content: 'Digite aqui sua pergunta ou comando. Ex.: "Qual meu saldo?", "Registra R$200 de supermercado" ou "Quais meus maiores gastos?".',
      position: 'top',
    },
    {
      id: 'ia-tip',
      target: null,
      title: 'Quanto mais dados, melhor',
      content: 'A IA conhece suas transações — quanto mais você registra, mais precisas as respostas.',
      position: 'center',
    },
  ],
  impostos: [
    {
      id: 'impostos-add',
      target: '[data-tutorial="add-imposto-btn"]',
      title: 'Obrigações fiscais',
      content: 'Registre impostos com vencimento e tipo (DAS, IRPJ, ISS, etc.).',
      position: 'bottom',
    },
    {
      id: 'impostos-tip',
      target: null,
      title: 'Recorrência automática',
      content: 'Impostos mensais recorrentes são gerados automaticamente todo mês.',
      position: 'center',
    },
  ],
  equipe: [
    {
      id: 'equipe-add',
      target: '[data-tutorial="add-membro-btn"]',
      title: 'Cadastre sua equipe',
      content: 'Adicione colaboradores com cargo, salário e periodicidade de pagamento.',
      position: 'bottom',
    },
    {
      id: 'equipe-tip',
      target: null,
      title: 'Custo no painel',
      content: 'O custo total da equipe entra automaticamente nas despesas do dashboard.',
      position: 'center',
    },
  ],
  fechamento: [
    {
      id: 'fechamento-tip',
      target: null,
      title: 'Fechamento do período',
      content: 'Visualize receitas, despesas e impostos do mês em uma única tela e exporte para o contador.',
      position: 'center',
    },
  ],
};

export interface TourContext {
  hasAdvancedIA?: boolean;
  hasBasicIA?: boolean;
  hasMultiDashboard?: boolean;
}

function applyContext(steps: TourStep[], ctx?: TourContext): TourStep[] {
  if (!ctx) return steps;
  return steps.map((s) => {
    // IA step: marca como recurso de upgrade quando o plano não inclui IA avançada
    if ((s.id === 'g-ia' || s.id === 'gm-ia') && ctx.hasAdvancedIA === false) {
      const upgradeNote = ctx.hasBasicIA
        ? ' (a versão avançada com análises preditivas é um recurso do plano Pro ou superior).'
        : ' (disponível em qualquer plano pago — faça upgrade para liberar).';
      return {
        ...s,
        badge: 'Upgrade',
        content: s.content.replace(/\.$/, '') + upgradeNote,
      };
    }
    // Assinatura: tom neutro já é adequado
    return s;
  });
}

export function getTourSteps(tourId: TourId, isMobile = false, ctx?: TourContext): TourStep[] {
  const base = tourId === 'general'
    ? (isMobile ? generalMobile : generalDesktop)
    : (sectionTours[tourId] || []);
  return applyContext(base, ctx);
}
