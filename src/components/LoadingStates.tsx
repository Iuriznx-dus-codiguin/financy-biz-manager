import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingCardProps {
  className?: string;
  showHeader?: boolean;
  lines?: number;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({ 
  className, 
  showHeader = true, 
  lines = 3 
}) => (
  <Card className={cn("animate-pulse", className)}>
    {showHeader && (
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
    )}
    <CardContent className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </CardContent>
  </Card>
);

export const LoadingTable: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="space-y-3 animate-pulse">
    {/* Header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={`header-${i}`} className="h-6 w-full" />
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={`${rowIndex}-${colIndex}`} className="h-4 w-full" />
        ))}
      </div>
    ))}
  </div>
);

export const LoadingStats: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
    {Array.from({ length: 3 }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export const LoadingChart: React.FC<{ height?: string }> = ({ height = "h-64" }) => (
  <Card className="animate-pulse">
    <CardHeader>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-32" />
    </CardHeader>
    <CardContent>
      <Skeleton className={cn("w-full", height)} />
    </CardContent>
  </Card>
);

export const LoadingList: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="space-y-3 animate-pulse">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
    ))}
  </div>
);

export const LoadingForm: React.FC<{ fields?: number }> = ({ fields = 4 }) => (
  <div className="space-y-6 animate-pulse">
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
    <div className="flex gap-3 pt-4">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className={cn(
        "animate-spin rounded-full border-2 border-muted border-t-primary",
        sizeClasses[size]
      )} />
    </div>
  );
};

export const LoadingPage: React.FC = () => (
  <div className="space-y-8 p-6 animate-pulse">
    {/* Header */}
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
    
    {/* Stats */}
    <LoadingStats />
    
    {/* Main content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <LoadingChart />
      <LoadingList />
    </div>
  </div>
);