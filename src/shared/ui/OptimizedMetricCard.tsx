import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface OptimizedMetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  className?: string;
  titleClassName?: string;
  valueClassName?: string;
  icon?: LucideIcon;
}

export const OptimizedMetricCard = memo<OptimizedMetricCardProps>(({
  title,
  value,
  subtitle,
  className = "hover:shadow-md transition-all hover:-translate-y-0.5",
  titleClassName = "text-xs sm:text-sm font-medium text-muted-foreground",
  valueClassName = "text-xl sm:text-2xl font-bold font-display tracking-tight",
  icon: Icon
}) => {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={titleClassName}>
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className={valueClassName}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
});