import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, Sun, Moon, Layout, TrendingUp, TrendingDown, Receipt,
  PieChart, Settings, HelpCircle, CreditCard, Calculator, Users, Target, Bot, Folder, X, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/hooks/useTheme';
import { useDashboard } from '@/hooks/useDashboard';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { MENU_ITEMS, getRouteForSection, getSectionForRoute, isSectionAllowedWhenBlocked } from '@/constants/routes';

import financyLogoLight from '@/assets/financy-logo-light.png';
import financyLogoDark from '@/assets/financy-logo-new-dark.png';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'painel': Layout, 'receitas': TrendingUp, 'despesas': TrendingDown,
  'categorias': Folder, 'impostos': Receipt, 'equipe': Users,
  'metas': Target, 'relatorios': PieChart, 'fechamento': Calculator,
  'agentes-ia': Bot, 'assinatura': CreditCard, 'configuracoes': Settings,
  'ajuda': HelpCircle,
};

// Agrupamento semântico
const MENU_GROUPS = [
  { label: 'Principal', ids: ['painel'] },
  { label: 'Financeiro', ids: ['receitas', 'despesas', 'categorias', 'impostos'] },
  { label: 'Gestão', ids: ['equipe', 'metas', 'relatorios', 'fechamento'] },
  { label: 'Ferramentas', ids: ['agentes-ia'] },
  { label: 'Conta', ids: ['assinatura', 'configuracoes', 'ajuda'] },
];

interface MobileSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  disabled?: boolean;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ activeSection, setActiveSection, disabled = false }) => {
  const { theme, setTheme } = useTheme();
  const { currentDashboard } = useDashboard();
  const { subscriptionTier } = useSubscription();
  const { user, signOut } = useAuth();
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const isDarkTheme = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const financyLogo = isDarkTheme ? financyLogoDark : financyLogoLight;
  const currentSection = getSectionForRoute(location.pathname);

  const visibleIds = new Set(
    MENU_ITEMS
      .filter(item => {
        if (!currentDashboard) return true;
        if (item.businessOnly && currentDashboard.type === 'personal') return false;
        return true;
      })
      .map(item => item.id)
  );

  const handleThemeToggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const handleMenuClick = (section: string) => {
    if (disabled && !isSectionAllowedWhenBlocked(section)) return;
    navigate(getRouteForSection(section));
    setActiveSection(section);
    setOpen(false);
  };

  const userEmail = user?.email || '';
  const userName = user?.user_metadata?.full_name || userEmail.split('@')[0] || 'Usuário';

  return (
    <div className="lg:hidden flex items-center justify-between py-2 px-3 bg-background border-b">
      <div className="flex items-center max-w-[180px]">
        <img src={financyLogo} alt="Financy" className="h-14 w-full object-contain object-left" />
      </div>
      
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={handleThemeToggle} className="h-10 w-10">
          {isDarkTheme ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[340px] flex flex-col p-0 gap-0 [&>button]:hidden">
            {/* Header com perfil */}
            <div className="px-4 pt-5 pb-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 shrink-0 capitalize">
                    {subscriptionTier || 'free'}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Dashboard type indicator */}
              {currentDashboard && (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50">
                  <span className="text-[11px] text-muted-foreground">Dashboard:</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {currentDashboard.type === 'personal' ? '👤 Pessoal' : '🏢 Empresarial'}
                  </Badge>
                  <span className="text-[11px] text-foreground truncate flex-1">{currentDashboard.name}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Menu agrupado */}
            <div className="flex-1 overflow-y-auto py-2">
              {MENU_GROUPS.map((group) => {
                const groupItems = MENU_ITEMS.filter(item => group.ids.includes(item.id) && visibleIds.has(item.id));
                if (groupItems.length === 0) return null;

                return (
                  <div key={group.label} className="px-3 mb-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                      {group.label}
                    </p>
                    {groupItems.map((item) => {
                      const Icon = ICON_MAP[item.id] || Layout;
                      const isActive = currentSection === item.id;
                      const isAllowed = !disabled || isSectionAllowedWhenBlocked(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleMenuClick(item.id)}
                          disabled={!isAllowed}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                            transition-all duration-150 active:scale-[0.98]
                            ${isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground hover:bg-accent'
                            }
                            ${!isAllowed ? 'opacity-30 pointer-events-none' : ''}
                          `}
                        >
                          <div className={`
                            flex items-center justify-center h-8 w-8 rounded-md shrink-0
                            ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                          `}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span>{item.label}</span>
                          {isActive && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Footer com tema e logout */}
            <Separator />
            <div className="px-3 py-3 space-y-1">
              <button
                onClick={handleThemeToggle}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-muted">
                  {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </div>
                <span>{isDarkTheme ? 'Modo Claro' : 'Modo Escuro'}</span>
              </button>
              <button
                onClick={() => { setOpen(false); signOut(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-destructive/10">
                  <LogOut className="h-4 w-4" />
                </div>
                <span>Sair</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
