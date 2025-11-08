import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Clock, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PromotionBannerProps {
  userCreatedAt: string;
}

export const PromotionBanner: React.FC<PromotionBannerProps> = ({ userCreatedAt }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0 });
  
  const COUPON_CODE = 'oferta10';
  const PROMOTION_DAYS = 7;

  useEffect(() => {
    // Verificar se o banner foi fechado anteriormente
    const wasClosed = localStorage.getItem('promotion-banner-closed');
    if (wasClosed === 'true') {
      setIsVisible(false);
      return;
    }

    // Calcular tempo restante
    const createdDate = new Date(userCreatedAt);
    const expirationDate = new Date(createdDate);
    expirationDate.setDate(expirationDate.getDate() + PROMOTION_DAYS);

    const updateTimer = () => {
      const now = new Date();
      const diff = expirationDate.getTime() - now.getTime();

      if (diff <= 0) {
        setIsVisible(false);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining({ days, hours, minutes });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, [userCreatedAt]);

  const handleCopyCoupon = () => {
    navigator.clipboard.writeText(COUPON_CODE);
    toast.success('Código copiado!', {
      description: 'Cole o código no checkout para aplicar o desconto'
    });
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('promotion-banner-closed', 'true');
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 p-1 mb-6"
      >
        <div className="bg-gradient-to-br from-orange-50/95 via-pink-50/95 to-purple-50/95 dark:from-orange-950/95 dark:via-pink-950/95 dark:to-purple-950/95 rounded-xl p-4 sm:p-6">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6 rounded-full opacity-70 hover:opacity-100"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Lado Esquerdo - Mensagem */}
            <div className="flex items-center gap-3 flex-1">
              <div className="hidden sm:block p-3 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2 justify-center sm:justify-start">
                  <Gift className="h-5 w-5 sm:hidden text-orange-600" />
                  🎉 OFERTA ESPECIAL - 10% DE DESCONTO!
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Válido por mais {timeRemaining.days > 0 && `${timeRemaining.days}d `}
                  {timeRemaining.hours}h e {timeRemaining.minutes}min
                </p>
              </div>
            </div>

            {/* Lado Direito - Cupom */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2 bg-white dark:bg-gray-900 px-4 py-2 rounded-lg border-2 border-dashed border-orange-500">
                <span className="text-sm font-mono font-bold text-orange-600 dark:text-orange-400">
                  {COUPON_CODE}
                </span>
              </div>
              <Button
                onClick={handleCopyCoupon}
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-lg"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Código
              </Button>
            </div>
          </div>

          {/* Barra de Progresso Animada */}
          <div className="mt-4 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600"
              initial={{ width: '100%' }}
              animate={{ 
                width: `${(timeRemaining.days * 24 * 60 + timeRemaining.hours * 60 + timeRemaining.minutes) / (PROMOTION_DAYS * 24 * 60) * 100}%` 
              }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
