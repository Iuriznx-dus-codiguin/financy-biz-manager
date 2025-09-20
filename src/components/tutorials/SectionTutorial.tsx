import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  FolderOpen, 
  Calculator, 
  Users, 
  Target, 
  FileText, 
  Lock,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';

interface SectionTutorialProps {
  section: string;
  isOpen: boolean;
  onClose: () => void;
}

const TUTORIAL_CONFIG = {
  painel: {
    title: 'Bem-vindo ao Painel Principal',
    icon: BarChart3,
    color: 'bg-primary',
    steps: [
      {
        title: 'Visão Geral',
        description: 'Visualize um resumo completo das suas finanças em um só lugar'
      },
      {
        title: 'Acompanhamento Real',
        description: 'Monitore receitas e despesas em tempo real com atualizações automáticas'
      },
      {
        title: 'Análises Visuais',
        description: 'Use gráficos interativos para análises detalhadas dos seus dados'
      },
      {
        title: 'Personalização',
        description: 'Personalize widgets e organize o painel conforme sua necessidade'
      }
    ]
  },
  receitas: {
    title: 'Gestão de Receitas',
    icon: TrendingUp,
    color: 'bg-green-500',
    steps: [
      {
        title: 'Registrar Receitas',
        description: 'Registre todas as suas fontes de renda de forma simples e organizada'
      },
      {
        title: 'Categorização',
        description: 'Organize receitas por tipo, cliente ou projeto para melhor controle'
      },
      {
        title: 'Receitas Recorrentes',
        description: 'Configure receitas que se repetem automaticamente todo mês'
      },
      {
        title: 'Análise de Crescimento',
        description: 'Acompanhe a evolução das suas receitas com relatórios mensais'
      }
    ]
  },
  despesas: {
    title: 'Controle de Despesas',
    icon: TrendingDown,
    color: 'bg-red-500',
    steps: [
      {
        title: 'Registrar Gastos',
        description: 'Registre todas as suas despesas com detalhes completos'
      },
      {
        title: 'Organização por Categorias',
        description: 'Use categorias para organizar e entender melhor seus gastos'
      },
      {
        title: 'Controle de Limites',
        description: 'Defina limites de gastos por categoria e receba alertas'
      },
      {
        title: 'Análise de Tendências',
        description: 'Monitore padrões de gastos e identifique oportunidades de economia'
      }
    ]
  },
  categorias: {
    title: 'Sistema de Categorias',
    icon: FolderOpen,
    color: 'bg-blue-500',
    steps: [
      {
        title: 'Criar Categorias',
        description: 'Crie categorias personalizadas para organizar suas transações'
      },
      {
        title: 'Organização Inteligente',
        description: 'Organize receitas e despesas de forma lógica e eficiente'
      },
      {
        title: 'Identificação Visual',
        description: 'Defina cores únicas para cada categoria para identificação rápida'
      },
      {
        title: 'Subcategorias',
        description: 'Configure subcategorias para um controle ainda mais detalhado'
      }
    ]
  },
  impostos: {
    title: 'Impostos e Taxas',
    icon: Calculator,
    color: 'bg-orange-500',
    steps: [
      {
        title: 'Configurar Impostos',
        description: 'Configure todos os impostos aplicáveis ao seu negócio'
      },
      {
        title: 'Cálculo Automático',
        description: 'O sistema calcula automaticamente as tributações devidas'
      },
      {
        title: 'Relatórios Fiscais',
        description: 'Gere relatórios prontos para suas declarações e obrigações'
      },
      {
        title: 'Controle de Obrigações',
        description: 'Acompanhe prazos e valores de todas as obrigações fiscais'
      }
    ]
  },
  equipe: {
    title: 'Gestão de Equipe',
    icon: Users,
    color: 'bg-purple-500',
    steps: [
      {
        title: 'Convidar Membros',
        description: 'Convide colaboradores para acessar sua organização financeira'
      },
      {
        title: 'Definir Permissões',
        description: 'Configure diferentes níveis de acesso para cada membro'
      },
      {
        title: 'Monitorar Atividades',
        description: 'Acompanhe todas as atividades realizadas pela equipe'
      },
      {
        title: 'Gerenciar Acessos',
        description: 'Controle responsabilidades e mantenha a segurança dos dados'
      }
    ]
  },
  metas: {
    title: 'Objetivos Financeiros',
    icon: Target,
    color: 'bg-pink-500',
    steps: [
      {
        title: 'Definir Metas',
        description: 'Estabeleça objetivos financeiros claros e mensuráveis'
      },
      {
        title: 'Acompanhar Progresso',
        description: 'Monitore o progresso das suas metas em tempo real'
      },
      {
        title: 'Alertas Importantes',
        description: 'Receba notificações quando atingir marcos importantes'
      },
      {
        title: 'Ajustar Objetivos',
        description: 'Modifique suas metas conforme as mudanças dos seus planos'
      }
    ]
  },
  relatorios: {
    title: 'Relatórios Avançados',
    icon: FileText,
    color: 'bg-indigo-500',
    steps: [
      {
        title: 'Relatórios Personalizados',
        description: 'Crie relatórios sob medida para suas necessidades específicas'
      },
      {
        title: 'Exportar Dados',
        description: 'Exporte informações em PDF, Excel e outros formatos'
      },
      {
        title: 'Relatórios Automáticos',
        description: 'Configure relatórios para serem gerados automaticamente'
      },
      {
        title: 'Insights Avançados',
        description: 'Analise tendências e obtenha insights valiosos dos seus dados'
      }
    ]
  },
  fechamento: {
    title: 'Fechamento de Caixa',
    icon: Lock,
    color: 'bg-slate-600',
    steps: [
      {
        title: 'Fechamento Mensal',
        description: 'Realize fechamentos organizados ao final de cada período'
      },
      {
        title: 'Conferir Saldos',
        description: 'Verifique todos os saldos e movimentações do período'
      },
      {
        title: 'Demonstrativos',
        description: 'Gere demonstrativos de resultados profissionais'
      },
      {
        title: 'Arquivo de Períodos',
        description: 'Mantenha um histórico organizado de todos os fechamentos'
      }
    ]
  }
};

export const SectionTutorial = ({ section, isOpen, onClose }: SectionTutorialProps) => {
  const config = TUTORIAL_CONFIG[section as keyof typeof TUTORIAL_CONFIG];
  const [currentStep, setCurrentStep] = useState(0);
  
  if (!config) return null;

  const Icon = config.icon;
  const totalSteps = config.steps.length;
  const currentStepData = config.steps[currentStep];

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.color} text-white`}>
                <Icon size={24} />
              </div>
              <div>
                <DialogTitle>{config.title}</DialogTitle>
                <DialogDescription>
                  Tutorial interativo para aprender a usar esta seção da plataforma.
                </DialogDescription>
                <Badge variant="secondary" className="mt-1">
                  Tutorial de Onboarding
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-8 w-8"
            >
              <X size={16} />
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Etapa {currentStep + 1} de {totalSteps}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
              >
                Pular tutorial
              </Button>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-lg font-bold mx-auto">
                {currentStep + 1}
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{currentStepData.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {currentStepData.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center pt-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft size={16} />
            Anterior
          </Button>
          
          <Button
            onClick={handleNext}
            className="flex items-center gap-2"
          >
            {currentStep === totalSteps - 1 ? 'Finalizar' : 'Próximo'}
            {currentStep !== totalSteps - 1 && <ChevronRight size={16} />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};