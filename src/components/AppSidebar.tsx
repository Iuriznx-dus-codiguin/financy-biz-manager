import React, { useState } from 'react';
// Logos for light theme
import financyLogoLight from '@/assets/financy-logo-light.png';
import iconLogoLight from '@/assets/financy-icon-light.png';
// Logos for dark theme
import financyLogoDark from '@/assets/financy-logo-dark.png';
import iconLogoDark from '@/assets/financy-icon-dark.png';
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
  PinOff,
  Folder
} from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import { useTheme } from '@/hooks/useTheme';
import { useUserContext } from '@/hooks/useUserContext';
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
  { id: 'categorias', label: 'Categorias', icon: Folder, businessOnly: false },
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
  disabled?: boolean;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ activeSection, setActiveSection, disabled = false }) => {
  const { state, setOpen } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { currentDashboard } = useDashboard();
  const { userType } = useUserContext();
  const [isHovered, setIsHovered] = useState(false);
  
  const isCollapsed = state === 'collapsed';
  const shouldShowExpanded = isCollapsed && isHovered;
  
  // Selecionar logos baseado no tema
  const isDarkTheme = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const financyLogo = isDarkTheme ? financyLogoDark : financyLogoLight;
  const iconLogo = isDarkTheme ? iconLogoDark : iconLogoLight;
  
  const currentLogo = shouldShowExpanded ? financyLogo : (isCollapsed ? iconLogo : financyLogo);

  // Filtrar menu baseado APENAS no tipo do dashboard atual
  const menuItems = allMenuItems.filter(item => {
    if (!currentDashboard) return true;
    
    // Seções apenas para empresarial - ocultar se dashboard atual é personal
    if (item.businessOnly && currentDashboard.type === 'personal') {
      return false;
    }
    
    return true;
  });

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Pequeno delay para garantir transição suave
    setTimeout(() => {
      setOpen(false);
    }, 100);
  };

  return (
    <Sidebar 
      collapsible="icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="lg:flex hidden transition-all duration-300 ease-in-out"
      style={{
        width: shouldShowExpanded ? 'var(--sidebar-width)' : isCollapsed ? 'var(--sidebar-width-icon)' : 'var(--sidebar-width)'
      }}
    >
      <SidebarHeader>
        <div className="flex items-center justify-center py-2 transition-all duration-300">
          <div className="flex items-center justify-center w-full">
            <img 
              src={currentLogo}
              alt="Financy" 
              className={`object-contain transition-all duration-300 ${shouldShowExpanded || !isCollapsed ? 'h-24 w-full px-2' : 'h-14 w-14'}`}
            />
          </div>
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
                      onClick={() => {
                        const allowedWhenDisabled = ['assinatura', 'configuracoes', 'ajuda'];
                        if (!disabled || allowedWhenDisabled.includes(item.id)) {
                          setActiveSection(item.id);
                        }
                      }}
                      tooltip={isCollapsed && !shouldShowExpanded ? item.label : undefined}
                      isActive={activeSection === item.id}
                      disabled={disabled && !['assinatura', 'configuracoes', 'ajuda'].includes(item.id)}
                      className={disabled && !['assinatura', 'configuracoes', 'ajuda'].includes(item.id) ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="transition-opacity duration-300">{item.label}</span>
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
          className="w-full transition-all duration-300"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {(shouldShowExpanded || !isCollapsed) && (
            <span className="ml-2 transition-opacity duration-300">
              {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            </span>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
