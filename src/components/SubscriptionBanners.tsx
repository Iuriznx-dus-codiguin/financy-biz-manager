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
          rounded-lg shadow-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4
          ${isUrgent
            ? 'bg-destructive/10 border-red-500 dark:bg-red-950/30' 
            : 'bg-warning/10 border-orange-500 dark:bg-orange-950/30'
          }
        `}>
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className={`rounded-full p-2 shrink-0 ${isUrgent ? 'bg-destructive/10' : 'bg-warning/10'}`}>
              {isPending ? (
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              ) : (
                <AlertTriangle className={`h-4 w-4 sm:h-5 sm:w-5 ${isUrgent ? 'text-destructive' : 'text-warning'}`} />
              )}
            </div>
            
            <div className="min-w-0">
              <h3 className={`font-bold text-sm sm:text-lg leading-tight ${isUrgent ? 'text-red-900 dark:text-red-100' : 'text-orange-900 dark:text-orange-100'}`}>
                {isPending && '🚀 Assine para Começar!'}
                {!isPending && expired && '🚨 Assinatura Expirada!'}
                {!isPending && !expired && '⚠️ Sua assinatura está expirando!'}
              </h3>
              <p className={`text-xs sm:text-sm mt-0.5 ${isUrgent ? 'text-destructive' : 'text-warning'}`}>
                {isPending && 'Escolha um plano para desbloquear todas as funcionalidades!'}
                {!isPending && expired && 'Renove sua assinatura para continuar usando.'}
                {!isPending && !expired && daysRemaining !== null && `Restam apenas ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}. Renove agora!`}
              </p>
            </div>

            {/* Close button inline on mobile - apenas para avisos de proximidade de expiração */}
            {!isUrgent && (
              <button
                onClick={() => setDismissed(true)}
                className="sm:hidden rounded-full p-1 shrink-0 transition-colors hover:bg-orange-200 text-warning dark:hover:bg-orange-900 dark:text-orange-400"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {expired && daysRemaining !== null && daysRemaining < 0 && (
              <div className="hidden sm:block text-xs px-3 py-1 rounded-full font-semibold bg-destructive/10 text-red-800 dark:bg-destructive/10 dark:text-red-200">
                Expirou há {Math.abs(daysRemaining)} {Math.abs(daysRemaining) === 1 ? 'dia' : 'dias'}
              </div>
            )}
            
            <Button
              onClick={handleNavigateToSubscription}
              size="sm"
              className={`shadow-lg hover:shadow-xl transition-all w-full sm:w-auto ${
                isUrgent ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              <Crown className="h-4 w-4 mr-1.5" />
              {isPending ? 'Ver Planos' : 'Renovar Agora'}
            </Button>

            <button
              onClick={() => setDismissed(true)}
              className={`hidden sm:block rounded-full p-1 transition-colors ${
                isUrgent 
                  ? 'hover:bg-red-200 text-destructive dark:hover:bg-red-900 dark:text-red-400' 
                  : 'hover:bg-orange-200 text-warning dark:hover:bg-orange-900 dark:text-orange-400'
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
