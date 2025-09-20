import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Calendar, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface FreeTrialNotificationProps {
  setActiveSection?: (section: string) => void;
}

export const FreeTrialNotification: React.FC<FreeTrialNotificationProps> = ({ setActiveSection }) => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    if (!user) return;

    checkTrialStatus();
  }, [user]);

  const checkTrialStatus = async () => {
    try {
      const { data: subscriber } = await supabase
        .from('subscribers')
        .select('*')
        .eq('email', user?.email)
        .maybeSingle();

      if (!subscriber?.subscribed) {
        // Simular teste gratuito de 7 dias
        const userCreatedAt = new Date(user?.created_at || new Date());
        const trialEnd = new Date(userCreatedAt);
        trialEnd.setDate(trialEnd.getDate() + 7);
        
        const now = new Date();
        const timeDiff = trialEnd.getTime() - now.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        if (daysRemaining <= 3 && daysRemaining > 0) {
          setTrialEndDate(trialEnd);
          setDaysLeft(daysRemaining);
          setIsVisible(true);
        } else if (daysRemaining <= 0) {
          // Trial expirado - redirecionar para assinatura
          if (setActiveSection) {
            setActiveSection('assinatura');
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status do trial:', error);
    }
  };

  const handleGoToSubscription = () => {
    if (setActiveSection) {
      setActiveSection('assinatura');
    }
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !user || !trialEndDate) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  Teste Gratuito
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  Seu teste gratuito acaba em {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  {trialEndDate.toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-orange-500 hover:text-orange-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 flex space-x-2">
            <Button
              onClick={handleGoToSubscription}
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              Assinar Agora
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};