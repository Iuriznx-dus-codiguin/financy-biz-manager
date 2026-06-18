import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles, X } from 'lucide-react';

interface UpgradeCardProps {
  feature: string;
  description: string;
  requiredPlan: string;
  onUpgrade: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const UpgradeCard: React.FC<UpgradeCardProps> = ({
  feature,
  description,
  requiredPlan,
  onUpgrade,
  dismissible = false,
  onDismiss
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  return (
    <Card className="rounded-lg shadow-sm border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 relative">
      {dismissible && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-primary/10"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
      
      <CardContent className="p-3 text-center space-y-2">
        <div className="mx-auto w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
          <Lock className="h-4 w-4 text-primary" />
        </div>
        
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground font-display tracking-tight">
            {feature}
          </h3>
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        </div>
        
        <div className="space-y-2">
          <p className="text-xs font-medium text-primary">
            {requiredPlan}
          </p>
          
          <Button 
            onClick={onUpgrade}
            className="w-full rounded-lg bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white"
            size="sm"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Fazer Upgrade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};