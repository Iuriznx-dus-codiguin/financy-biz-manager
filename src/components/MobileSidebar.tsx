import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useTheme } from '@/hooks/useTheme';
import { useDashboard } from '@/hooks/useDashboard';
import { MENU_ITEMS, getRouteForSection, getSectionForRoute, isSectionAllowedWhenBlocked } from '@/constants/routes';

import financyLogoLight from '@/assets/financy-logo-light.png';
import financyLogoDark from '@/assets/financy-logo-dark.png';

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
    <div className="lg:hidden flex items-center justify-between py-2 px-2 bg-background border-b">
      <div className="flex items-center w-full max-w-[320px]">
        <img src={financyLogo} alt="Financy" className="h-24 w-full object-contain object-left" />
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleThemeToggle} className="p-2">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="p-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px] flex flex-col">
            <SheetHeader>
              <SheetTitle className="text-left">Menu</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-2 overflow-y-auto flex-1 pr-2">
              {menuItems.map((item) => {
                const isAllowed = !disabled || isSectionAllowedWhenBlocked(item.id);
                return (
                  <Button
                    key={item.id}
                    variant={currentSection === item.id ? "default" : "ghost"}
                    className={`w-full justify-start ${!isAllowed ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => handleMenuClick(item.id)}
                    disabled={!isAllowed}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
