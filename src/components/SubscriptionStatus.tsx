import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Calendar, CreditCard, Crown, AlertTriangle } from 'lucide-react';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { motion } from 'framer-motion';

export const SubscriptionStatus: React.FC = () => {
  const { 
    subscription, 
    loading, 
    error, 
    isSubscriptionExpired, 
    isFreeTrial, 
    isPremium,
    getDaysUntilExpiration 
  } = useUserSubscription();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-gray-300 h-12 w-12"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !subscription) {
    return (
      <Alert className="border-destructive/20 bg-destructive/5">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar informações da assinatura. {error}
        </AlertDescription>
      </Alert>
    );
  }

  const daysUntilExpiration = getDaysUntilExpiration();
  const isExpired = isSubscriptionExpired();
  const isTrialUser = isFreeTrial();
  const isPremiumUser = isPremium();

  const getStatusColor = () => {
    if (isExpired) return 'destructive';
    if (isTrialUser) return 'secondary';
    if (isPremiumUser) return 'default';
    return 'outline';
  };

  const getStatusIcon = () => {
    if (isPremiumUser) return Crown;
    if (isTrialUser) return Clock;
    return CreditCard;
  };

  const StatusIcon = getStatusIcon();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="relative overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          isPremiumUser ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
          isTrialUser ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
          'bg-gray-300'
        }`} />
        
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <StatusIcon className={`h-5 w-5 ${
                isPremiumUser ? 'text-yellow-600' :
                isTrialUser ? 'text-blue-600' :
                'text-gray-600'
              }`} />
              Status da Assinatura
            </CardTitle>
            <Badge variant={getStatusColor()}>
              {isExpired ? 'Expirada' : subscription.status === 'active' ? 'Ativa' : subscription.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Plano Atual</h4>
              <p className="font-semibold">{subscription.plan_name}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Tipo</h4>
              <p className="font-semibold capitalize">{subscription.subscription_type.replace('_', ' ')}</p>
            </div>
          </div>

          {subscription.expires_at && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Data de Expiração
                </h4>
                <p className="font-semibold">
                  {new Date(subscription.expires_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              
              {daysUntilExpiration !== null && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Dias Restantes
                  </h4>
                  <p className={`font-semibold ${
                    daysUntilExpiration <= 7 ? 'text-destructive' :
                    daysUntilExpiration <= 30 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {daysUntilExpiration} dias
                  </p>
                </div>
              )}
            </div>
          )}

          {subscription.amount > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Valor</h4>
                <p className="font-semibold">
                  {subscription.currency} {subscription.amount.toFixed(2)}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Período</h4>
                <p className="font-semibold capitalize">{subscription.billing_period}</p>
              </div>
            </div>
          )}

          {/* Recursos disponíveis */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">Recursos Disponíveis</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span>Dashboards:</span>
                <span className="font-semibold">{subscription.features.max_dashboards || 1}</span>
              </div>
              <div className="flex justify-between">
                <span>IA/mês:</span>
                <span className="font-semibold">{subscription.features.ai_requests_per_month || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Membros:</span>
                <span className="font-semibold">{subscription.features.team_members || 1}</span>
              </div>
              <div className="flex justify-between">
                <span>WhatsApp:</span>
                <span className="font-semibold">{subscription.features.whatsapp_integration ? '✓' : '✗'}</span>
              </div>
            </div>
          </div>

          {/* Alertas baseados no status */}
          {isExpired && (
            <Alert className="border-destructive/20 bg-destructive/5">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Sua assinatura expirou. Renove para continuar usando todos os recursos.
              </AlertDescription>
            </Alert>
          )}

          {isTrialUser && daysUntilExpiration !== null && daysUntilExpiration <= 7 && (
            <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Seu teste gratuito expira em {daysUntilExpiration} dias. Faça upgrade para continuar.
              </AlertDescription>
            </Alert>
          )}

          {(isExpired || (isTrialUser && daysUntilExpiration !== null && daysUntilExpiration <= 3)) && (
            <Button className="w-full" size="sm">
              {isExpired ? 'Renovar Assinatura' : 'Fazer Upgrade'}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};