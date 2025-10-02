import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TimeFilter } from '@/components/TimeFilter';
import { CompactDashboardSelector } from '@/components/CompactDashboardSelector';
import { Crown, Zap, Star, Settings, Code, Sparkles, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useOnboarding } from '@/hooks/useOnboarding';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FloatingDashboardInfoProps {
  timeFilter: string;
  setTimeFilter: (filter: string) => void;
  dashboardType?: 'basic' | 'advanced';
}

export const FloatingDashboardInfo: React.FC<FloatingDashboardInfoProps> = ({
  timeFilter,
  setTimeFilter,
  dashboardType = 'basic'
}) => {
  const { user } = useAuth();
  const { subscriptionTier } = useSubscription();
  const { isFeatureAvailable } = useFeatureAccess();
  const { onboardingData } = useOnboarding();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const userName = onboardingData?.nome_preferido || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      // Chamar a edge function para processar transações recorrentes
      const { error } = await supabase.functions.invoke('process-recurring-transactions');
      
      if (error) throw error;
      
      toast.success('Dados atualizados com sucesso!', {
        description: 'Transações recorrentes processadas'
      });
      
      // Recarregar a página para atualizar os dados
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      toast.error('Erro ao atualizar dados', {
        description: 'Tente novamente mais tarde'
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Configurações de cores e ícones baseadas no plano
  const getSubscriptionBadge = () => {
    const isDeveloper = isFeatureAvailable('developer_mode');
    const hasAdvancedIA = isFeatureAvailable('inteligencia_avancada');
    const hasBasicIA = isFeatureAvailable('inteligencia_basica');

    if (isDeveloper) {
      return {
        icon: Code,
        text: 'Desenvolvedor',
        gradient: 'from-emerald-500 to-teal-600',
        bgClass: 'bg-gradient-to-r from-emerald-500 to-teal-600'
      };
    }

    switch (subscriptionTier) {
      case 'enterprise':
        return {
          icon: Star,
          text: 'Enterprise',
          gradient: 'from-yellow-400 to-orange-500',
          bgClass: 'bg-gradient-to-r from-yellow-400 to-orange-500'
        };
      case 'premium':
        return {
          icon: Crown,
          text: 'Premium',
          gradient: 'from-indigo-500 to-purple-600',
          bgClass: 'bg-gradient-to-r from-indigo-500 to-purple-600'
        };
      case 'plus':
        return {
          icon: Zap,
          text: 'Plus',
          gradient: 'from-blue-500 to-cyan-600',
          bgClass: 'bg-gradient-to-r from-blue-500 to-cyan-600'
        };
      default:
        return {
          icon: Sparkles,
          text: 'Gratuito',
          gradient: 'from-gray-400 to-gray-600',
          bgClass: 'bg-gradient-to-r from-gray-400 to-gray-600'
        };
    }
  };

  const getIABadge = () => {
    if (isFeatureAvailable('inteligencia_avancada')) {
      return { text: 'IA Avançada', variant: 'secondary' as const };
    }
    if (isFeatureAvailable('inteligencia_basica')) {
      return { text: 'IA Básica', variant: 'outline' as const };
    }
    return null;
  };

  const subscriptionBadge = getSubscriptionBadge();
  const iaBadge = getIABadge();
  const IconComponent = subscriptionBadge.icon;

  return (
    <Card className="shadow-lg border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            {/* Saudação personalizada */}
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Olá, {userName}
              </h2>
            </div>

            {/* Badges de assinatura */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${subscriptionBadge.bgClass} text-white border-0 shadow-sm`}>
                <IconComponent className="h-3 w-3 mr-1" />
                {subscriptionBadge.text}
              </Badge>
              
              {iaBadge && (
                <Badge variant={iaBadge.variant} className="shadow-sm">
                  <Settings className="h-3 w-3 mr-1" />
                  {iaBadge.text}
                </Badge>
              )}
            </div>

            {/* Tipo de dashboard */}
            <div className="text-sm text-muted-foreground">
              {dashboardType === 'advanced' ? 'Dashboard Avançado' : 'Dashboard Principal'}
            </div>

            {/* Filtro de tempo atual */}
            <div className="text-xs text-muted-foreground">
              {timeFilter === 'este-mes' && 'Este Mês'}
              {timeFilter === 'ultimo-mes' && 'Último Mês'}
              {timeFilter === 'ultimos-3-meses' && 'Últimos 3 Meses'}
              {timeFilter === 'este-ano' && 'Este Ano'}
              {timeFilter === 'ultimo-ano' && 'Último Ano'}
              {timeFilter === 'todos' && 'Todos os Períodos'}
            </div>
          </div>

          {/* Controles */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefreshData}
              disabled={isRefreshing}
              className="rounded-xl"
              title="Atualizar e processar transações recorrentes"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <CompactDashboardSelector />
            <TimeFilter value={timeFilter} onChange={setTimeFilter} />
          </div>
        </div>
      </div>
    </Card>
  );
};