import React, { useEffect, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useProductTour } from '@/hooks/useProductTour';
import { TourPosition } from '@/config/tourSteps';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const TOOLTIP_WIDTH = 360;
const TOOLTIP_ESTIMATED_HEIGHT = 220;
const GAP = 16;

function pickPosition(
  target: Rect | null,
  preferred: TourPosition,
  viewport: { w: number; h: number }
): { style: React.CSSProperties; actual: TourPosition } {
  if (!target || preferred === 'center') {
    return {
      actual: 'center',
      style: {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: Math.min(TOOLTIP_WIDTH, viewport.w - 32),
      },
    };
  }

  const isMobile = viewport.w < 768;
  if (isMobile) {
    return {
      actual: 'bottom',
      style: {
        bottom: 16,
        left: 16,
        right: 16,
        width: 'auto',
      },
    };
  }

  const tryPosition = (pos: TourPosition): React.CSSProperties | null => {
    const width = TOOLTIP_WIDTH;
    const height = TOOLTIP_ESTIMATED_HEIGHT;
    let top = 0;
    let left = 0;
    if (pos === 'top') {
      top = target.top - height - GAP;
      left = target.left + target.width / 2 - width / 2;
    } else if (pos === 'bottom') {
      top = target.top + target.height + GAP;
      left = target.left + target.width / 2 - width / 2;
    } else if (pos === 'left') {
      top = target.top + target.height / 2 - height / 2;
      left = target.left - width - GAP;
    } else if (pos === 'right') {
      top = target.top + target.height / 2 - height / 2;
      left = target.left + target.width + GAP;
    }
    if (top < 8 || left < 8 || top + height > viewport.h - 8 || left + width > viewport.w - 8) {
      return null;
    }
    return { top, left, width };
  };

  const order: TourPosition[] = [
    preferred,
    preferred === 'top' ? 'bottom' : preferred === 'bottom' ? 'top' : preferred === 'left' ? 'right' : 'left',
    'bottom',
    'top',
    'right',
    'left',
  ];
  for (const p of order) {
    const s = tryPosition(p);
    if (s) return { style: s, actual: p };
  }
  // Fallback center
  return {
    actual: 'center',
    style: {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: TOOLTIP_WIDTH,
    },
  };
}

export const TourOverlay: React.FC = () => {
  const { isActive, currentStepData, currentStep, totalSteps, progress, next, prev, skip } =
    useProductTour();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1024,
    h: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useLayoutEffect(() => {
    if (!isActive || !currentStepData) {
      setTargetRect(null);
      return;
    }
    if (!currentStepData.target) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.querySelector(currentStepData.target!) as HTMLElement | null;
      if (!el) {
        setTargetRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      // Scroll into view if needed
      if (r.top < 0 || r.bottom > window.innerHeight) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // re-medir após scroll
        setTimeout(() => {
          const nr = el.getBoundingClientRect();
          setTargetRect({ top: nr.top, left: nr.left, width: nr.width, height: nr.height });
        }, 350);
        return;
      }
      setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    updateRect();
    const onResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      updateRect();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', updateRect, true);
    const interval = setInterval(updateRect, 500);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', updateRect, true);
      clearInterval(interval);
    };
  }, [isActive, currentStepData]);

  if (!isActive || !currentStepData) return null;

  const { style: tooltipStyle, actual } = pickPosition(targetRect, currentStepData.position, viewport);
  const isLastStep = currentStep === totalSteps - 1;
  const hasSpotlight = !!targetRect;

  const overlay = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        pointerEvents: 'none',
      }}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop with spotlight via SVG mask */}
      {hasSpotlight && targetRect ? (
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'auto',
          }}
          onClick={skip}
        >
          <defs>
            <mask id="tour-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx={8}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.6)"
            mask="url(#tour-spotlight-mask)"
          />
          <rect
            x={targetRect.left - 8}
            y={targetRect.top - 8}
            width={targetRect.width + 16}
            height={targetRect.height + 16}
            rx={8}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            style={{ pointerEvents: 'none' }}
            className="tour-spotlight-pulse"
          />
          <rect
            x={targetRect.left - 12}
            y={targetRect.top - 12}
            width={targetRect.width + 24}
            height={targetRect.height + 24}
            rx={10}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            opacity={0.5}
            style={{ pointerEvents: 'none' }}
            className="tour-spotlight-pulse-outer"
          />
        </svg>
      ) : (
        <div
          onClick={skip}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(2px)',
            pointerEvents: 'auto',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="bg-card border border-border rounded-xl shadow-2xl p-5 animate-in fade-in zoom-in-95"
        style={{
          position: 'fixed',
          ...tooltipStyle,
          zIndex: 9999,
          pointerEvents: 'auto',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-medium text-muted-foreground">
              {currentStep + 1} de {totalSteps}
            </span>
            {currentStepData.badge && (
              <Badge variant="default" className="text-[10px] h-5 px-2">
                {currentStepData.badge}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={skip}
            className="h-7 w-7 -mt-1 -mr-1"
            aria-label="Fechar tour"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Progress value={progress} className="h-1 mb-4" />

        <h3 className="font-semibold text-base mb-2 leading-tight">{currentStepData.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          {currentStepData.content}
        </p>

        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={skip} className="text-muted-foreground">
            Pular tour
          </Button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={prev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
            )}
            <Button size="sm" onClick={next}>
              {isLastStep ? 'Concluir ✓' : 'Próximo'}
              {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
};
