
import React from 'react';
import { 
  Layout, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  PieChart, 
  Settings, 
  HelpCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isDark: boolean;
  onThemeToggle: () => void;
}

const menuItems = [
  { id: 'painel', label: 'Painel', icon: Layout },
  { id: 'receitas', label: 'Receitas', icon: TrendingUp },
  { id: 'despesas', label: 'Despesas', icon: TrendingDown },
  { id: 'impostos', label: 'Impostos e Taxas', icon: Receipt },
  { id: 'relatorios', label: 'Relatórios', icon: PieChart },
  { id: 'fechamento', label: 'Fechamento de Caixa', icon: Receipt },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
  { id: 'ajuda', label: 'Ajuda e Suporte', icon: HelpCircle }
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeSection, 
  onSectionChange, 
  isDark, 
  onThemeToggle 
}) => {
  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-card border-r border-border shadow-lg z-50">
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">F</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Financy</h1>
              <p className="text-sm text-muted-foreground">Gestão Financeira</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start h-12 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
                onClick={() => onSectionChange(item.id)}
              >
                <Icon className="mr-3 h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={onThemeToggle}
          >
            {isDark ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
          </Button>
        </div>
      </div>
    </aside>
  );
};
