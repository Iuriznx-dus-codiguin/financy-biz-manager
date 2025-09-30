
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
  AlertTriangle, 
  Crown, 
  Sparkles, 
  Bot, 
  Lock, 
  User, 
  Building2,
  Star,
  Flame,
  MessageCircle,
  Users,
  TrendingUp,
  Shield,
  Zap,
  Code2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { DeveloperAccessDialog } from '@/components/DeveloperAccessDialog';

const Assinatura: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [planType, setPlanType] = useState<'personal' | 'business'>('personal');
  const [isDeveloperDialogOpen, setIsDeveloperDialogOpen] = useState(false);
  const { user } = useAuth();

  const paymentUrls = {
    // Planos Pessoais - Mensal
    'personal-basic-monthly': 'https://pay.cakto.com.br/32twvdb_506799',
    'personal-plus-monthly': 'https://pay.cakto.com.br/gbmkspq_506803',
    'personal-pro-monthly': 'https://pay.cakto.com.br/rtfgu9x_511525',
    'personal-enterprise-monthly': 'https://pay.cakto.com.br/6m4eyqf_506810',
    
    // Planos Pessoais - Anual
    'personal-basic-annual': 'https://pay.cakto.com.br/ydsbtqa',
    'personal-plus-annual': 'https://pay.cakto.com.br/39r822v',
    'personal-pro-annual': 'https://pay.cakto.com.br/jtvtbzy',
    'personal-enterprise-annual': 'https://pay.cakto.com.br/d73estf',
    
    // Planos Empresariais - Mensal
    'business-plus-monthly': 'https://pay.cakto.com.br/izhudpq_590408',
    'business-premium-monthly': 'https://pay.cakto.com.br/34ngzrg_511510',
    'business-pro-monthly': 'https://pay.cakto.com.br/f7d9hvg_506809',
    'business-enterprise-monthly': 'https://pay.cakto.com.br/3ei5eox_590705',
    
    // Planos Empresariais - Anual
    'business-plus-annual': 'https://pay.cakto.com.br/cx7b7r6_590691',
    'business-premium-annual': 'https://pay.cakto.com.br/5bz2sy4_590696',
    'business-pro-annual': 'https://pay.cakto.com.br/36ffsgo_590699',
    'business-enterprise-annual': 'https://pay.cakto.com.br/t2cpi2a_590702'
  };

  const handlePayment = (planId: string, period: string) => {
    // Corrigir o mapeamento para corresponder às chaves dos paymentUrls
    const billing = period === 'annual' ? 'annual' : 'monthly';
    const urlKey = `${planId}-${billing}` as keyof typeof paymentUrls;
    const url = paymentUrls[urlKey];
    
    // Payment processing - debug logging removed for security
    
    if (url && url !== '#') {
      window.open(url, '_blank');
    } else {
      alert(`URL de pagamento para ${planId} (${billing}) não configurada ainda. Chave procurada: ${urlKey}`);
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
      id: 'personal-basic',
      name: 'Básico',
      monthlyPrice: 24.90,
      annualPrice: 197.00,
      icon: <User className="h-6 w-6" />,
      description: 'Para controle financeiro pessoal simples',
      features: [
        { name: 'Dashboard pessoal', value: 'Simples' },
        { name: 'Receitas/Despesas', value: 'ILIMITADAS' },
        { name: 'Multi-Dashboard', value: '1 dashboard' },
        { name: 'IA no WhatsApp', value: false },
        { name: 'Suporte', value: 'Email' },
        { name: 'Teste gratuito', value: '7 dias' }
      ]
    },
    {
      id: 'personal-plus',
      name: 'Plus',
      monthlyPrice: 34.90,
      annualPrice: 280.00,
      icon: <TrendingUp className="h-6 w-6" />,
      description: 'Gestão financeira pessoal avançada',
      badge: 'Recomendado',
      recommended: true,
      features: [
        { name: 'Dashboard pessoal', value: 'Avançado' },
        { name: 'Receitas/Despesas', value: 'ILIMITADAS' },
        { name: 'IA no WhatsApp', value: 'ILIMITADO (texto, áudio, imagem)' },
        { name: 'Multi-Dashboard', value: '1 dashboard' },
        { name: 'Suporte', value: 'Email/WhatsApp' },
        { name: 'Teste gratuito', value: '7 dias' }
      ]
    },
    {
      id: 'personal-pro',
      name: 'PRO',
      monthlyPrice: 44.90,
      annualPrice: 360.00,
      icon: <Flame className="h-6 w-6" />,
      description: 'Ideal para casais',
      badge: 'Popular',
      popular: true,
      features: [
        { name: 'Dashboard pessoal', value: 'Avançado' },
        { name: 'Receitas/Despesas', value: 'ILIMITADAS' },
        { name: 'IA no WhatsApp', value: 'ILIMITADO (texto, áudio, imagem)' },
        { name: 'Multi-Dashboard', value: '2 dashboards' },
        { name: 'Suporte', value: 'Email/WhatsApp 24/7' },
        { name: 'Teste gratuito', value: '7 dias' }
      ]
    },
    {
      id: 'personal-enterprise',
      name: 'Família',
      monthlyPrice: 97.00,
      annualPrice: 770.00,
      icon: <Users className="h-6 w-6" />,
      description: 'Máximo controle familiar',
      features: [
        { name: 'Dashboard pessoal', value: 'Avançado' },
        { name: 'Receitas/Despesas', value: 'ILIMITADAS' },
        { name: 'IA no WhatsApp', value: 'ILIMITADO (texto, áudio, imagem)' },
        { name: 'Multi-Dashboard', value: '10 dashboards' },
        { name: 'Suporte', value: 'Email/WhatsApp 24/7' },
        { name: 'Teste gratuito', value: '7 dias' }
      ]
    }
  ];

  const businessPlans = [
    {
      id: 'business-plus',
      name: 'Básico',
      monthlyPrice: 34.90,
      annualPrice: 280.00,
      icon: <Building2 className="h-6 w-6" />,
      description: 'Gestão empresarial essencial',
      features: [
        { name: 'Dashboard empresarial', value: 'Simples' },
        { name: 'Receitas/Despesas', value: 'ILIMITADAS' },
        { name: 'Ferramentas empresariais', value: 'ILIMITADAS' },
        { name: 'Multi-Dashboard', value: '1 dashboard empresarial' },
        { name: 'IA no WhatsApp', value: false },
        { name: 'Suporte', value: 'Email/WhatsApp' },
        { name: 'Teste gratuito', value: '7 dias' }
      ]
    },
    {
      id: 'business-premium',
      name: 'Plus',
      monthlyPrice: 44.90,
      annualPrice: 360.00,
      icon: <Sparkles className="h-6 w-6" />,
      description: 'Gestão empresarial completa',
      badge: 'Recomendado',
      recommended: true,
      features: [
        { name: 'Dashboard empresarial', value: 'Avançado' },
        { name: 'Receitas/Despesas', value: 'ILIMITADAS' },
        { name: 'IA no WhatsApp', value: 'ILIMITADO (texto, áudio, imagem)' },
        { name: 'Ferramentas empresariais', value: 'ILIMITADAS' },
        { name: 'Multi-Dashboard', value: '1 dashboard empresarial' },
        { name: 'Suporte', value: 'Email/WhatsApp 24/7' },
        { name: 'Teste gratuito', value: '7 dias' }
      ]
    },
    {
      id: 'business-pro',
      name: 'PRO',
      monthlyPrice: 97.00,
      annualPrice: 770.00,
      icon: <Flame className="h-6 w-6" />,
      description: 'Ideal para administrar as finanças pessoais e empresariais',
      badge: 'Popular',
      popular: true,
      features: [
        { name: 'Dashboard empresarial', value: 'Avançado' },
        { name: 'Receitas/Despesas', value: 'ILIMITADAS' },
        { name: 'IA no WhatsApp', value: 'ILIMITADO (texto, áudio, imagem)' },
        { name: 'Ferramentas empresariais', value: 'ILIMITADAS' },
        { name: 'Multi-Dashboard', value: '2 dashboards (Empresariais/pessoais)' },
        { name: 'Suporte', value: 'Email/WhatsApp 24/7' },
        { name: 'Teste gratuito', value: '7 dias' }
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
        { name: 'Dashboard empresarial', value: 'Avançado' },
        { name: 'Receitas/Despesas', value: 'ILIMITADAS' },
        { name: 'IA no WhatsApp', value: 'ILIMITADO (texto, áudio, imagem)' },
        { name: 'Ferramentas empresariais', value: 'ILIMITADAS' },
        { name: 'Multi-Dashboard', value: '10 dashboards (Empresariais/Pessoais)' },
        { name: 'Suporte', value: 'Email/WhatsApp 24/7' },
        { name: 'Teste gratuito', value: '7 dias' }
      ]
    }
  ];

  const currentPlans = planType === 'personal' ? personalPlans : businessPlans;

  const handleDeveloperAccess = () => {
    setIsDeveloperDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-foreground">Escolha seu Plano</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Gestão financeira inteligente para pessoas físicas e empresas. 
          Transforme sua relação com o dinheiro com nossa plataforma completa.
        </p>

        {/* Banner de Desconto Anual - Destaque */}
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
        
        {/* Toggle Planos Pessoais/Empresariais */}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {currentPlans.map((plan) => {
          const pricing = getPrice(plan.monthlyPrice, plan.annualPrice);
          
          return (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-300 hover:shadow-xl ${
                plan.popular || plan.recommended ? 'border-primary shadow-lg scale-105' : ''
              }`}
            >
              {/* Badge do Plano */}
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
                
                {/* Preço */}
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
                    {typeof feature.value === 'boolean' ? (
                      feature.value ? (
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <span className="h-4 w-4 text-muted-foreground flex-shrink-0">×</span>
                      )
                    ) : (
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <span className="text-sm font-medium text-foreground">
                        {feature.name}
                      </span>
                      {typeof feature.value === 'string' && (
                        <div className="text-xs text-muted-foreground">
                          {feature.value}
                        </div>
                      )}
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
              <AlertTriangle className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-800 dark:text-blue-200">Período de Teste Gratuito</span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
              Você está em seu período de teste gratuito de 7 dias. 
              Assine um plano para continuar aproveitando nossa plataforma após o teste.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium text-blue-600">Teste Gratuito</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plano Ativo:</span>
                <span className="font-medium">Nenhum</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Próximo Vencimento:</span>
                <span className="font-medium">--</span>
              </div>
            </div>
          </div>

          {/* Área de status do teste */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                Status da Integração
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                A integração com o sistema de pagamentos está ativa e funcionando corretamente.
                Suas assinaturas serão ativadas automaticamente após o pagamento.
              </p>
            </div>
          </div>

          {/* Botão de acesso desenvolvedor - mais discreto */}
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

      {/* FAQ Atualizada */}
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
                <Calendar className="h-4 w-4 text-primary" />
                O que acontece após os 7 dias de teste gratuito?
              </h4>
              <p className="text-sm text-muted-foreground">
                Nada será cobrado automaticamente. Você escolhe se deseja assinar.
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
                <Users className="h-4 w-4 text-primary" />
                O que é um Multi-Dashboard?
              </h4>
              <p className="text-sm text-muted-foreground">
                É a capacidade de criar diferentes visões/empresas/pessoas em dashboards separados.
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
