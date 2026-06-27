import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/** Skeleton para a seção principal (header + filtros + tabela/cards) */
export const SectionSkeleton: React.FC<{ rows?: number; withFilters?: boolean }> = ({
  rows = 5,
  withFilters = true,
}) => (
  <div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>

    {withFilters && (
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    )}

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>

    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </CardContent>
    </Card>
  </div>
);

/** Estado vazio padronizado */
export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-4">
    {icon && <div className="mb-3 opacity-30">{icon}</div>}
    <p className="text-base font-semibold text-foreground">{title}</p>
    {description && (
      <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
