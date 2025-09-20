import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  FolderOpen, 
  Calculator, 
  Users, 
  Target, 
  FileText, 
  Lock 
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
      'Visualize um resumo completo das suas finanças',
      'Acompanhe receitas e despesas em tempo real',
      'Use os gráficos para análises visuais',
      'Personalize widgets conforme sua necessidade'
    ]
  },
  receitas: {
    title: 'Gestão de Receitas',
    icon: TrendingUp,
    color: 'bg-green-500',
    steps: [
      'Registre todas as suas fontes de renda',
      'Categorize receitas por tipo ou cliente',
      'Configure receitas recorrentes para automatizar',
      'Acompanhe o crescimento mensal'
    ]
  },
  despesas: {
    title: 'Controle de Despesas',
    icon: TrendingDown,
    color: 'bg-red-500',
    steps: [
      'Registre gastos detalhadamente',
      'Use categorias para organizar despesas',
      'Defina limites por categoria',
      'Monitore tendências de gastos'
    ]
  },
  categorias: {
    title: 'Sistema de Categorias',
    icon: FolderOpen,
    color: 'bg-blue-500',
    steps: [
      'Crie categorias personalizadas',
      'Organize receitas e despesas',
      'Defina cores para identificação visual',
      'Configure subcategorias para mais detalhes'
    ]
  },
  impostos: {
    title: 'Impostos e Taxas',
    icon: Calculator,
    color: 'bg-orange-500',
    steps: [
      'Configure impostos aplicáveis',
      'Calcule automaticamente tributações',
      'Gere relatórios para declarações',
      'Acompanhe obrigações fiscais'
    ]
  },
  equipe: {
    title: 'Gestão de Equipe',
    icon: Users,
    color: 'bg-purple-500',
    steps: [
      'Convide membros para sua organização',
      'Defina permissões por usuário',
      'Acompanhe atividades da equipe',
      'Gerencie acessos e responsabilidades'
    ]
  },
  metas: {
    title: 'Objetivos Financeiros',
    icon: Target,
    color: 'bg-pink-500',
    steps: [
      'Defina metas financeiras claras',
      'Acompanhe progresso em tempo real',
      'Receba alertas de marcos importantes',
      'Ajuste objetivos conforme necessário'
    ]
  },
  relatorios: {
    title: 'Relatórios Avançados',
    icon: FileText,
    color: 'bg-indigo-500',
    steps: [
      'Gere relatórios personalizados',
      'Exporte dados em diversos formatos',
      'Configure relatórios automáticos',
      'Analise tendências e insights'
    ]
  },
  fechamento: {
    title: 'Fechamento de Caixa',
    icon: Lock,
    color: 'bg-slate-600',
    steps: [
      'Realize fechamentos mensais',
      'Confira saldos e movimentações',
      'Gere demonstrativos de resultados',
      'Archive períodos finalizados'
    ]
  }
};

export const SectionTutorial = ({ section, isOpen, onClose }: SectionTutorialProps) => {
  const config = TUTORIAL_CONFIG[section as keyof typeof TUTORIAL_CONFIG];
  
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${config.color} text-white`}>
              <Icon size={24} />
            </div>
            <div>
              <DialogTitle>{config.title}</DialogTitle>
              <Badge variant="secondary" className="mt-1">
                Tutorial
              </Badge>
            </div>
          </div>
        </DialogHeader>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Aqui estão as principais funcionalidades desta seção:
              </p>
              
              {config.steps.map((step, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <p className="text-sm">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose}>
            Entendi, vamos começar!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};