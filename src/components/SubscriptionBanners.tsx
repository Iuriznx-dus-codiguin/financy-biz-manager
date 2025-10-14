import React, { useState } from 'react';
import { X, Crown, AlertTriangle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const SubscriptionBanners: React.FC = () => {
  const { subscription, isSubscriptionExpired, isFreeTrial, getDaysUntilExpiration } = useUserSubscription();
  const [dismissed, setDismissed] = useState(false);

  // Não mostrar nada se não houver assinatura ou se foi dispensado
  if (!subscription || dismissed) return null;

  const expired = isSubscriptionExpired();
  const isTrial = isFreeTrial();
  const daysRemaining = getDaysUntilExpiration();

  const handleNavigateToSubscription = () => {
    const event = new CustomEvent('navigate-to-section', { detail: 'assinatura' });
    window.dispatchEvent(event);
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Banner Principal - Para estados expirados ou últimos dias de assinatura paga
  const shouldShowMainBanner = () => {
    if (expired) return true; // Qualquer expirado
    if (!isTrial && daysRemaining !== null && daysRemaining <= 3) return true; // Últimos 3 dias de assinatura paga
    return false;
  };

  // Card de Aviso - Apenas para últimos 3 dias de teste gratuito
  const shouldShowTrialCard = () => {
    return isTrial && !expired && daysRemaining !== null && daysRemaining <= 3;
  };

  // Formatação de data para o card de aviso
  const formatExpirationDate = () => {
    if (!subscription.expires_at) return '';
    
    const date = new Date(subscription.expires_at);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  return (
    <>
      {/* Banner Principal - Full Width Top */}
      <AnimatePresence>
        {shouldShowMainBanner() && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.5 }}
            className="fixed top-4 left-4 right-4 z-50"
          >
            <div className={`
              rounded-lg shadow-2xl p-4 flex items-center justify-between
              border-l-4
              ${expired 
                ? 'bg-red-50 border-red-500 dark:bg-red-950/30' 
                : 'bg-orange-50 border-orange-500 dark:bg-orange-950/30'
              }
            `}>
              <div className="flex items-center gap-3">
                <div className={`
                  rounded-full p-2
                  ${expired 
                    ? 'bg-red-100 dark:bg-red-900/50' 
                    : 'bg-orange-100 dark:bg-orange-900/50'
                  }
                `}>
                  <AlertTriangle className={`
                    h-5 w-5
                    ${expired ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}
                  `} />
                </div>
                
                <div>
                  <h3 className={`
                    font-bold text-lg
                    ${expired ? 'text-red-900 dark:text-red-100' : 'text-orange-900 dark:text-orange-100'}
                  `}>
                    {expired && isTrial && '🚨 Teste Gratuito Expirado!'}
                    {expired && !isTrial && '🚨 Assinatura Expirada!'}
                    {!expired && '⚠️ Atenção: Sua assinatura está expirando!'}
                  </h3>
                  <p className={`
                    text-sm
                    ${expired ? 'text-red-700 dark:text-red-200' : 'text-orange-700 dark:text-orange-200'}
                  `}>
                    {expired && isTrial && 'Seu período de teste de 7 dias chegou ao fim. Assine um plano para continuar usando o Financy!'}
                    {expired && !isTrial && 'Renove sua assinatura para continuar usando todas as funcionalidades.'}
                    {!expired && daysRemaining !== null && `Restam apenas ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}. Renove agora para não perder acesso!`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {expired && daysRemaining !== null && daysRemaining < 0 && (
                  <div className={`
                    text-xs px-3 py-1 rounded-full font-semibold
                    ${expired 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' 
                      : 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'
                    }
                  `}>
                    Expirou há {Math.abs(daysRemaining)} {Math.abs(daysRemaining) === 1 ? 'dia' : 'dias'}
                  </div>
                )}
                
                <Button
                  onClick={handleNavigateToSubscription}
                  className={`
                    shadow-lg hover:shadow-xl transition-all
                    ${expired 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                    }
                  `}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  {expired ? (isTrial ? 'Assinar Agora' : 'Renovar Agora') : 'Renovar'}
                </Button>

                <button
                  onClick={handleDismiss}
                  className={`
                    rounded-full p-1 transition-colors
                    ${expired 
                      ? 'hover:bg-red-200 text-red-600 dark:hover:bg-red-900 dark:text-red-400' 
                      : 'hover:bg-orange-200 text-orange-600 dark:hover:bg-orange-900 dark:text-orange-400'
                    }
                  `}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card de Aviso - Últimos 3 dias do teste gratuito */}
      <AnimatePresence>
        {shouldShowTrialCard() && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.5 }}
            className="fixed top-4 right-4 z-50 w-80"
          >
            <Card className="bg-orange-50 border-orange-200 shadow-xl dark:bg-orange-950/30 dark:border-orange-900">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full p-2 bg-orange-100 dark:bg-orange-900/50">
                      <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="font-bold text-orange-900 dark:text-orange-100">
                      Teste Gratuito Encerrando
                    </h3>
                  </div>
                  <button
                    onClick={handleDismiss}
                    className="text-orange-600 hover:bg-orange-200 dark:text-orange-400 dark:hover:bg-orange-900 rounded-full p-1 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-orange-700 dark:text-orange-200">
                    Seu teste gratuito expira em <span className="font-bold">{daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}</span>.
                  </p>
                  
                  <div className="bg-white dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                    <p className="text-xs text-orange-600 dark:text-orange-300 mb-1">
                      Data de Expiração
                    </p>
                    <p className="font-bold text-orange-900 dark:text-orange-100">
                      {formatExpirationDate()}
                    </p>
                  </div>

                  <Button
                    onClick={handleNavigateToSubscription}
                    className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Assinar Agora
                  </Button>

                  <p className="text-xs text-orange-600 dark:text-orange-300 text-center">
                    Não perca acesso às suas funcionalidades!
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
