import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useTour } from '@/hooks/useTour';
import { cn } from '@/lib/utils';

interface TourGuideProps {
  className?: string;
}

export const TourGuide: React.FC<TourGuideProps> = ({ className }) => {
  const {
    isActive,
    nextStep,
    previousStep,
    skipTour,
    getCurrentTourData
  } = useTour();

  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const tourData = getCurrentTourData();

  useEffect(() => {
    if (!isActive || !tourData) return;

    const targetElement = document.querySelector(tourData.step.target);
    if (!targetElement || !overlayRef.current || !tooltipRef.current) return;

    // Position the overlay and tooltip
    const rect = targetElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // Scroll target into view
    targetElement.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });

    // Create spotlight effect
    const overlay = overlayRef.current;
    overlay.style.clipPath = `polygon(0% 0%, 0% 100%, ${rect.left}px 100%, ${rect.left}px ${rect.top + scrollTop}px, ${rect.right}px ${rect.top + scrollTop}px, ${rect.right}px ${rect.bottom + scrollTop}px, ${rect.left}px ${rect.bottom + scrollTop}px, ${rect.left}px 100%, 100% 100%, 100% 0%)`;

    // Position tooltip
    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let top = rect.bottom + scrollTop + 10;
    let left = rect.left + scrollLeft;

    // Adjust position based on step position preference
    switch (tourData.step.position) {
      case 'top':
        top = rect.top + scrollTop - tooltipRect.height - 10;
        break;
      case 'right':
        left = rect.right + scrollLeft + 10;
        top = rect.top + scrollTop;
        break;
      case 'left':
        left = rect.left + scrollLeft - tooltipRect.width - 10;
        top = rect.top + scrollTop;
        break;
      case 'bottom':
      default:
        // Already set above
        break;
    }

    // Keep tooltip within viewport
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    if (top < 10) top = 10;

    tooltip.style.position = 'absolute';
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.style.zIndex = '9999';

    // Add highlighting to target element
    targetElement.classList.add('tour-highlight');

    return () => {
      targetElement.classList.remove('tour-highlight');
    };
  }, [isActive, tourData]);

  if (!isActive || !tourData) return null;

  const { step, stepIndex, totalSteps, isFirst, isLast } = tourData;

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/50 pointer-events-none z-[9990] transition-all duration-300"
        style={{
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
        }}
      />

      {/* Tooltip */}
      <Card
        ref={tooltipRef}
        className={cn(
          "fixed z-[9999] w-80 max-w-sm shadow-xl border-primary animate-scale-in",
          className
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-sm font-medium">
                {step.title}
              </CardTitle>
              <Badge variant="secondary" className="mt-1">
                {stepIndex + 1} de {totalSteps}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={skipTour}
              className="h-6 w-6 p-0 hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-4">
            {step.content}
          </p>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={previousStep}
              disabled={isFirst}
              className="h-8"
            >
              <ChevronLeft className="h-3 w-3 mr-1" />
              Anterior
            </Button>

            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    i === stepIndex ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>

            <Button
              size="sm"
              onClick={nextStep}
              className="h-8"
            >
              {isLast ? 'Concluir' : 'Próximo'}
              {!isLast && <ChevronRight className="h-3 w-3 ml-1" />}
            </Button>
          </div>

          {/* Action buttons */}
          {step.action && (
            <div className="mt-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={step.action}
                className="w-full h-8"
              >
                Experimentar Agora
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 9995 !important;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5) !important;
          border-radius: 8px;
          animation: tour-pulse 2s infinite;
        }
        
        @keyframes tour-pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.8);
          }
        }
      `}</style>
    </>
  );
};

// Tour Control Panel Component
export const TourControlPanel: React.FC = () => {
  const { tours, progress, startTour, resetTour } = useTour();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎯 Tours Disponíveis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.values(tours).map((tour) => {
          const tourProgress = progress[tour.name];
          const isCompleted = tourProgress?.completed || false;
          
          return (
            <div key={tour.name} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium capitalize">
                  {tour.name === 'onboarding' ? 'Tour Inicial' : 'Tour Avançado'}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {isCompleted ? 'Concluído' : `${tourProgress?.stepCompleted || 0}/${tour.steps.length} passos`}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startTour(tour.name)}
                  disabled={!isCompleted && tour.required}
                >
                  {isCompleted ? 'Repetir' : 'Iniciar'}
                </Button>
                
                {isCompleted && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => resetTour(tour.name)}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
