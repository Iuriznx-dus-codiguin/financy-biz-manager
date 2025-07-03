
import React from 'react';
import { 
  Layout, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  PieChart, 
  Settings, 
  HelpCircle,
  CreditCard,
  Calculator,
  Users,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useTheme } from '@/hooks/useTheme';

interface AppSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  { id: 'painel', label: 'Painel', icon: Layout },
  { id: 'receitas', label: 'Receitas', icon: TrendingUp },
  { id: 'despesas', label: 'Despesas', icon: TrendingDown },
  { id: 'impostos', label: 'Impostos e Taxas', icon: Receipt },
  { id: 'equipe', label: 'Equipe', icon: Users },
  { id: 'relatorios', label: 'Relatórios', icon: PieChart },
  { id: 'fechamento', label: 'Fechamento de Caixa', icon: Calculator },
  { id: 'assinatura', label: 'Assinatura', icon: CreditCard },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
  { id: 'ajuda', label: 'Ajuda e Suporte', icon: HelpCircle }
];

export const AppSidebar: React.FC<AppSidebarProps> = ({ 
  activeSection, 
  onSectionChange
}) => {
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const isCollapsed = state === 'collapsed';

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSectionClick = (sectionId: string) => {
    console.log('Sidebar: Navegando para seção', sectionId);
    
    // Atualiza o estado ativo
    onSectionChange(sectionId);
    
    // Faz scroll suave até a seção
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    } else {
      console.warn(`Elemento com ID ${sectionId} não encontrado`);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center space-x-3 p-2">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">F</span>
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-foreground">Financy</h1>
              <p className="text-xs text-muted-foreground">Gestão Financeira</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={(e) => {
                        e.preventDefault();
                        handleSectionClick(item.id);
                      }}
                      isActive={isActive}
                      tooltip={isCollapsed ? item.label : undefined}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Button
          variant="outline"
          onClick={handleThemeToggle}
          className="w-full"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!isCollapsed && (
            <span className="ml-2">
              {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            </span>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
