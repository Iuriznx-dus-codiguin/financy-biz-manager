import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ 
  children, 
  className,
  delay = 0 
}) => {
  return (
    <Card 
      className={cn(
        "transition-all duration-500 ease-out hover:shadow-lg hover:scale-[1.02] animate-fade-in",
        className
      )}
      style={{
        animationDelay: `${delay}ms`
      }}
    >
      {children}
    </Card>
  );
};