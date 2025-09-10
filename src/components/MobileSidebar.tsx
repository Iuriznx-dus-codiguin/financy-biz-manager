import React from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useTheme } from '@/hooks/useTheme';
import { useDashboard } from '@/hooks/useDashboard';
import { NotificationCenter } from '@/components/NotificationCenter';

const financyLogo = '/lovable-uploads/11a67f5c-242f-4740-b1f7-1ed6c6895f51.png';

const allMenuItems = [
  { id: 'painel', label: 'Painel', businessOnly: false },
  { id: 'receitas', label: 'Receitas', businessOnly: false },
  { id: 'despesas', label: 'Despesas', businessOnly: false },
  { id: 'categorias', label: 'Categorias', businessOnly: false },
  { id: 'impostos', label: 'Impostos e Taxas', businessOnly: false },
  { id: 'equipe', label: 'Equipe', businessOnly: true },
  { id: 'metas', label: 'Objetivos', businessOnly: false },
  { id: 'relatorios', label: 'Relatórios', businessOnly: false },
  { id: 'fechamento', label: 'Fechamento de Caixa', businessOnly: true },
  { id: 'agentes-ia', label: 'Agentes de IA', businessOnly: false },
  { id: 'assinatura', label: 'Assinatura', businessOnly: false },
  { id: 'configuracoes', label: 'Configurações', businessOnly: false },
  { id: 'ajuda', label: 'Ajuda e Suporte', businessOnly: false }
];

interface MobileSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ activeSection, setActiveSection }) => {
  const { theme, setTheme } = useTheme();
  const { currentDashboard } = useDashboard();
  const [open, setOpen] = React.useState(false);

  // Filter menu items based on dashboard type
  const menuItems = allMenuItems.filter(item => {
    if (!currentDashboard) return true;
    if (item.businessOnly && currentDashboard.type === 'personal') return false;
    return true;
  });

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const handleMenuClick = (section: string) => {
    setActiveSection(section);
    setOpen(false);
  };

  return (
    <div className="lg:hidden flex items-center justify-between p-4 bg-background border-b" data-tour="mobile-header">
      <div className="flex items-center" data-tour="mobile-logo">
        <img 
          src={financyLogo}
          alt="Financy" 
          className="h-8 w-auto object-contain"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <NotificationCenter />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleThemeToggle}
          className="p-2"
          data-tour="mobile-theme-toggle"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="p-2" data-tour="mobile-menu-trigger">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle className="text-left">Menu</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-2" data-tour="mobile-menu-items">
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeSection === item.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handleMenuClick(item.id)}
                  data-tour={`mobile-menu-${item.id}`}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};