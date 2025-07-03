
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CreditCard, Check, Calendar, AlertTriangle, Crown, Sparkles, Bot, Lock } from 'lucide-react';

const Assinatura: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  const handlePayment = (planType: string, period: string) => {
    // URLs diferentes para cada plano
    const urls = {
      'plus-monthly': 'https://pay.cakto.com.br/4cwxcix_453682',
      'plus-annual': 'https://pay.cakto.com.br/plus_annual_plan', // URL fictícia
      'premium-monthly': 'https://pay.cakto.com.br/premium_plan', // URL fictícia
      'premium-annual': 'https://pay.cakto.com.br/premium_annual_plan', // URL fictícia
      'enterprise': '#' // Indisponível
    };
    
    if (planType === 'enterprise') {
      alert('Este plano estará disponível em breve! Entre em contato conosco para mais informações.');
      return;
    }
    
    const urlKey = `${planType}-${period}` as keyof typeof urls;
    window.open(urls[urlKey], '_blank');
  };

  const getPrice = (basePrice: number, annualDiscount: number) => {
    if (isAnnual) {
      const annualPrice = basePrice * 12;
      const discountedPrice = annualPrice * (1 - annualDiscount / 100);
      return {
        price: discountedPrice,
        period: '/ano',
        discount: annualDiscount,
        originalPrice: annualPrice
      };
    }
    return {
      price: basePrice,
      period: '/mês',
      discount: 0,
      originalPrice: basePrice
    };
  };

  const plans = [
    {
      id: 'plus',
      name: 'Financy Plus',
      basePrice: 49.90,
      annualDiscount: 10,
      description: 'Ideal para freelancers e pequenos negócios',
      icon: <CreditCard className="h-6 w-6" />,
      color: 'blue',
      features: [
        'Dashboard completo',
        'Gestão de receitas e despesas',
        'Controle de impostos e taxas',
        'Relatórios básicos',
        'Fechamento de caixa',
        'Suporte por email'
      ],
      available: true
    },
    {
      id: 'premium',
      name: 'Financy Premium',
      basePrice: 89.90,
      annualDiscount: 12,
      description: 'Para empresas que querem crescer com premiações',
      icon: <Crown className="h-6 w-6" />,
      color: 'purple',
      badge: 'Premiações Anuais',
      features: [
        'Tudo do Financy Plus',
        'Relatórios avançados',
        'Gestão de equipe completa',
        'Premiações anuais exclusivas',
        'Análises preditivas',
        'Suporte prioritário',
        'Integração com bancos'
      ],
      available: true
    },
    {
      id: 'enterprise',
      name: 'Financy Enterprise',
      basePrice: 199.90,
      annualDiscount: 15,
      description: 'A solução mais completa com IA especializada',
      icon: <Sparkles className="h-6 w-6" />,
      color: 'gold',
      badge: 'IA Incluída',
      features: [
        'Tudo do Financy Premium',
        'Contador IA (Pixel) dedicado',
        'Suporte especializado 24/7',
        'Consultoria financeira mensal',
        'Análises de mercado personalizadas',
        'API para integrações customizadas',
        'Treinamento da equipe'
      ],
      available: false
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">Escolha seu Plano</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Transforme sua gestão financeira com soluções inovadoras. Escolha o plano ideal para seu negócio.
        </p>
        
        {/* Toggle Mensal/Anual */}
        <div className="flex items-center justify-center space-x-4 mt-6">
          <Label htmlFor="billing-toggle" className={`font-medium ${!isAnnual ? 'text-primary' : 'text-muted-foreground'}`}>
            Mensal
          </Label>
          <Switch
            id="billing-toggle"
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
            className="data-[state=checked]:bg-primary"
          />
          <Label htmlFor="billing-toggle" className={`font-medium ${isAnnual ? 'text-primary' : 'text-muted-foreground'}`}>
            Anual
          </Label>
          {isAnnual && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Economize até 12%
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const pricing = getPrice(plan.basePrice, plan.annualDiscount);
          
          return (
            <Card 
              key={plan.id} 
              className={`relative rounded-3xl shadow-lg transition-all duration-300 hover:shadow-xl ${
                plan.id === 'premium' ? 'border-2 border-purple-200 dark:border-purple-800 scale-105' : ''
              } ${!plan.available ? 'opacity-75' : ''}`}
            >
              {plan.id === 'premium' && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-purple-600 text-white px-4 py-1 rounded-full">
                    Mais Popular
                  </Badge>
                </div>
              )}
              
              {!plan.available && (
                <div className="absolute -top-4 right-4">
                  <Badge variant="secondary" className="bg-gray-500 text-white px-3 py-1 rounded-full flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Em Breve
                  </Badge>
                </div>
              )}

              {isAnnual && pricing.discount > 0 && plan.available && (
                <div className="absolute -top-4 right-4">
                  <Badge className="bg-green-600 text-white px-3 py-1 rounded-full">
                    -{pricing.discount}%
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-8">
                <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
                  plan.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                  plan.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                  'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                }`}>
                  {plan.icon}
                </div>
                
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                {plan.badge && (
                  <Badge variant="outline" className="mx-auto w-fit">
                    {plan.badge}
                  </Badge>
                )}
                <CardDescription className="text-base">{plan.description}</CardDescription>
                
                <div className="pt-4">
                  {isAnnual && pricing.discount > 0 ? (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground line-through">
                        De R$ {pricing.originalPrice.toFixed(2)}{pricing.period}
                      </div>
                      <div className="text-5xl font-bold text-foreground">
                        R$ {pricing.price.toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-5xl font-bold text-foreground">
                      R$ {pricing.price.toFixed(2)}
                    </div>
                  )}
                  <div className="text-muted-foreground">{pricing.period}</div>
                  {isAnnual && (
                    <div className="text-sm text-muted-foreground mt-2">
                      R$ {(pricing.price / 12).toFixed(2)}/mês
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`rounded-full p-1 ${
                        plan.color === 'blue' ? 'bg-blue-100' :
                        plan.color === 'purple' ? 'bg-purple-100' :
                        'bg-gradient-to-br from-yellow-100 to-orange-100'
                      }`}>
                        <Check className={`h-3 w-3 ${
                          plan.color === 'blue' ? 'text-blue-600' :
                          plan.color === 'purple' ? 'text-purple-600' :
                          'text-orange-600'
                        }`} />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={() => handlePayment(plan.id, isAnnual ? 'annual' : 'monthly')}
                  disabled={!plan.available}
                  className={`w-full h-12 rounded-xl font-semibold transition-all duration-300 ${
                    plan.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                    plan.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' :
                    plan.available ? 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700' :
                    'bg-gray-400 cursor-not-allowed'
                  } text-white`}
                >
                  {!plan.available ? (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Indisponível no Momento
                    </>
                  ) : plan.id === 'enterprise' ? (
                    <>
                      <Bot className="mr-2 h-4 w-4" />
                      Solicitar Acesso
                    </>
                  ) : (
                    'Assinar Agora'
                  )}
                </Button>

                {plan.available && (
                  <div className="text-xs text-muted-foreground text-center">
                    Pagamento seguro processado via Cakto
                  </div>
                )}
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
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Perguntas Frequentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">💰 Quanto economizo com o plano anual?</h4>
              <p className="text-sm text-muted-foreground">
                Com o plano anual você economiza 10% no Financy Plus (R$ 539,90/ano) e 12% no Premium 
                (R$ 889,90/ano), além de não se preocupar com renovações mensais.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🎁 O que são as premiações anuais?</h4>
              <p className="text-sm text-muted-foreground">
                Assinantes Premium e Enterprise recebem premiações exclusivas todo ano, 
                incluindo consultorias gratuitas, relatórios especiais e acesso antecipado a novas funcionalidades.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🤖 Como funciona o Contador IA (Pixel)?</h4>
              <p className="text-sm text-muted-foreground">
                Pixel é nossa IA especializada em contabilidade que analisa seus dados, 
                oferece insights personalizados e responde dúvidas financeiras 24/7.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">💳 Posso trocar de plano a qualquer momento?</h4>
              <p className="text-sm text-muted-foreground">
                Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. 
                As alterações são aplicadas no próximo ciclo de cobrança.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Assinatura;
