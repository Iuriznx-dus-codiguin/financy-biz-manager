import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Crown, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserSubscription } from '@/hooks/useUserSubscription';

export const SubscriptionExpiredBanner: React.FC = () => {
  const { subscription, isSubscriptionExpired, isFreeTrial, getDaysUntilExpiration } = useUserSubscription();

  if (!subscription || !isSubscriptionExpired()) return null;

  const daysExpired = getDaysUntilExpiration();
  const isTrialExpired = isFreeTrial();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50"
    >
      <Alert className="border-destructive/20 bg-destructive/5 text-destructive rounded-none border-x-0 border-t-0 border-b-2 border-b-destructive/30">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              {isTrialExpired ? '🚨 Teste Gratuito Expirado!' : '🚨 Assinatura Expirada!'}
            </span>
            <span className="text-sm">
              {isTrialExpired 
                ? 'Seu período de teste de 7 dias chegou ao fim. Assine um plano para continuar usando o Financy!'
                : 'Renove sua assinatura para continuar usando todas as funcionalidades.'
              }
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {daysExpired !== null && daysExpired < 0 && (
              <div className="text-xs bg-destructive/10 px-2 py-1 rounded">
                Expirou há {Math.abs(daysExpired)} dias
              </div>
            )}
            <Button 
              size="sm" 
              variant="destructive"
              className="bg-destructive hover:bg-destructive/90 text-white shadow-md"
            >
              <Crown className="h-3 w-3 mr-1" />
              Renovar Agora
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </motion.div>
  );
};