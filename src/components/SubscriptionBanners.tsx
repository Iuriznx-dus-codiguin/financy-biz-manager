import React, { useState } from 'react';
import { X, Crown, AlertTriangle, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { Button } from '@/components/ui/button';

export const SubscriptionBanners: React.FC = () => {
  const { subscription, isSubscriptionExpired, isPendingPayment, getDaysUntilExpiration } = useUserSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (!subscription || dismissed) return null;

  const expired = isSubscriptionExpired();
  const isPending = isPendingPayment();
  const daysRemaining = getDaysUntilExpiration();

  const handleNavigateToSubscription = () => {
    const event = new CustomEvent('navigate-to-section', { detail: 'assinatura' });
    window.dispatchEvent(event);
  };

  // Mostrar banner apenas para: pending_payment, expirado, ou últimos 3 dias
  const shouldShowBanner = isPending || expired || (daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0);

  if (!shouldShowBanner) return null;

  const isUrgent = isPending || expired;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.5 }}
        className="fixed top-4 left-4 right-4 z-50"
      >
        <div className={`
          rounded-lg shadow-2xl p-4 flex items-center justify-between border-l-4
          ${isUrgent
            ? 'bg-red-50 border-red-500 dark:bg-red-950/30' 
            : 'bg-orange-50 border-orange-500 dark:bg-orange-950/30'
          }
        `}>
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${isUrgent ? 'bg-red-100 dark:bg-red-900/50' : 'bg-orange-100 dark:bg-orange-900/50'}`}>
              {isPending ? (
                <CreditCard className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : (
                <AlertTriangle className={`h-5 w-5 ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`} />
              )}
            </div>
            
            <div>
              <h3 className={`font-bold text-lg ${isUrgent ? 'text-red-900 dark:text-red-100' : 'text-orange-900 dark:text-orange-100'}`}>
                {isPending && '🚀 Assine para Começar!'}
                {!isPending && expired && '🚨 Assinatura Expirada!'}
                {!isPending && !expired && '⚠️ Sua assinatura está expirando!'}
              </h3>
              <p className={`text-sm ${isUrgent ? 'text-red-700 dark:text-red-200' : 'text-orange-700 dark:text-orange-200'}`}>
                {isPending && 'Escolha um plano para desbloquear todas as funcionalidades do Financy!'}
                {!isPending && expired && 'Renove sua assinatura para continuar usando todas as funcionalidades.'}
                {!isPending && !expired && daysRemaining !== null && `Restam apenas ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}. Renove agora!`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {expired && daysRemaining !== null && daysRemaining < 0 && (
              <div className="text-xs px-3 py-1 rounded-full font-semibold bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200">
                Expirou há {Math.abs(daysRemaining)} {Math.abs(daysRemaining) === 1 ? 'dia' : 'dias'}
              </div>
            )}
            
            <Button
              onClick={handleNavigateToSubscription}
              className={`shadow-lg hover:shadow-xl transition-all ${
                isUrgent ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              <Crown className="h-4 w-4 mr-2" />
              {isPending ? 'Ver Planos' : 'Renovar Agora'}
            </Button>

            <button
              onClick={() => setDismissed(true)}
              className={`rounded-full p-1 transition-colors ${
                isUrgent 
                  ? 'hover:bg-red-200 text-red-600 dark:hover:bg-red-900 dark:text-red-400' 
                  : 'hover:bg-orange-200 text-orange-600 dark:hover:bg-orange-900 dark:text-orange-400'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
