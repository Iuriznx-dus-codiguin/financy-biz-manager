
import React, { useState } from 'react';
// Using uploaded logos
const financyLogo = '/lovable-uploads/11a67f5c-242f-4740-b1f7-1ed6c6895f51.png';
const iconLogo = '/lovable-uploads/29534308-8b72-41b6-ae6e-ab319484e584.png';
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
  Bot,
  Pin,
  PinOff
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
  { id: 'ajuda', label: 'Ajuda e Suporte', icon: HelpCircle, businessOnly: false },
  { id: 'desenvolvedor', label: 'Sou um Desenvolvedor', icon: Settings, businessOnly: false }
];

interface AppSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ activeSection, setActiveSection }) => {
  const { state, setOpen, open } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { currentDashboard } = useDashboard();
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const isCollapsed = state === 'collapsed';
  const shouldExpand = isCollapsed && isHovered && !isPinned;
  const currentLogo = isCollapsed && !shouldExpand ? iconLogo : financyLogo;

  // Filter menu items based on dashboard type
  const menuItems = allMenuItems.filter(item => {
    if (!currentDashboard) return true;
    if (item.businessOnly && currentDashboard.type === 'personal') return false;
    return true;
  });

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handlePinToggle = () => {
    if (isPinned) {
      setIsPinned(false);
      setOpen(false);
    } else {
      setIsPinned(true);
      setOpen(true);
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (isCollapsed && !isPinned) {
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Delay mais curto para fechamento mais responsivo
    setTimeout(() => {
      if (isCollapsed && !isPinned) {
        setOpen(false);
      }
    }, 300);
  };

  return (
    <Sidebar 
      collapsible="icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarHeader>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center justify-center flex-1">
            {isCollapsed && !shouldExpand ? (
              <div className="w-10 h-10 flex items-center justify-center">
                <img 
                  src={currentLogo}
                  alt="Financy" 
                  className="w-8 h-8 object-contain"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center w-full h-14 px-2">
                <img 
                  src={currentLogo}
                  alt="Financy" 
                  className="h-10 w-full object-contain"
                />
              </div>
            )}
          </div>
          {(!isCollapsed || shouldExpand) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePinToggle}
              className="h-6 w-6 p-0 hover:bg-accent"
              title={isPinned ? "Desafixar sidebar" : "Fixar sidebar"}
            >
              {isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
            </Button>
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
                      tooltip={isCollapsed && !shouldExpand ? item.label : undefined}
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
          {(!isCollapsed || shouldExpand) && (
            <span className="ml-2">
              {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            </span>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
