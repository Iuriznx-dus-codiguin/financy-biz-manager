import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useProductTour } from '@/hooks/useProductTour';
import { TourOverlay } from './TourOverlay';
import { TourId, BUSINESS_ONLY_TOURS } from '@/config/tourSteps';
import { useDashboard } from '@/hooks/useDashboard';
import { ROUTE_TO_SECTION } from '@/constants/routes';

const ROUTE_TO_TOUR: Record<string, TourId> = {
  '/dashboard': 'dashboard',
  '/receitas': 'receitas',
  '/despesas': 'despesas',
  '/categorias': 'categorias',
  '/metas': 'metas',
  '/relatorios': 'relatorios',
  '/agentes-ia': 'agentes-ia',
  '/impostos': 'impostos',
  '/equipe': 'equipe',
  '/fechamento': 'fechamento',
};

const GENERAL_TOUR_FLAG = 'financy:start_general_tour';

export const ProductTour: React.FC = () => {
  const { startTour, hasTourBeenSeen, loading, isActive } = useProductTour();
  const { currentDashboard } = useDashboard();
  const location = useLocation();

  // Trigger general tour após onboarding (flag no localStorage)
  useEffect(() => {
    if (loading) return;
    if (localStorage.getItem(GENERAL_TOUR_FLAG) === '1') {
      localStorage.removeItem(GENERAL_TOUR_FLAG);
      setTimeout(() => startTour('general'), 600);
    }
  }, [loading, startTour]);

  // Auto-trigger tour da seção na primeira visita
  useEffect(() => {
    if (loading || isActive) return;
    const tourId = ROUTE_TO_TOUR[location.pathname];
    if (!tourId) return;
    // Bloquear tours empresariais se for conta pessoal
    if (
      currentDashboard?.type === 'personal' &&
      BUSINESS_ONLY_TOURS.includes(tourId)
    ) {
      return;
    }
    // Não disparar general aqui — só seções
    if (tourId === 'general') return;
    if (hasTourBeenSeen(tourId)) return;
    // Não dispara se o general ainda está pendente
    if (localStorage.getItem(GENERAL_TOUR_FLAG) === '1') return;
    const t = setTimeout(() => {
      if (!hasTourBeenSeen(tourId)) startTour(tourId);
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, loading, currentDashboard]);

  return <TourOverlay />;
};

export const requestGeneralTour = () => {
  localStorage.setItem(GENERAL_TOUR_FLAG, '1');
};
