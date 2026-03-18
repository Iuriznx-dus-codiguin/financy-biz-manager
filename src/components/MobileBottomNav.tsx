import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, TrendingUp, TrendingDown, Bot, CreditCard } from 'lucide-react';
import { getSectionForRoute, getRouteForSection, isSectionAllowedWhenBlocked } from '@/constants/routes';

interface MobileBottomNavProps {
  disabled?: boolean;
}

const NAV_ITEMS = [
  { id: 'painel', icon: Layout, label: 'Painel' },
  { id: 'receitas', icon: TrendingUp, label: 'Receitas' },
  { id: 'despesas', icon: TrendingDown, label: 'Despesas' },
  { id: 'agentes-ia', icon: Bot, label: 'IA' },
  { id: 'assinatura', icon: CreditCard, label: 'Planos' },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ disabled = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentSection = getSectionForRoute(location.pathname);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {NAV_ITEMS.map((item) => {
          const isActive = currentSection === item.id;
          const isAllowed = !disabled || isSectionAllowedWhenBlocked(item.id);
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isAllowed) navigate(getRouteForSection(item.id));
              }}
              disabled={!isAllowed}
              className={`
                flex flex-col items-center justify-center gap-0.5 flex-1 h-full
                transition-colors duration-200 relative
                ${!isAllowed ? 'opacity-30 pointer-events-none' : ''}
                ${isActive ? 'text-primary' : 'text-muted-foreground'}
              `}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}
              <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
              <span className={`text-[10px] font-medium leading-tight ${isActive ? 'text-primary' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
