import React from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { useProductTour } from '@/hooks/useProductTour';
import { TourId } from '@/config/tourSteps';
import { cn } from '@/lib/utils';

interface SectionTourBadgeProps {
  tourId: TourId;
  className?: string;
}

export const SectionTourBadge: React.FC<SectionTourBadgeProps> = ({ tourId, className }) => {
  const { startTour } = useProductTour();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => startTour(tourId)}
      className={cn('gap-1.5 h-8 text-xs', className)}
    >
      <HelpCircle className="h-3.5 w-3.5" />
      Guia rápido
    </Button>
  );
};
