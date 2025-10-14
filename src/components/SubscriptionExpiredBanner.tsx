import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Crown, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserSubscription } from '@/hooks/useUserSubscription';

export const SubscriptionExpiredBanner: React.FC = () => {
  const { subscription, isSubscriptionExpired, isFreeTrial, getDaysUntilExpiration } = useUserSubscription();

  // Não mostrar nada se não houver assinatura
  if (!subscription) return null;

  const expired = isSubscriptionExpired();
  const isTrial = isFreeTrial();
  const daysRemaining = getDaysUntilExpiration();

  // Se não expirou e tem mais de 2 dias, não mostrar nada
  if (!expired && daysRemaining !== null && daysRemaining > 2) return null;

  const handleSubscribe = () => {
    const event = new CustomEvent('navigate-to-section', { detail: 'assinatura' });
    window.dispatchEvent(event);
  };

  // Determinar configuração do banner
  const getBannerConfig = () => {
    if (expired && isTrial) {
      return {
        variant: 'destructive' as const,
        icon: <AlertTriangle className="h-4 w-4" />,
        title: '🚨 Teste Gratuito Expirado!',
        message: 'Seu período de teste de 7 dias chegou ao fim. Assine um plano para continuar usando o Financy!',
        buttonText: 'Assinar Agora',
        showDays: true
      };
    }
    
    if (expired && !isTrial) {
      return {
        variant: 'destructive' as const,
        icon: <AlertTriangle className="h-4 w-4" />,
        title: '🚨 Assinatura Expirada!',
        message: 'Renove sua assinatura para continuar usando todas as funcionalidades.',
        buttonText: 'Renovar Agora',
        showDays: true
      };
    }

    // Aviso de expiração próxima (últimos 2 dias)
    if (daysRemaining !== null && daysRemaining <= 2) {
      return {
        variant: 'default' as const,
        icon: <Clock className="h-4 w-4" />,
        title: '⚠️ Atenção!',
        message: isTrial 
          ? `Seu teste gratuito expira em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}. Assine agora para não perder acesso!`
          : `Sua assinatura expira em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}. Renove agora!`,
        buttonText: isTrial ? 'Assinar Agora' : 'Renovar',
        showDays: false
      };
    }

    return null;
  };

  const config = getBannerConfig();
  
  if (!config) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50"
    >
      <Alert className={
        config.variant === 'destructive'
          ? "border-destructive/20 bg-destructive/5 text-destructive rounded-none border-x-0 border-t-0 border-b-2 border-b-destructive/30"
          : "border-warning/20 bg-warning/5 text-warning rounded-none border-x-0 border-t-0 border-b-2 border-b-warning/30"
      }>
        {config.icon}
        <AlertDescription className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{config.title}</span>
            <span className="text-sm">{config.message}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {config.showDays && daysRemaining !== null && daysRemaining < 0 && (
              <div className={
                config.variant === 'destructive'
                  ? "text-xs bg-destructive/10 px-2 py-1 rounded"
                  : "text-xs bg-warning/10 px-2 py-1 rounded"
              }>
                Expirou há {Math.abs(daysRemaining)} {Math.abs(daysRemaining) === 1 ? 'dia' : 'dias'}
              </div>
            )}
            <Button 
              size="sm" 
              variant={config.variant}
              onClick={handleSubscribe}
              className={
                config.variant === 'destructive'
                  ? "bg-destructive hover:bg-destructive/90 text-white shadow-md"
                  : "bg-warning hover:bg-warning/90 text-white shadow-md"
              }
            >
              <Crown className="h-3 w-3 mr-1" />
              {config.buttonText}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </motion.div>
  );
};