import { TutorialStep } from '@/components/tutorials/InteractiveTutorial';

export const TUTORIAL_STEPS: Record<string, TutorialStep[]> = {
  painel: [
    {
      id: 'whatsapp-button',
      title: '🤖 Assistente de IA via WhatsApp',
      description: 'Clique aqui para conversar com nosso assistente de IA e registrar transações pelo WhatsApp!',
      selector: '[data-tutorial="whatsapp-button"]',
      position: 'left'
    },
    {
      id: 'time-filter',
      title: '📅 Filtro de Período',
      description: 'Use este filtro para visualizar dados de diferentes períodos: este mês, últimos 3 meses, etc.',
      selector: '[data-tutorial="time-filter"]',
      position: 'bottom'
    },
    {
      id: 'metric-cards',
      title: '💰 Cards de Métricas',
      description: 'Visualize receitas, despesas e saldo de forma rápida e intuitiva.',
      selector: '[data-tutorial="metric-cards"]',
      position: 'bottom'
    },
    {
      id: 'intelligence',
      title: '🧠 Inteligência Financeira',
      description: 'Veja insights e análises automáticas sobre suas finanças.',
      selector: '[data-tutorial="intelligence"]',
      position: 'top'
    }
  ],
  receitas: [
    {
      id: 'add-receita',
      title: '➕ Adicionar Receita',
      description: 'Clique aqui para registrar uma nova receita.',
      selector: '[data-tutorial="add-receita-btn"]',
      position: 'bottom'
    },
    {
      id: 'filter-receitas',
      title: '🔍 Filtrar Receitas',
      description: 'Use os filtros para visualizar receitas de períodos específicos.',
      selector: '[data-tutorial="filter-receitas"]',
      position: 'bottom'
    },
    {
      id: 'receitas-table',
      title: '📋 Tabela de Receitas',
      description: 'Aqui você vê todas as suas receitas registradas. Clique em um item para editar ou excluir.',
      selector: '[data-tutorial="receitas-table"]',
      position: 'top'
    }
  ],
  despesas: [
    {
      id: 'add-despesa',
      title: '➕ Adicionar Despesa',
      description: 'Clique aqui para registrar uma nova despesa.',
      selector: '[data-tutorial="add-despesa-btn"]',
      position: 'bottom'
    },
    {
      id: 'filter-despesas',
      title: '🔍 Filtrar Despesas',
      description: 'Use os filtros para visualizar despesas de períodos específicos.',
      selector: '[data-tutorial="filter-despesas"]',
      position: 'bottom'
    },
    {
      id: 'despesas-table',
      title: '📋 Tabela de Despesas',
      description: 'Aqui você vê todas as suas despesas registradas. Clique em um item para editar ou excluir.',
      selector: '[data-tutorial="despesas-table"]',
      position: 'top'
    }
  ],
  categorias: [
    {
      id: 'add-categoria',
      title: '➕ Criar Categoria',
      description: 'Crie categorias personalizadas para organizar melhor suas finanças.',
      selector: '[data-tutorial="add-categoria-btn"]',
      position: 'bottom'
    },
    {
      id: 'categorias-list',
      title: '📁 Suas Categorias',
      description: 'Gerencie suas categorias personalizadas. Você pode editá-las ou excluí-las a qualquer momento.',
      selector: '[data-tutorial="categorias-list"]',
      position: 'top'
    }
  ],
  impostos: [
    {
      id: 'add-imposto',
      title: '➕ Adicionar Imposto/Taxa',
      description: 'Registre impostos e taxas para acompanhar vencimentos.',
      selector: '[data-tutorial="add-imposto-btn"]',
      position: 'bottom'
    },
    {
      id: 'impostos-list',
      title: '📋 Lista de Impostos',
      description: 'Veja todos os seus impostos e taxas. Marque como pago quando quitar.',
      selector: '[data-tutorial="impostos-list"]',
      position: 'top'
    }
  ],
  metas: [
    {
      id: 'add-meta',
      title: '🎯 Criar Meta',
      description: 'Defina metas financeiras para acompanhar seu progresso.',
      selector: '[data-tutorial="add-meta-btn"]',
      position: 'bottom'
    },
    {
      id: 'metas-grid',
      title: '📊 Suas Metas',
      description: 'Acompanhe o progresso das suas metas financeiras.',
      selector: '[data-tutorial="metas-grid"]',
      position: 'top'
    }
  ],
  relatorios: [
    {
      id: 'period-selector',
      title: '📅 Selecionar Período',
      description: 'Escolha o período para gerar relatórios personalizados.',
      selector: '[data-tutorial="period-selector"]',
      position: 'bottom'
    },
    {
      id: 'charts',
      title: '📈 Gráficos e Análises',
      description: 'Visualize seus dados em gráficos interativos.',
      selector: '[data-tutorial="charts"]',
      position: 'top'
    }
  ],
  equipe: [
    {
      id: 'add-membro',
      title: '➕ Adicionar Membro',
      description: 'Adicione membros da equipe e gerencie salários.',
      selector: '[data-tutorial="add-membro-btn"]',
      position: 'bottom'
    },
    {
      id: 'equipe-table',
      title: '👥 Equipe',
      description: 'Gerencie os membros da sua equipe e acompanhe custos com pessoal.',
      selector: '[data-tutorial="equipe-table"]',
      position: 'top'
    }
  ],
  fechamento: [
    {
      id: 'select-period',
      title: '📅 Selecionar Período',
      description: 'Escolha o período para fazer o fechamento do caixa.',
      selector: '[data-tutorial="fechamento-period"]',
      position: 'bottom'
    },
    {
      id: 'summary',
      title: '💼 Resumo do Fechamento',
      description: 'Veja o resumo completo do período selecionado.',
      selector: '[data-tutorial="fechamento-summary"]',
      position: 'top'
    }
  ]
};

// Função auxiliar para obter tutorial adaptado ao contexto do usuário
export function getTutorialSteps(
  section: string, 
  userType?: 'pessoal' | 'empresarial'
): TutorialStep[] {
  const baseSteps = TUTORIAL_STEPS[section] || [];
  
  // Adaptar textos baseado no tipo de usuário
  return baseSteps.map(step => {
    if (userType === 'empresarial') {
      return {
        ...step,
        description: step.description
          .replace('suas receitas', 'as receitas da empresa')
          .replace('suas despesas', 'as despesas da empresa')
          .replace('suas finanças', 'as finanças da empresa')
          .replace('seu dashboard', 'o dashboard da empresa')
      };
    }
    return step;
  });
}
