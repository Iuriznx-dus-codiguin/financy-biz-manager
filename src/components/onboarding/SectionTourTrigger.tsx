import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useProductTour } from '@/hooks/useProductTour';
import type { TourId } from '@/config/tourSteps';

interface SectionTourTriggerProps {
  tourId: TourId;
  label?: string;
  className?: string;
}

/**
 * Small "?" icon shown next to a section title so users can re-open the tour
 * for the current page at any time. Matches the promise made by the welcome
 * tour ("clique no ícone de ajuda ao lado do título").
 */
export const SectionTourTrigger: React.FC<SectionTourTriggerProps> = ({
  tourId,
  label = 'Rever tutorial desta seção',
  className,
}) => {
  const { startTour } = useProductTour();
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            onClick={() => startTour(tourId)}
            className={`h-7 w-7 text-muted-foreground hover:text-primary ${className ?? ''}`}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SectionTourTrigger;
