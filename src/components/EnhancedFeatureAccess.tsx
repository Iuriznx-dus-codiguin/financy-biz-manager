import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Crown, Zap, Star, ArrowRight } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { cn } from '@/lib/utils';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
  className?: string;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showUpgrade = true,
  className
}) => {
  const { isFeatureAvailable, getFeatureLimitMessage, subscriptionTier } = useFeatureAccess();

  if (isFeatureAvailable(feature)) {
    return <div className={className}>{children}</div>;
  }

  if (fallback) {
    return <div className={className}>{fallback}</div>;
  }

  return (
    <div className={cn("relative", className)}>
      {/* Blurred content */}
      <div className="pointer-events-none select-none opacity-30 blur-sm">
        {children}
      </div>
      
      {/* Upgrade overlay */}
      {showUpgrade && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Recurso Premium</CardTitle>
              <Badge variant="outline" className="mx-auto">
                Plano {subscriptionTier || 'Gratuito'}
              </Badge>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                {getFeatureLimitMessage(feature)}
              </p>
              <Button className="w-full" size="sm">
                <Crown className="h-4 w-4 mr-2" />
                Fazer Upgrade
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

interface LimitWarningProps {
  current: number;
  limit: number;
  feature: string;
  className?: string;
}

export const LimitWarning: React.FC<LimitWarningProps> = ({
  current,
  limit,
  feature,
  className
}) => {
  const percentage = (current / limit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= limit;

  if (!isNearLimit) return null;

  return (
    <Alert 
      className={cn(
        "mb-4",
        isAtLimit ? "border-red-200 bg-red-50 dark:bg-red-900/20" : "border-orange-200 bg-orange-50 dark:bg-orange-900/20",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {isAtLimit ? (
          <Lock className="h-4 w-4 text-red-600" />
        ) : (
          <Zap className="h-4 w-4 text-orange-600" />
        )}
        <AlertDescription className={cn(
          isAtLimit ? "text-red-800 dark:text-red-200" : "text-orange-800 dark:text-orange-200"
        )}>
          <div className="flex items-center justify-between">
            <span>
              {isAtLimit ? (
                <>Limite atingido: {current}/{limit} {feature}</>
              ) : (
                <>Próximo ao limite: {current}/{limit} {feature}</>
              )}
            </span>
            <Button variant="outline" size="sm" className="ml-2">
              Upgrade
            </Button>
          </div>
        </AlertDescription>
      </div>
    </Alert>
  );
};

interface PlanBadgeProps {
  tier: string;
  className?: string;
  showIcon?: boolean;
}

export const PlanBadge: React.FC<PlanBadgeProps> = ({ 
  tier, 
  className,
  showIcon = true 
}) => {
  const getVariantAndIcon = (planTier: string) => {
    switch (planTier) {
      case 'free':
        return { variant: 'secondary' as const, icon: null, text: 'Gratuito' };
      case 'plus':
        return { variant: 'default' as const, icon: Zap, text: 'Plus' };
      case 'premium':
        return { variant: 'default' as const, icon: Crown, text: 'Premium' };
      case 'enterprise':
        return { variant: 'default' as const, icon: Star, text: 'Enterprise' };
      case 'developer':
        return { variant: 'outline' as const, icon: Star, text: 'Developer' };
      default:
        return { variant: 'secondary' as const, icon: null, text: 'Gratuito' };
    }
  };

  const { variant, icon: Icon, text } = getVariantAndIcon(tier);

  return (
    <Badge variant={variant} className={className}>
      {showIcon && Icon && <Icon className="h-3 w-3 mr-1" />}
      {text}
    </Badge>
  );
};

interface UpgradeCallToActionProps {
  feature: string;
  className?: string;
  compact?: boolean;
}

export const UpgradeCallToAction: React.FC<UpgradeCallToActionProps> = ({
  feature,
  className,
  compact = false
}) => {
  const { getFeatureLimitMessage, subscriptionTier } = useFeatureAccess();

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 p-3 border rounded-lg bg-muted/50", className)}>
        <Lock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground flex-1">
          Recurso Premium
        </span>
        <Button size="sm" variant="outline">
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center">
          <Crown className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold mb-2">Desbloqueie Recursos Premium</h3>
          <p className="text-sm text-muted-foreground">
            {getFeatureLimitMessage(feature)}
          </p>
        </div>
        <div className="space-y-2">
          <Button className="w-full">
            <Crown className="h-4 w-4 mr-2" />
            Fazer Upgrade Agora
          </Button>
          <p className="text-xs text-muted-foreground">
            Plano atual: <PlanBadge tier={subscriptionTier} className="ml-1" />
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Hook personalizado para verificar limites
export const useLimitCheck = (feature: string, currentCount: number) => {
  const { getLimits, isFeatureAvailable } = useFeatureAccess();
  const limits = getLimits();
  
  const getLimit = (featureType: string) => {
    switch (featureType) {
      case 'receitas': return limits.maxReceitas;
      case 'despesas': return limits.maxDespesas;
      case 'impostos': return limits.maxImpostos;
      case 'metas': return limits.maxMetas;
      case 'dashboards': return limits.maxDashboards;
      default: return -1;
    }
  };

  const limit = getLimit(feature);
  const canAdd = limit === -1 || currentCount < limit;
  const percentage = limit === -1 ? 0 : (currentCount / limit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = !canAdd;

  return {
    canAdd,
    limit,
    percentage,
    isNearLimit,
    isAtLimit,
    isFeatureAvailable
  };
};