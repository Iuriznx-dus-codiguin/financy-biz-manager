import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import financyLogoLight from '@/assets/financy-logo-light.png';
import iconLogoLight from '@/assets/financy-icon-light.png';
import financyLogoDark from '@/assets/financy-logo-new-dark.png';
import iconLogoDark from '@/assets/financy-icon-dark.png';
import {
  Layout, TrendingUp, TrendingDown, Receipt, PieChart, Settings, HelpCircle,
  CreditCard, Calculator, Users, Sun, Moon, Target, Bot, Folder
} from 'lucide-react';
import { MENU_ITEMS, getRouteForSection, getSectionForRoute, isSectionAllowedWhenBlocked } from '@/constants/routes';
import { useDashboard } from '@/hooks/useDashboard';
import { useTheme } from '@/hooks/useTheme';
import { useUserContext } from '@/hooks/useUserContext';
import { Button } from '@/components/ui/button';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';

// Icon mapping - mantém associação id → ícone sem duplicar labels
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'painel': Layout, 'receitas': TrendingUp, 'despesas': TrendingDown,
  'categorias': Folder, 'impostos': Receipt, 'equipe': Users,
  'metas': Target, 'relatorios': PieChart, 'fechamento': Calculator,
  'agentes-ia': Bot, 'assinatura': CreditCard, 'configuracoes': Settings,
  'ajuda': HelpCircle,
};

interface AppSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  disabled?: boolean;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ activeSection, setActiveSection, disabled = false }) => {
  const { state, setOpen } = useSidebar();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { currentDashboard } = useDashboard();
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const isCollapsed = state === 'collapsed';
  const shouldShowExpanded = isCollapsed && isHovered;
  
  const currentSection = getSectionForRoute(location.pathname);
  const isDarkTheme = resolvedTheme === 'dark';
  const financyLogo = isDarkTheme ? financyLogoDark : financyLogoLight;
  const iconLogo = isDarkTheme ? iconLogoDark : iconLogoLight;
  const currentLogo = shouldShowExpanded ? financyLogo : (isCollapsed ? iconLogo : financyLogo);

  const menuItems = MENU_ITEMS.filter(item => {
    if (!currentDashboard) return true;
    if (item.businessOnly && currentDashboard.type === 'personal') return false;
    return true;
  });

  const handleThemeToggle = () => toggleTheme();
  const handleMouseEnter = () => { setIsHovered(true); setOpen(true); };
  const handleMouseLeave = () => { setIsHovered(false); setTimeout(() => setOpen(false), 100); };

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
          <SidebarGroupLabel className="font-display text-[11px] uppercase tracking-wider text-muted-foreground/70">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = ICON_MAP[item.id] || Layout;
                const route = getRouteForSection(item.id);
                const isActive = currentSection === item.id;
                const isAllowed = !disabled || isSectionAllowedWhenBlocked(item.id);
                
                return (
                  <SidebarMenuItem key={item.id} data-tutorial={`nav-${item.id}`}>
                    <SidebarMenuButton
                      onClick={() => {
                        if (isAllowed) {
                          navigate(route);
                          setActiveSection(item.id);
                        }
                      }}
                      tooltip={isCollapsed && !shouldShowExpanded ? item.label : undefined}
                      isActive={isActive}
                      disabled={!isAllowed}
                      className={!isAllowed ? 'opacity-50 cursor-not-allowed' : ''}
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
          {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {(shouldShowExpanded || !isCollapsed) && (
            <span className="ml-2 transition-opacity duration-300">
              {isDarkTheme ? 'Modo Claro' : 'Modo Escuro'}
            </span>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
