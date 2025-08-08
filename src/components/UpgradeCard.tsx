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
    <Card className="rounded-2xl shadow-sm border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardContent className="p-8 text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">
            {feature}
          </h3>
          <p className="text-muted-foreground">
            {description}
          </p>
        </div>
        
        <div className="space-y-3">
          <p className="text-sm font-medium text-primary">
            Disponível no plano {requiredPlan}
          </p>
          
          <Button 
            onClick={onUpgrade}
            className="w-full rounded-xl bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white"
            size="lg"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Fazer Upgrade
          </Button>
        </div>
        
        <div className="mt-4 p-3 bg-accent/20 rounded-lg">
          <p className="text-xs text-muted-foreground">
            ✨ Desbloqueie recursos avançados e insights poderosos
          </p>
        </div>
      </CardContent>
    </Card>
  );
};