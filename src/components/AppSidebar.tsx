
import React from 'react';
import fIcon from '@/assets/f-icon.png';
import financyLogo from '@/assets/financy-logo.png';
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
  Moon,
  Target,
  Bot
} from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import { useTheme } from '@/hooks/useTheme';
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
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

const allMenuItems = [
  { id: 'painel', label: 'Painel', icon: Layout, businessOnly: false },
  { id: 'receitas', label: 'Receitas', icon: TrendingUp, businessOnly: false },
  { id: 'despesas', label: 'Despesas', icon: TrendingDown, businessOnly: false },
  { id: 'impostos', label: 'Impostos e Taxas', icon: Receipt, businessOnly: false },
  { id: 'equipe', label: 'Equipe', icon: Users, businessOnly: true },
  { id: 'metas', label: 'Objetivos', icon: Target, businessOnly: false },
  { id: 'relatorios', label: 'Relatórios', icon: PieChart, businessOnly: false },
  { id: 'fechamento', label: 'Fechamento de Caixa', icon: Calculator, businessOnly: true },
  { id: 'agentes-ia', label: 'Agentes de IA', icon: Bot, businessOnly: false },
  { id: 'assinatura', label: 'Assinatura', icon: CreditCard, businessOnly: false },
  { id: 'configuracoes', label: 'Configurações', icon: Settings, businessOnly: false },
  { id: 'ajuda', label: 'Ajuda e Suporte', icon: HelpCircle, businessOnly: false }
];

interface AppSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ activeSection, setActiveSection }) => {
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { currentDashboard } = useDashboard();
  const isCollapsed = state === 'collapsed';

  // Filter menu items based on dashboard type
  const menuItems = allMenuItems.filter(item => {
    if (!currentDashboard) return true;
    if (item.businessOnly && currentDashboard.type === 'personal') return false;
    return true;
  });

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-center p-4">
          {isCollapsed ? (
            <div className="w-8 h-8 flex items-center justify-center">
              <img 
                src={fIcon}
                alt="F" 
                className="w-6 h-6 object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <img 
                src={financyLogo}
                alt="Financy" 
                className="h-8 object-contain"
              />
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
                
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => setActiveSection(item.id)}
                      tooltip={isCollapsed ? item.label : undefined}
                      isActive={activeSection === item.id}
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
