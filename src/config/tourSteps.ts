export type TourPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface TourStep {
  id: string;
  target: string | null; // CSS selector ou null para tooltip centralizado
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

export const BUSINESS_ONLY_TOURS: TourId[] = ['impostos', 'equipe', 'fechamento'];

export const TOUR_STEPS: Record<TourId, TourStep[]> = {
  general: [
    {
      id: 'general-dashboard',
      target: '#painel',
      title: 'Seu painel principal',
      content:
        'Aqui você vê o resumo completo das suas finanças: saldo atual, receitas, despesas e os insights da IA — tudo em tempo real.',
      position: 'bottom',
    },
    {
      id: 'general-sidebar',
      target: '[data-sidebar="sidebar"]',
      title: 'Navegação inteligente',
      content:
        'O menu lateral adapta as opções ao seu tipo de conta. Acesse receitas, despesas, metas e relatórios com um clique.',
      position: 'right',
    },
    {
      id: 'general-dashboard-selector',
      target: '[data-tutorial="dashboard-selector"]',
      title: 'Sua conta',
      content:
        'Aqui você gerencia seus dashboards. No plano Pro você pode criar dashboards separados para diferentes projetos ou empresas, com dados completamente isolados.',
      position: 'bottom',
    },
    {
      id: 'general-ia',
      target: '[data-tutorial="ai-menu-link"], a[href="/agentes-ia"]',
      title: 'Sua IA financeira pessoal',
      content:
        'O assistente de IA entende seus dados e responde em português. Pergunte "quanto gastei este mês?" ou peça "registra uma despesa de R$150 com alimentação".',
      position: 'right',
      badge: 'Novo',
    },
    {
      id: 'general-finish',
      target: null,
      title: 'Financy está pronto para você! 🎉',
      content:
        'Você conheceu as principais áreas da plataforma. Em cada seção, um mini-guia aparece na primeira visita. Você também pode revê-los a qualquer momento pelo botão "Guia rápido".',
      position: 'center',
    },
  ],
  dashboard: [
    {
      id: 'dashboard-metrics',
      target: '[data-tutorial="metric-cards"]',
      title: 'Seu resumo financeiro',
      content:
        'Os cards mostram receitas, despesas, impostos e saldo do período selecionado.',
      position: 'bottom',
    },
    {
      id: 'dashboard-intelligence',
      target: '[data-tutorial="intelligence"]',
      title: 'Insights gerados por IA',
      content:
        'A IA analisa seus dados e gera alertas, dicas e oportunidades específicas para o seu perfil financeiro.',
      position: 'top',
    },
    {
      id: 'dashboard-period',
      target: '[data-tutorial="time-filter"]',
      title: 'Mude o período de análise',
      content:
        'Alterne entre este mês, últimos 3 meses, este ano ou defina um período customizado.',
      position: 'bottom',
    },
  ],
  receitas: [
    {
      id: 'receitas-add',
      target: '[data-tutorial="add-receita-btn"]',
      title: 'Registre suas entradas',
      content:
        'Clique aqui para adicionar uma receita. Preencha valor, data, categoria e, se quiser, o nome do cliente.',
      position: 'bottom',
    },
    {
      id: 'receitas-filter',
      target: '[data-tutorial="filter-receitas"]',
      title: 'Filtre por período',
      content:
        'Veja receitas de hoje, desta semana, deste mês ou defina um período personalizado.',
      position: 'bottom',
    },
    {
      id: 'receitas-table',
      target: '[data-tutorial="receitas-table"]',
      title: 'Clique em qualquer receita para editar',
      content:
        'Todos os lançamentos são editáveis. Você também pode marcar como paga/pendente direto na lista.',
      position: 'top',
    },
  ],
  despesas: [
    {
      id: 'despesas-add',
      target: '[data-tutorial="add-despesa-btn"]',
      title: 'Registre seus gastos',
      content:
        'Adicione despesas com categoria, fornecedor e forma de pagamento. O gráfico de categorias atualiza automaticamente.',
      position: 'bottom',
    },
    {
      id: 'despesas-categorias',
      target: '[data-tutorial="despesas-table"]',
      title: 'Gastos por categoria',
      content:
        'Suas despesas são agrupadas automaticamente por categoria. Isso alimenta os relatórios e os insights da IA.',
      position: 'top',
    },
    {
      id: 'despesas-recorrente',
      target: '[data-tutorial="filter-despesas"]',
      title: 'Despesas recorrentes',
      content:
        'Marque uma despesa como recorrente (aluguel, assinaturas) e ela será lançada automaticamente todo mês.',
      position: 'bottom',
    },
  ],
  categorias: [
    {
      id: 'categorias-add',
      target: '[data-tutorial="add-categoria-btn"]',
      title: 'Crie categorias personalizadas',
      content:
        'Organize melhor suas finanças criando categorias específicas para o seu uso.',
      position: 'bottom',
    },
    {
      id: 'categorias-list',
      target: '[data-tutorial="categorias-list"]',
      title: 'Gerencie suas categorias',
      content: 'Edite ou exclua categorias a qualquer momento. Mudanças refletem em todas as transações.',
      position: 'top',
    },
    {
      id: 'categorias-tip',
      target: null,
      title: 'Dica',
      content: 'Categorias bem definidas tornam os relatórios e a IA muito mais úteis.',
      position: 'center',
    },
  ],
  metas: [
    {
      id: 'metas-add',
      target: '[data-tutorial="add-meta-btn"]',
      title: 'Defina objetivos financeiros',
      content:
        'Crie metas com valor alvo, prazo e categoria. O progresso é calculado automaticamente.',
      position: 'bottom',
    },
    {
      id: 'metas-progress',
      target: '[data-tutorial="metas-grid"]',
      title: 'Acompanhe seu progresso',
      content:
        'Cada meta tem uma barra de progresso. Metas atrasadas ficam em vermelho, metas concluídas em verde.',
      position: 'top',
    },
    {
      id: 'metas-tip',
      target: null,
      title: 'Dica: metas + IA trabalham juntas',
      content:
        'Peça ao assistente de IA "como estou indo nas minhas metas?" e receba uma análise personalizada.',
      position: 'center',
    },
  ],
  relatorios: [
    {
      id: 'relatorios-period',
      target: '[data-tutorial="period-selector"]',
      title: 'Escolha o período',
      content:
        'Defina o intervalo de tempo para gerar relatórios personalizados.',
      position: 'bottom',
    },
    {
      id: 'relatorios-charts',
      target: '[data-tutorial="charts"]',
      title: 'Visualize a evolução',
      content:
        'Os gráficos mostram tendências ao longo do tempo. Passe o mouse para ver valores exatos.',
      position: 'top',
    },
    {
      id: 'relatorios-export',
      target: null,
      title: 'Exporte seus dados',
      content:
        'Baixe relatórios completos em PDF ou Excel. Útil para contadores, investidores ou arquivos pessoais.',
      position: 'center',
    },
  ],
  'agentes-ia': [
    {
      id: 'ia-input',
      target: 'textarea, input[type="text"]',
      title: 'Converse com sua IA financeira',
      content:
        'Digite em linguagem natural: "Qual meu saldo?", "Registra R$200 de supermercado" ou "Quais meus maiores gastos este mês?".',
      position: 'top',
    },
    {
      id: 'ia-history',
      target: '[data-tutorial="chat-history"]',
      title: 'Histórico de conversas',
      content: 'Todas as conversas são salvas. Você pode retomar qualquer uma a qualquer momento.',
      position: 'right',
    },
    {
      id: 'ia-tip',
      target: null,
      title: 'Dica',
      content: 'A IA conhece seus dados financeiros — quanto mais transações você registrar, melhores serão as respostas.',
      position: 'center',
    },
  ],
  impostos: [
    {
      id: 'impostos-add',
      target: '[data-tutorial="add-imposto-btn"]',
      title: 'Controle de obrigações fiscais',
      content: 'Registre impostos com vencimento e tipo (DAS, IRPJ, ISS, etc.).',
      position: 'bottom',
    },
    {
      id: 'impostos-list',
      target: '[data-tutorial="impostos-list"]',
      title: 'Status de pagamento',
      content: 'Marque impostos como pagos. Os pendentes aparecem em destaque no dashboard.',
      position: 'top',
    },
    {
      id: 'impostos-recorrencia',
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
      id: 'equipe-table',
      target: '[data-tutorial="equipe-table"]',
      title: 'Custo de equipe',
      content: 'O custo total da equipe entra automaticamente nas despesas do dashboard.',
      position: 'top',
    },
    {
      id: 'equipe-tip',
      target: null,
      title: 'Folha de pagamento',
      content: 'Filtre por membro para ver o histórico de pagamentos.',
      position: 'center',
    },
  ],
  fechamento: [
    {
      id: 'fechamento-period',
      target: '[data-tutorial="fechamento-period"]',
      title: 'Fechamento do período',
      content: 'Visualize todas as receitas, despesas e impostos do período em uma única tela.',
      position: 'bottom',
    },
    {
      id: 'fechamento-summary',
      target: '[data-tutorial="fechamento-summary"]',
      title: 'Resumo consolidado',
      content: 'Veja o resumo completo e exporte o fechamento mensal em PDF ou Excel.',
      position: 'top',
    },
    {
      id: 'fechamento-tip',
      target: null,
      title: 'Para o seu contador',
      content: 'O fechamento exportado pode ser enviado direto para o contador.',
      position: 'center',
    },
  ],
};

export function getTourSteps(tourId: TourId): TourStep[] {
  return TOUR_STEPS[tourId] || [];
}
