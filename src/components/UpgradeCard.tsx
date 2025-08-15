import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';

interface UpgradeCardProps {
  feature: string;
  description: string;
  requiredPlan: string;
  onUpgrade: () => void;
}

export const UpgradeCard: React.FC<UpgradeCardProps> = ({
  feature,
  description,
  requiredPlan,
  onUpgrade
}) => {
  return (
    <Card className="rounded-lg shadow-sm border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardContent className="p-4 text-center space-y-3">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">
            {feature}
          </h3>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        
        <div className="space-y-2">
          <p className="text-xs font-medium text-primary">
            Disponível no plano {requiredPlan}
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