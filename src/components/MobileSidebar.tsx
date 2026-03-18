import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, Sun, Moon, Layout, TrendingUp, TrendingDown, Receipt,
  PieChart, Settings, HelpCircle, CreditCard, Calculator, Users, Target, Bot, Folder
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useTheme } from '@/hooks/useTheme';
import { useDashboard } from '@/hooks/useDashboard';
import { MENU_ITEMS, getRouteForSection, getSectionForRoute, isSectionAllowedWhenBlocked } from '@/constants/routes';

import financyLogoLight from '@/assets/financy-logo-light.png';
import financyLogoDark from '@/assets/financy-logo-dark.png';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'painel': Layout, 'receitas': TrendingUp, 'despesas': TrendingDown,
  'categorias': Folder, 'impostos': Receipt, 'equipe': Users,
  'metas': Target, 'relatorios': PieChart, 'fechamento': Calculator,
  'agentes-ia': Bot, 'assinatura': CreditCard, 'configuracoes': Settings,
  'ajuda': HelpCircle,
};

interface MobileSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  disabled?: boolean;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ activeSection, setActiveSection, disabled = false }) => {
  const { theme, setTheme } = useTheme();
  const { currentDashboard } = useDashboard();
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const isDarkTheme = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const financyLogo = isDarkTheme ? financyLogoDark : financyLogoLight;
  const currentSection = getSectionForRoute(location.pathname);

  const menuItems = MENU_ITEMS.filter(item => {
    if (!currentDashboard) return true;
    if (item.businessOnly && currentDashboard.type === 'personal') return false;
    return true;
  });

  const handleThemeToggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const handleMenuClick = (section: string) => {
    if (disabled && !isSectionAllowedWhenBlocked(section)) return;
    navigate(getRouteForSection(section));
    setActiveSection(section);
    setOpen(false);
  };

  return (
    <div className="lg:hidden flex items-center justify-between py-2 px-3 bg-background border-b">
      <div className="flex items-center max-w-[200px]">
        <img src={financyLogo} alt="Financy" className="h-16 w-full object-contain object-left" />
      </div>
      
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={handleThemeToggle} className="h-10 w-10">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] sm:w-[340px] flex flex-col p-0">
            <SheetHeader className="px-4 pt-4 pb-2">
              <SheetTitle className="text-left text-base">Menu</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <div className="space-y-0.5">
                {menuItems.map((item) => {
                  const Icon = ICON_MAP[item.id] || Layout;
                  const isActive = currentSection === item.id;
                  const isAllowed = !disabled || isSectionAllowedWhenBlocked(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMenuClick(item.id)}
                      disabled={!isAllowed}
                      className={`
                        w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium
                        transition-colors duration-150
                        ${isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-accent'
                        }
                        ${!isAllowed ? 'opacity-40 pointer-events-none' : ''}
                      `}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Theme toggle at bottom of drawer */}
            <div className="border-t border-border px-3 py-3">
              <button
                onClick={handleThemeToggle}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
