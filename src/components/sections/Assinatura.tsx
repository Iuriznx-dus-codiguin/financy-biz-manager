
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  CreditCard, 
  Check, 
  Calendar, 
  Crown, 
  Sparkles, 
  Bot, 
  User, 
  Building2,
  Star,
  Flame,
  MessageCircle,
  Users,
  TrendingUp,
  Shield,
  Zap,
  Code2,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { DeveloperAccessDialog } from '@/components/DeveloperAccessDialog';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Assinatura: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [planType, setPlanType] = useState<'personal' | 'business'>('personal');
  const [isDeveloperDialogOpen, setIsDeveloperDialogOpen] = useState(false);
  const { user } = useAuth();
  const { subscription, loading, isPremium } = useUserSubscription();

  const paymentUrls: Record<string, string> = {
    // Planos Pessoais - Mensal
    'personal-plus-monthly': 'https://pay.cakto.com.br/gbmkspq_506803',
    'personal-pro-monthly': 'https://pay.cakto.com.br/rtfgu9x_511525',
    
    // Planos Pessoais - Anual
    'personal-plus-annual': 'https://pay.cakto.com.br/39r822v',
    'personal-pro-annual': 'https://pay.cakto.com.br/jtvtbzy',
    
    // Planos Empresariais - Mensal
    'business-plus-monthly': 'https://pay.cakto.com.br/izhudpq_590408',
    'business-pro-monthly': 'https://pay.cakto.com.br/f7d9hvg_506809',
    'business-enterprise-monthly': 'https://pay.cakto.com.br/3ei5eox_590705',
    
    // Planos Empresariais - Anual
    'business-plus-annual': 'https://pay.cakto.com.br/cx7b7r6_590691',
    'business-pro-annual': 'https://pay.cakto.com.br/36ffsgo_590699',
    'business-enterprise-annual': 'https://pay.cakto.com.br/t2cpi2a_590702'
  };

  const handlePayment = (planId: string, period: string) => {
    const billing = period === 'annual' ? 'annual' : 'monthly';
    const urlKey = `${planId}-${billing}`;
    const url = paymentUrls[urlKey];
    
    if (url) {
      window.open(url, '_blank');
    } else {
      import('@/hooks/use-toast').then(({ toast }) => toast({ title: 'Erro', description: `URL de pagamento para este plano não está configurada ainda.`, variant: 'destructive' }));
    }
  };

  const getPrice = (monthlyPrice: number, annualPrice: number) => {
    if (isAnnual) {
      return {
        price: annualPrice,
        monthlyEquivalent: annualPrice / 12,
        period: '/ano',
        originalMonthly: monthlyPrice
      };
    }
    return {
      price: monthlyPrice,
      monthlyEquivalent: monthlyPrice,
      period: '/mês',
      originalMonthly: monthlyPrice
    };
  };

  const personalPlans = [
    {
      id: 'personal-plus',
      name: 'Plus',
      monthlyPrice: 19.90,
      annualPrice: 159.90,
      icon: <TrendingUp className="h-6 w-6" />,
      description: 'Controle financeiro pessoal completo',
      badge: 'Recomendado',
      recommended: true,
      features: [
        { name: 'Receitas/Despesas', value: 'ILIMITADAS' },
        { name: 'IA no WhatsApp', value: 'ILIMITADA (texto, áudio, foto)' },
        { name: 'Dashboard Pessoal', value: 'Básico' },
        { name: 'Contas Pessoais', value: 'Até 1' },
        { name: 'Suporte', value: 'Email/WhatsApp' }
      ]
    },
    {
      id: 'personal-pro',
      name: 'Pro',
      monthlyPrice: 34.90,
      annualPrice: 279.90,
      icon: <Flame className="h-6 w-6" />,
      description: 'Ideal para casais',
      badge: 'Popular',
      popular: true,
      features: [
        { name: 'Receitas/Despesas', value: 'ILIMITADAS' },
        { name: 'IA no WhatsApp', value: 'ILIMITADA (texto, áudio, foto)' },
        { name: 'Dashboard Pessoal', value: 'Avançado' },
        { name: 'Contas Pessoais', value: 'Até 3' },
        { name: 'Suporte', value: 'Email/WhatsApp 24/7' }
      ]
    }
  ];

  const businessPlans = [
    {
      id: 'business-plus',
      name: 'Plus',
      monthlyPrice: 44.90,
      annualPrice: 360.00,
      icon: <Sparkles className="h-6 w-6" />,
      description: 'Gestão empresarial completa',
      badge: 'Recomendado',
      recommended: true,
      features: [
        { name: 'Receitas/Despesas', value: 'ILIMITADAS' },
        { name: 'IA no WhatsApp', value: 'ILIMITADA (texto, áudio, foto)' },
        { name: 'Ferramentas empresariais', value: 'ILIMITADAS' },
        { name: 'Empresas', value: 'Até 1' },
        { name: 'Suporte', value: 'Email/WhatsApp 24/7' }
      ]
    },
    {
      id: 'business-pro',
      name: 'PRO',
      monthlyPrice: 97.00,
      annualPrice: 770.00,
      icon: <Flame className="h-6 w-6" />,
      description: 'Finanças pessoais e empresariais juntas',
      badge: 'Popular',
      popular: true,
      features: [
        { name: 'Receitas/Despesas', value: 'ILIMITADAS' },
        { name: 'IA no WhatsApp', value: 'ILIMITADA (texto, áudio, foto)' },
        { name: 'Ferramentas empresariais', value: 'ILIMITADAS' },
        { name: 'Empresas/Perfis', value: 'Até 2' },
        { name: 'Suporte', value: 'Email/WhatsApp 24/7' }
      ]
    },
    {
      id: 'business-enterprise',
      name: 'Super Company',
      monthlyPrice: 147.00,
      annualPrice: 1170.00,
      icon: <Shield className="h-6 w-6" />,
      description: 'Solução empresarial premium',
      features: [
        { name: 'Receitas/Despesas', value: 'ILIMITADAS' },
        { name: 'IA no WhatsApp', value: 'ILIMITADA (texto, áudio, foto)' },
        { name: 'Ferramentas empresariais', value: 'ILIMITADAS' },
        { name: 'Empresas/Perfis', value: 'Até 10' },
        { name: 'Suporte', value: 'Email/WhatsApp 24/7' }
      ]
    }
  ];

  const currentPlans = planType === 'personal' ? personalPlans : businessPlans;

  const handleDeveloperAccess = () => {
    setIsDeveloperDialogOpen(true);
  };

  const isPersonalPlan = subscription?.plan_name?.toLowerCase().includes('pessoal') || 
                         subscription?.plan_name?.toLowerCase().includes('plus') ||
                         subscription?.plan_name?.toLowerCase().includes('pro');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se usuário tem plano ativo
  if (isPremium() && subscription) {
    return (
      <div className="space-y-8">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Sua Assinatura Atual</CardTitle>
                  <CardDescription>Plano ativo e recursos disponíveis</CardDescription>
                </div>
              </div>
              <Badge className="bg-green-500 text-white px-4 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Ativo
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Plano Atual</p>
                <p className="text-2xl font-bold text-foreground">{subscription.plan_name}</p>
                <Badge variant="outline" className="mt-2">
                  {subscription.billing_period === 'yearly' ? 'Anual' : 'Mensal'}
                </Badge>
              </div>
              
              {subscription.expires_at && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Próxima Renovação</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <p className="text-lg font-semibold text-foreground">
                      {format(new Date(subscription.expires_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">Renovação automática</p>
                </div>
              )}
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {subscription.amount ? subscription.amount.toFixed(2) : '0,00'}
                </p>
                <p className="text-xs text-muted-foreground">
                  /{subscription.billing_period === 'yearly' ? 'ano' : 'mês'}
                </p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Recursos do Seu Plano
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subscription.features && (
                  <>
                    {subscription.features.max_dashboards && (
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Perfis/Empresas</p>
                          <p className="text-sm text-muted-foreground">
                            {subscription.features.max_dashboards === -1 ? 'Ilimitados' : `Até ${subscription.features.max_dashboards}`}
                          </p>
                        </div>
                      </div>
                    )}
                    {subscription.features.whatsapp_integration && (
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">WhatsApp IA</p>
                          <p className="text-sm text-muted-foreground">ILIMITADA (texto, áudio, foto)</p>
                        </div>
                      </div>
                    )}
                    {subscription.features.advanced_analytics && (
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Dashboard Avançado</p>
                          <p className="text-sm text-muted-foreground">Análises completas</p>
                        </div>
                      </div>
                    )}
                    {subscription.features.export_data && (
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Exportação de Dados</p>
                          <p className="text-sm text-muted-foreground">Excel, PDF, CSV</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {isPersonalPlan && (
          <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-50/50 via-purple-50/50 to-blue-50/50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-blue-950/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-blue-900 dark:text-blue-100">
                    Faça Upgrade para Plano Empresarial
                  </CardTitle>
                  <CardDescription className="text-blue-700 dark:text-blue-300">
                    Gerencie suas finanças pessoais E empresariais em um único plano
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => setPlanType('business')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg py-6"
              >
                Ver Planos Empresariais
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Precisa de Ajuda?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Entre em contato com nosso suporte para dúvidas sobre sua assinatura.
            </p>
            <Button variant="outline" className="w-full" onClick={() => window.open('https://wa.me/5511999999999', '_blank')}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Falar com Suporte
            </Button>
          </CardContent>
        </Card>

        <DeveloperAccessDialog 
          isOpen={isDeveloperDialogOpen}
          onClose={() => setIsDeveloperDialogOpen(false)}
        />
      </div>
    );
  }

  // Tela de seleção de planos
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-foreground">Escolha seu Plano</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Gestão financeira inteligente para pessoas físicas e empresas. 
          Transforme sua relação com o dinheiro com nossa plataforma completa.
        </p>

        {/* Banner de Desconto Anual */}
        <div className="relative overflow-hidden bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 rounded-2xl p-6 shadow-2xl animate-pulse max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-10 w-10 text-white animate-bounce" />
              <div className="text-left">
                <div className="text-3xl md:text-4xl font-black text-white leading-tight">
                  4 MESES GRÁTIS
                </div>
                <div className="text-sm md:text-base text-white/90 font-medium">
                  em todos os planos anuais
                </div>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-white/30"></div>
            <div className="text-white/95 text-center md:text-left">
              <div className="text-lg font-semibold">Economize até 33%</div>
              <div className="text-sm text-white/80">Escolha o plano anual</div>
            </div>
          </div>
        </div>
        
        {/* Toggle Pessoal/Empresarial */}
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant={planType === 'personal' ? 'default' : 'outline'}
            onClick={() => setPlanType('personal')}
            className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-300"
          >
            <User className="h-4 w-4" />
            Planos Pessoais
          </Button>
          <Button
            variant={planType === 'business' ? 'default' : 'outline'}
            onClick={() => setPlanType('business')}
            className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-300"
          >
            <Building2 className="h-4 w-4" />
            Planos Empresariais
          </Button>
        </div>
        
        {/* Toggle Mensal/Anual */}
        <div className="flex items-center justify-center space-x-4 bg-muted/50 rounded-lg p-4 max-w-md mx-auto">
          <Label htmlFor="billing-toggle" className={`font-medium transition-colors ${!isAnnual ? 'text-primary' : 'text-muted-foreground'}`}>
            Mensal
          </Label>
          <Switch
            id="billing-toggle"
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
            className="data-[state=checked]:bg-primary"
          />
          <Label htmlFor="billing-toggle" className={`font-medium transition-colors ${isAnnual ? 'text-primary' : 'text-muted-foreground'}`}>
            Anual
          </Label>
          {isAnnual && (
            <Badge className="bg-green-500 text-white">
              4 MESES GRÁTIS
            </Badge>
          )}
        </div>
      </div>

      {/* Cards dos Planos */}
      <div className={`grid grid-cols-1 ${currentPlans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'} gap-6`}>
        {currentPlans.map((plan) => {
          const pricing = getPrice(plan.monthlyPrice, plan.annualPrice);
          
          return (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-300 hover:shadow-xl ${
                plan.popular || plan.recommended ? 'border-primary shadow-lg scale-105' : ''
              }`}
            >
              {(plan.popular || plan.recommended) && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className={`px-3 py-1 rounded-full text-white ${
                    plan.popular ? 'bg-orange-500' : 'bg-purple-600'
                  }`}>
                    {plan.popular && <Flame className="h-3 w-3 mr-1" />}
                    {plan.recommended && <Star className="h-3 w-3 mr-1" />}
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="w-12 h-12 mx-auto bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                  {plan.icon}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                
                <div className="space-y-2 pt-4">
                  {isAnnual && (
                    <div className="text-sm text-muted-foreground line-through">
                      R$ {plan.monthlyPrice.toFixed(2)}/mês
                    </div>
                  )}
                  <div className="text-3xl font-bold text-foreground">
                    R$ {isAnnual ? pricing.monthlyEquivalent.toFixed(2) : pricing.price.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    /mês
                    {isAnnual && (
                      <div className="text-xs mt-1">
                        Total anual: R$ {pricing.price.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={() => handlePayment(plan.id, isAnnual ? 'annual' : 'monthly')}
                  className="w-full mt-4 transition-all duration-300 bg-green-600 hover:bg-green-700 text-white shadow-lg"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Assinar Agora
                </Button>
              </CardHeader>

              <CardContent className="space-y-3">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-foreground">
                        {feature.name}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {feature.value}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Status da Assinatura */}
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Status da Assinatura Atual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-800 dark:text-blue-200">Aguardando Pagamento</span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
              Escolha um plano acima para desbloquear todas as funcionalidades do Financy.
            </p>
          </div>

          <div className="pt-2 border-t border-border/50">
            <div className="text-center">
              <Button
                onClick={handleDeveloperAccess}
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-primary"
              >
                <Code2 className="h-3 w-3 mr-1" />
                Acesso Desenvolvedor
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Perguntas Frequentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Como funciona o pagamento?
              </h4>
              <p className="text-sm text-muted-foreground">
                Após escolher o plano, você será redirecionado para o checkout seguro. Após a confirmação, o acesso é liberado imediatamente.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Posso trocar de plano depois?
              </h4>
              <p className="text-sm text-muted-foreground">
                Sim, você pode mudar de plano a qualquer momento sem perder seus dados.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                IA significa que um humano vai me atender?
              </h4>
              <p className="text-sm text-muted-foreground">
                Não. IA significa Inteligência Artificial treinada para guiar você financeiramente.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                E se eu for uma empresa mas assinar o plano pessoal?
              </h4>
              <p className="text-sm text-muted-foreground">
                Você pode, mas não terá acesso aos recursos tributários e gestão de equipe disponíveis nos planos empresariais.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DeveloperAccessDialog
        isOpen={isDeveloperDialogOpen}
        onClose={() => setIsDeveloperDialogOpen(false)}
      />
    </div>
  );
};

export default Assinatura;
