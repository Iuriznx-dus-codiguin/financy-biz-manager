import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, X, Sparkles, CheckCircle2 } from 'lucide-react';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  selector: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
  beforeShow?: () => Promise<void>;
}

interface InteractiveTutorialProps {
  steps: TutorialStep[];
  section: string;
  isOpen: boolean;
  onClose: (completed: boolean) => void;
  onStepChange?: (stepIndex: number) => void;
}

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
  steps,
  section,
  isOpen,
  onClose,
  onStepChange
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [elementBounds, setElementBounds] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isOpen || !currentStep) return;

    const updateElementPosition = () => {
      const element = document.querySelector(currentStep.selector);
      
      if (!element) {
        console.warn(`Tutorial: Element not found for selector "${currentStep.selector}"`);
        return;
      }

      const bounds = element.getBoundingClientRect();
      setElementBounds(bounds);

      // Calcular posição do tooltip
      const tooltipWidth = 384; // max-w-sm = 384px
      const tooltipHeight = 250;
      const margin = 16;
      
      let x = 0;
      let y = 0;

      if (isMobile) {
        // Em mobile, sempre na parte inferior
        x = margin;
        y = window.innerHeight - tooltipHeight - margin;
      } else {
        // Desktop - posicionar baseado na preferência
        const position = currentStep.position || 'bottom';
        
        switch (position) {
          case 'top':
            x = bounds.left + (bounds.width / 2) - (tooltipWidth / 2);
            y = bounds.top - tooltipHeight - margin;
            break;
          case 'bottom':
            x = bounds.left + (bounds.width / 2) - (tooltipWidth / 2);
            y = bounds.bottom + margin;
            break;
          case 'left':
            x = bounds.left - tooltipWidth - margin;
            y = bounds.top + (bounds.height / 2) - (tooltipHeight / 2);
            break;
          case 'right':
            x = bounds.right + margin;
            y = bounds.top + (bounds.height / 2) - (tooltipHeight / 2);
            break;
        }

        // Ajustar para não sair da tela
        x = Math.max(margin, Math.min(x, window.innerWidth - tooltipWidth - margin));
        y = Math.max(margin, Math.min(y, window.innerHeight - tooltipHeight - margin));
      }

      setTooltipPosition({ x, y });

      // Scroll suave para o elemento
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // Executar beforeShow se existir
    if (currentStep.beforeShow) {
      currentStep.beforeShow().then(updateElementPosition);
    } else {
      updateElementPosition();
    }

    window.addEventListener('resize', updateElementPosition);
    window.addEventListener('scroll', updateElementPosition);

    return () => {
      window.removeEventListener('resize', updateElementPosition);
      window.removeEventListener('scroll', updateElementPosition);
    };
  }, [currentStepIndex, currentStep, isOpen, isMobile]);

  const nextStep = useCallback(() => {
    if (currentStep.action) {
      currentStep.action();
    }

    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      onStepChange?.(currentStepIndex + 1);
    } else {
      // Tutorial completo
      onClose(true);
    }
  }, [currentStepIndex, totalSteps, currentStep, onStepChange, onClose]);

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      onStepChange?.(currentStepIndex - 1);
    }
  }, [currentStepIndex, onStepChange]);

  const skipTutorial = useCallback(() => {
    onClose(false);
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          nextStep();
          break;
        case 'ArrowLeft':
          previousStep();
          break;
        case 'Escape':
          skipTutorial();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextStep, previousStep, skipTutorial]);

  if (!isOpen || !currentStep) return null;

  const spotlightRadius = elementBounds 
    ? Math.max(elementBounds.width, elementBounds.height) / 2 + (isMobile ? 20 : 30)
    : 100;

  const elementCenter = elementBounds
    ? {
        x: elementBounds.left + elementBounds.width / 2,
        y: elementBounds.top + elementBounds.height / 2
      }
    : { x: 0, y: 0 };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay escuro */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[9998] transition-opacity duration-300"
            onClick={skipTutorial}
          />

          {/* SVG Spotlight */}
          {elementBounds && (
            <svg className="fixed inset-0 z-[9999] pointer-events-none" style={{ isolation: 'isolate' }}>
              <defs>
                <mask id="spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  <circle
                    cx={elementCenter.x}
                    cy={elementCenter.y}
                    r={spotlightRadius}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.7)"
                mask="url(#spotlight-mask)"
              />
            </svg>
          )}

          {/* Anel de destaque */}
          {elementBounds && (
            <motion.div
              className="fixed z-[10000] pointer-events-none rounded-xl"
              style={{
                left: elementBounds.left - 8,
                top: elementBounds.top - 8,
                width: elementBounds.width + 16,
                height: elementBounds.height + 16,
                border: '3px solid hsl(var(--primary))',
                boxShadow: '0 0 0 4px hsl(var(--primary) / 0.1), 0 0 20px hsl(var(--primary) / 0.3)'
              }}
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}

          {/* Tooltip Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="fixed z-[10001] max-w-sm"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y
            }}
          >
            <Card className="shadow-2xl border-2 border-primary/20 bg-background">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      {currentStep.title}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {currentStep.description}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={skipTutorial}
                    className="h-8 w-8 -mt-1 -mr-1"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Progress Indicator */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Passo {currentStepIndex + 1} de {totalSteps}
                  </span>
                  <Progress value={((currentStepIndex + 1) / totalSteps) * 100} className="w-24 h-2" />
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={previousStep}
                    disabled={currentStepIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>

                  <Button
                    size="sm"
                    onClick={nextStep}
                    className="bg-primary"
                  >
                    {currentStepIndex === totalSteps - 1 ? (
                      <>
                        Concluir <CheckCircle2 className="w-4 h-4 ml-1" />
                      </>
                    ) : (
                      <>
                        Próximo <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
