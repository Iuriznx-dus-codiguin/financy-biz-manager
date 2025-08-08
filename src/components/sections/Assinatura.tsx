
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

const Assinatura: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [planType, setPlanType] = useState<'personal' | 'business'>('personal');
  const [isActivatingDeveloper, setIsActivatingDeveloper] = useState(false);
  const { user } = useAuth();

  const paymentUrls = {
    // Planos Pessoais - Mensal
    'personal-basic-monthly': 'https://pay.cakto.com.br/32twvdb_506799',
    'personal-plus-monthly': 'https://pay.cakto.com.br/gbmkspq_506803',
    'personal-pro-monthly': 'https://pay.cakto.com.br/f7d9hvg_506809',
    'personal-enterprise-monthly': 'https://pay.cakto.com.br/6m4eyqf_506810',
    
    // Planos Pessoais - Anual
    'personal-basic-annual': 'https://pay.cakto.com.br/ydsbtqa',
    'personal-plus-annual': 'https://pay.cakto.com.br/39r822v',
    'personal-pro-annual': 'https://pay.cakto.com.br/jtvtbzy',
    'personal-enterprise-annual': 'https://pay.cakto.com.br/d73estf',
    
    // URLs dos planos empresariais serão configuradas posteriormente
    'business-plus-monthly': '#',
    'business-premium-monthly': '#',
    'business-pro-monthly': '#',
    'business-enterprise-monthly': '#',
    'business-plus-annual': '#',
    'business-premium-annual': '#',
    'business-pro-annual': '#',
    'business-enterprise-annual': '#'
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

  const getPrice = (monthlyPrice: number, annualDiscount: number) => {
    if (isAnnual) {
      const annualPrice = monthlyPrice * 12;
      const discountedPrice = annualPrice * (1 - annualDiscount / 100);
      return {
        price: discountedPrice,
        monthlyEquivalent: discountedPrice / 12,
        period: '/ano',
        discount: annualDiscount,
        originalPrice: annualPrice
      };
    }
    return {
      price: monthlyPrice,
      monthlyEquivalent: monthlyPrice,
      period: '/mês',
      discount: 0,
      originalPrice: monthlyPrice
    };
  };

  const personalPlans = [
    {
      id: 'personal-basic',
      name: 'Básico',
      monthlyPrice: 34.90,
      annualDiscount: 20,
      icon: <User className="h-6 w-6" />,
      description: 'Para controle financeiro pessoal simples',
      features: [
        { name: 'Dashboard pessoal', value: 'Simples' },
        { name: 'Agente de IA Financeira', value: false },
        { name: 'Multi-Dashboard', value: '1' },
        { name: 'Suporte por E-mail/WhatsApp', value: 'Básico' },
        { name: 'Acesso a IA Especialista Pessoal', value: false },
        { name: 'Acesso ao Chatbot inteligente', value: false },
        { name: 'Ferramentas (despesas, ganhos)', value: 'Ilimitadas' },
        { name: 'Teste gratuito', value: '7 dias' }
      ]
    },
    {
      id: 'personal-plus',
      name: 'Plus',
      monthlyPrice: 49.90,
      annualDiscount: 20,
      icon: <TrendingUp className="h-6 w-6" />,
      description: 'Gestão financeira pessoal avançada',
      features: [
        { name: 'Dashboard pessoal', value: 'Avançado' },
        { name: 'Agente de IA Financeira', value: false },
        { name: 'Multi-Dashboard', value: '3' },
        { name: 'Suporte por E-mail/WhatsApp', value: 'Intermediário' },
        { name: 'Acesso a IA Especialista Pessoal', value: false },
        { name: 'Acesso ao Chatbot inteligente', value: false },
        { name: 'Ferramentas (despesas, ganhos)', value: 'Ilimitadas' },
        { name: 'Teste gratuito', value: '7 dias' }
      ]
    },
    {
      id: 'personal-pro',
      name: 'PRO',
      monthlyPrice: 67.90,
      annualDiscount: 20,
      icon: <Flame className="h-6 w-6" />,
      description: 'Dashboard Avançada com IA',
      badge: 'Plano Popular',
      popular: true,
      features: [
        { name: 'Dashboard Avançada', value: true },
        { name: 'Multi Dashboard', value: '5 painéis' },
        { name: 'Agente de Suporte IA', value: true },
        { name: 'Agente de Inteligência Financeira IA', value: true },
        { name: 'Suporte por E-mail e WhatsApp', value: true },
        { name: 'Recursos ilimitados', value: true },
        { name: 'Notificações Financeiras Inteligentes', value: true },
        { name: 'Teste gratuito', value: '7 dias' }
      ]
    },
    {
      id: 'personal-enterprise',
      name: 'Enterprise',
      monthlyPrice: 97.00,
      annualDiscount: 20,
      icon: <Crown className="h-6 w-6" />,
      description: 'Máximo controle com IA especializada',
      badge: 'Recomendado',
      recommended: true,
      features: [
        { name: 'Dashboard pessoal', value: 'Avançado' },
        { name: 'Agente de IA Financeira', value: true },
        { name: 'Multi-Dashboard', value: 'Ilimitado' },
        { name: 'Suporte por E-mail/WhatsApp', value: 'Prioritário' },
        { name: 'Acesso a IA Especialista Pessoal', value: 'Especialista Pessoal' },
        { name: 'Acesso ao Chatbot inteligente', value: true },
        { name: 'Ferramentas (despesas, ganhos)', value: 'Ilimitadas' },
        { name: 'Teste gratuito', value: '7 dias' }
      ]
    }
  ];

  const businessPlans = [
    {
      id: 'business-plus',
      name: 'Plus',
      monthlyPrice: 50.00,
      annualDiscount: 20,
      icon: <Building2 className="h-6 w-6" />,
      description: 'Gestão empresarial essencial',
      badge: 'Mais Popular',
      popular: true,
      features: [
        { name: 'Dashboard empresarial', value: 'Simples' },
        { name: 'Dashboard pessoal incluído', value: true },
        { name: 'Multi-Dashboard', value: '3' },
        { name: 'IA Financeira', value: true },
        { name: 'IA Especialista em Impostos', value: true },
        { name: 'Gestão de equipe', value: 'Básica' },
        { name: 'Relatórios de impostos e taxas', value: true },
        { name: 'Suporte (e-mail, WhatsApp, IA)', value: 'Intermediário' },
        { name: 'Teste gratuito', value: '7 dias' }
      ]
    },
    {
      id: 'business-premium',
      name: 'Premium',
      monthlyPrice: 89.90,
      annualDiscount: 20,
      icon: <Sparkles className="h-6 w-6" />,
      description: 'Gestão empresarial completa',
      features: [
        { name: 'Dashboard empresarial', value: 'Avançado' },
        { name: 'Dashboard pessoal incluído', value: true },
        { name: 'Multi-Dashboard', value: '5' },
        { name: 'IA Financeira', value: true },
        { name: 'IA Especialista em Impostos', value: true },
        { name: 'Gestão de equipe', value: 'Avançada' },
        { name: 'Relatórios de impostos e taxas', value: true },
        { name: 'Suporte (e-mail, WhatsApp, IA)', value: 'Avançado' },
        { name: 'Teste gratuito', value: '7 dias' }
      ]
    },
    {
      id: 'business-pro',
      name: 'PRO',
      monthlyPrice: 119.90,
      annualDiscount: 20,
      icon: <Flame className="h-6 w-6" />,
      description: 'Solução empresarial avançada',
      badge: 'Plano Popular',
      popular: true,
      features: [
        { name: 'Tudo do Pessoal PRO', value: true },
        { name: 'Dashboard Empresarial', value: 'Avançado' },
        { name: 'Multi Dashboard', value: '8 painéis' },
        { name: 'Agente Especialista em Impostos IA', value: true },
        { name: 'Gestão de Equipe com permissões', value: true },
        { name: 'Gestão de Impostos e Taxas', value: true },
        { name: 'Suporte por E-mail, WhatsApp e Chatbot IA', value: true },
        { name: 'Cadastro de Funcionários com controle de acesso', value: true },
        { name: 'Teste gratuito', value: '7 dias' }
      ]
    },
    {
      id: 'business-enterprise',
      name: 'Enterprise',
      monthlyPrice: 147.90,
      annualDiscount: 20,
      icon: <Shield className="h-6 w-6" />,
      description: 'Solução empresarial premium',
      features: [
        { name: 'Dashboard empresarial', value: 'Avançado + customizado' },
        { name: 'Dashboard pessoal incluído', value: true },
        { name: 'Multi-Dashboard', value: 'Ilimitado' },
        { name: 'IA Financeira', value: 'Com análise automatizada' },
        { name: 'IA Especialista em Impostos', value: true },
        { name: 'Gestão de equipe', value: 'Completa' },
        { name: 'Relatórios de impostos e taxas', value: true },
        { name: 'Suporte (e-mail, WhatsApp, IA)', value: 'Prioritário + dedicado' },
        { name: 'Teste gratuito', value: '7 dias' }
      ]
    }
  ];

  const currentPlans = planType === 'personal' ? personalPlans : businessPlans;

  const activateDeveloperMode = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para ativar o modo desenvolvedor');
      return;
    }

    setIsActivatingDeveloper(true);
    
    try {
      // Verificar se já existe um registro para este usuário
      const { data: existingSubscriber, error: checkError } = await supabase
        .from('subscribers')
        .select('*')
        .eq('email', user.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingSubscriber) {
        // Atualizar registro existente
        const { error: updateError } = await supabase
          .from('subscribers')
          .update({
            subscribed: true,
            subscription_tier: 'developer',
            subscription_end: null, // Acesso ilimitado
            updated_at: new Date().toISOString()
          })
          .eq('email', user.email);

        if (updateError) throw updateError;
      } else {
        // Criar novo registro
        const { error: insertError } = await supabase
          .from('subscribers')
          .insert({
            user_id: user.id,
            email: user.email,
            subscribed: true,
            subscription_tier: 'developer',
            subscription_end: null // Acesso ilimitado
          });

        if (insertError) throw insertError;
      }

      toast.success('Modo desenvolvedor ativado com sucesso! 🚀\nVocê agora tem acesso ilimitado a todas as funcionalidades.');
      
      // Recarregar a página após um pequeno delay para permitir que o toast seja exibido
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Erro ao ativar modo desenvolvedor:', error);
      toast.error('Erro ao ativar modo desenvolvedor. Tente novamente.');
    } finally {
      setIsActivatingDeveloper(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-foreground">Escolha seu Plano</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Gestão financeira inteligente para pessoas físicas e empresas. 
          Transforme sua relação com o dinheiro com nossa plataforma completa.
        </p>
        
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
              Economize até 20%
            </Badge>
          )}
        </div>
      </div>

      {/* Cards dos Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {currentPlans.map((plan) => {
          const pricing = getPrice(plan.monthlyPrice, plan.annualDiscount);
          
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
                  {isAnnual && pricing.discount > 0 && (
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
                  className={`w-full mt-4 transition-all duration-300 ${
                    plan.popular || plan.recommended 
                      ? 'bg-primary hover:bg-primary/90 shadow-lg'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  {plan.popular || plan.recommended ? (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Assinar Agora
                    </>
                  ) : (
                    'Começar Teste'
                  )}
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
              Você está explorando todas as funcionalidades do Financy gratuitamente. 
              Assine um plano para continuar aproveitando nossa plataforma.
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

          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
            <div className="text-sm">
              <strong>Webhook de Integração:</strong>
              <code className="block mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-mono">
                https://hbyozfmpsgbxofcetdez.supabase.co/functions/v1/cakto-webhook
              </code>
              <p className="mt-3 text-xs text-muted-foreground">
                Esta URL está configurada para receber automaticamente as confirmações de pagamento 
                e ativar sua assinatura instantaneamente.
              </p>
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

      {/* Botão Desenvolvedor */}
      <div className="flex justify-center pt-8">
        <Button
          onClick={activateDeveloperMode}
          disabled={isActivatingDeveloper}
          variant="outline"
          className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-300 hover:border-purple-500 transition-all duration-300"
        >
          <Code2 className="h-4 w-4 mr-2" />
          {isActivatingDeveloper ? 'Ativando...' : 'Sou um Desenvolvedor'}
        </Button>
      </div>
    </div>
  );
};

export default Assinatura;
