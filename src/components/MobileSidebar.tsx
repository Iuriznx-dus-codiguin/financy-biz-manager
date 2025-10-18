import React from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useTheme } from '@/hooks/useTheme';
import { useDashboard } from '@/hooks/useDashboard';
import { useUserContext } from '@/hooks/useUserContext';

// Logos for light theme
import financyLogoLight from '@/assets/financy-logo-light.png';
// Logos for dark theme
import financyLogoDark from '@/assets/financy-logo-dark.png';

const allMenuItems = [
  { id: 'painel', label: 'Painel', businessOnly: false },
  { id: 'receitas', label: 'Receitas', businessOnly: false },
  { id: 'despesas', label: 'Despesas', businessOnly: false },
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
  disabled?: boolean;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ activeSection, setActiveSection, disabled = false }) => {
  const { theme, setTheme } = useTheme();
  const { currentDashboard } = useDashboard();
  const { userType } = useUserContext();
  const [open, setOpen] = React.useState(false);
  
  // Selecionar logo baseado no tema
  const isDarkTheme = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const financyLogo = isDarkTheme ? financyLogoDark : financyLogoLight;

  // Filtrar menu baseado no tipo de usuário E tipo de dashboard
  const menuItems = allMenuItems.filter(item => {
    if (!currentDashboard) return true;
    
    // Seções apenas para empresarial
    if (item.businessOnly) {
      // Ocultar se usuário é pessoal OU dashboard atual é personal
      if (userType === 'pessoal' || currentDashboard.type === 'personal') {
        return false;
      }
    }
    
    return true;
  });

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const handleMenuClick = (section: string) => {
    if (disabled && section !== 'assinatura') {
      return; // Não permite navegação se desabilitado, exceto para assinatura
    }
    setActiveSection(section);
    setOpen(false);
  };

  return (
    <div className="lg:hidden flex items-center justify-between py-1 px-2 bg-background border-b">
      <div className="flex items-center w-full max-w-[320px]">
        <img 
          src={financyLogo}
          alt="Financy" 
          className="h-24 w-full object-contain object-left"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleThemeToggle}
          className="p-2"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="p-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle className="text-left">Menu</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-2">
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeSection === item.id ? "default" : "ghost"}
                  className={`w-full justify-start ${
                    disabled && item.id !== 'assinatura' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => handleMenuClick(item.id)}
                  disabled={disabled && item.id !== 'assinatura'}
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