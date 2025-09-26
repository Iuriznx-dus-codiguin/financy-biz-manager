import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, User, Building, Star, PartyPopper, Sparkles, Target, TrendingUp, Phone, MessageCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OnboardingData } from '@/types/onboarding';
import { FinancialDataStep } from './FinancialDataStep';
import { ExpenseSheetStep } from './ExpenseSheetStep';
import { FinancialGoalStep } from './FinancialGoalStep';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => Promise<void>;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    whatsapp: '',
    user_type: '',
    how_did_you_know: '',
    salary_range: '',
    revenue_range: '',
    nome_preferido: '',
    termos_aceitos: false,
    gastos_iniciais: []
  });
  const { toast } = useToast();

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: NodeJS.Timeout = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const howDidYouKnowOptions = [
    { id: 'google', label: 'Pesquisa no Google', icon: '🔍' },
    { id: 'social', label: 'Redes sociais', icon: '📱' },
    { id: 'friend', label: 'Indicação de amigo', icon: '👥' },
    { id: 'youtube', label: 'YouTube', icon: '📺' },
    { id: 'blog', label: 'Blog ou artigo', icon: '📰' },
    { id: 'influencer', label: 'Influenciador', icon: '⭐' },
    { id: 'advertisement', label: 'Anúncio', icon: '📢' },
    { id: 'other', label: 'Outro', icon: '💡' }
  ];

  const salaryRanges = [
    { value: '0-2000', label: 'Até R$ 2.000', color: 'from-red-400 to-red-500' },
    { value: '2000-5000', label: 'R$ 2.000 - R$ 5.000', color: 'from-orange-400 to-orange-500' },
    { value: '5000-10000', label: 'R$ 5.000 - R$ 10.000', color: 'from-yellow-400 to-yellow-500' },
    { value: '10000-20000', label: 'R$ 10.000 - R$ 20.000', color: 'from-green-400 to-green-500' },
    { value: '20000+', label: 'Acima de R$ 20.000', color: 'from-blue-400 to-blue-500' }
  ];

  const revenueRanges = [
    { value: '0-10000', label: 'Até R$ 10.000/mês', color: 'from-red-400 to-red-500' },
    { value: '10000-50000', label: 'R$ 10.000 - R$ 50.000/mês', color: 'from-orange-400 to-orange-500' },
    { value: '50000-200000', label: 'R$ 50.000 - R$ 200.000/mês', color: 'from-yellow-400 to-yellow-500' },
    { value: '200000-1000000', label: 'R$ 200.000 - R$ 1.000.000/mês', color: 'from-green-400 to-green-500' },
    { value: '1000000+', label: 'Acima de R$ 1.000.000/mês', color: 'from-blue-400 to-blue-500' }
  ];

  const handleNext = async () => {
    if (currentStep < 9) {
      setCurrentStep(currentStep + 1);
    } else {
      setLoading(true);
      try {
        await onComplete(data);
        triggerConfetti();
        toast({
          title: "🎉 Bem-vindo ao Financy!",
          description: `Olá ${data.nome_preferido}! Sua plataforma foi personalizada com sucesso.`,
        });
      } catch (error) {
        console.error('Erro ao completar onboarding:', error);
        toast({
          title: "❌ Erro",
          description: "Houve um erro ao salvar suas preferências. Tente novamente.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      const minimalData: OnboardingData = {
        whatsapp: '(11) 99999-9999',
        user_type: 'pessoal',
        how_did_you_know: 'other',
        salary_range: '0-2000',
        revenue_range: '',
        nome_preferido: 'Usuário',
        termos_aceitos: true,
        gastos_iniciais: []
      };
      await onComplete(minimalData);
      toast({
        title: "✅ Configuração rápida concluída",
        description: "Você pode personalizar sua experiência a qualquer momento nas configurações.",
      });
    } catch (error) {
      console.error('Erro ao pular onboarding:', error);
      toast({
        title: "❌ Erro",
        description: "Houve um erro. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    const validatePhone = (phoneValue: string) => {
      const numbers = phoneValue.replace(/\D/g, '');
      return numbers.length === 11;
    };

    switch (currentStep) {
      case 1: return validatePhone(data.whatsapp);
      case 2: return data.user_type !== '';
      case 3: return data.user_type === 'pessoal' ? data.salary_range !== '' : data.revenue_range !== '';
      case 4: return data.nome_preferido !== '';
      case 5: return data.how_did_you_know !== '';
      case 6: return true;
      case 7: return true;
      case 8: return true;
      case 9: return data.termos_aceitos === true;
      default: return false;
    }
  };

  const getStepTitle = () => {
    const titles = {
      1: 'Cadastre seu WhatsApp',
      2: 'Escolha seu perfil',
      3: 'Situação financeira',
      4: 'Como devemos te chamar?',
      5: 'Como nos conheceu?',
      6: 'Dados financeiros básicos',
      7: 'Seus gastos principais',
      8: 'Defina uma meta',
      9: 'Termos e condições'
    };
    return titles[currentStep as keyof typeof titles];
  };

  const getStepIcon = () => {
    const icons = {
      1: MessageCircle,
      2: User,
      3: TrendingUp,
      4: Sparkles,
      5: Star,
      6: Target,
      7: Building,
      8: Target,
      9: PartyPopper
    };
    const Icon = icons[currentStep as keyof typeof icons];
    return <Icon className="w-6 h-6" />;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setData({ ...data, whatsapp: formatted });
  };

  const renderStep1 = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-4">
          <MessageCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold">Cadastre seu WhatsApp</h2>
        <p className="text-muted-foreground">Para receber insights financeiros e suporte via IA</p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div className="space-y-2">
          <Label htmlFor="whatsapp" className="text-sm font-medium">
            Número do WhatsApp
          </Label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="whatsapp"
              type="tel"
              placeholder="(11) 99999-9999"
              value={data.whatsapp}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="rounded-xl h-14 pl-12 pr-4 border-2 focus:border-green-500 transition-all"
              maxLength={15}
            />
          </div>
        </div>

        <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Receba insights financeiros automáticos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Alertas de vencimentos e metas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Suporte personalizado via IA</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Para qual uso você irá destinar a Financy?</h2>
        <p className="text-muted-foreground">Isso nos ajudará a personalizar sua experiência.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`relative cursor-pointer transition-all duration-300 ${
            data.user_type === 'pessoal' 
              ? 'ring-2 ring-primary bg-primary/5 shadow-lg' 
              : 'hover:bg-muted/50 hover:shadow-md'
          }`}
          onClick={() => setData({ ...data, user_type: 'pessoal' })}
        >
          <div className="flex flex-col items-center space-y-4 p-8 rounded-xl border border-border">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg">Pessoal</h3>
              <p className="text-sm text-muted-foreground">Para controle das suas finanças pessoais</p>
            </div>
            {data.user_type === 'pessoal' && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
              >
                <span className="text-white text-xs">✓</span>
              </motion.div>
            )}
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`relative cursor-pointer transition-all duration-300 ${
            data.user_type === 'empresarial' 
              ? 'ring-2 ring-primary bg-primary/5 shadow-lg' 
              : 'hover:bg-muted/50 hover:shadow-md'
          }`}
          onClick={() => setData({ ...data, user_type: 'empresarial' })}
        >
          <div className="flex flex-col items-center space-y-4 p-8 rounded-xl border border-border">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center">
              <Building className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg">Empresarial</h3>
              <p className="text-sm text-muted-foreground">Para gestão financeira da sua empresa</p>
            </div>
            {data.user_type === 'empresarial' && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
              >
                <span className="text-white text-xs">✓</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          {data.user_type === 'pessoal' 
            ? 'Qual sua faixa salarial?' 
            : 'Qual seu faturamento mensal?'
          }
        </h2>
        <p className="text-muted-foreground">
          {data.user_type === 'pessoal' 
            ? 'Isso nos ajudará a personalizar suas metas financeiras.' 
            : 'Isso nos ajudará a configurar os recursos adequados para seu negócio.'
          }
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <div className="grid gap-3">
          {(data.user_type === 'pessoal' ? salaryRanges : revenueRanges).map((range) => (
            <motion.div
              key={range.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative cursor-pointer transition-all duration-300 ${
                (data.user_type === 'pessoal' ? data.salary_range : data.revenue_range) === range.value
                  ? 'ring-2 ring-primary bg-primary/5 shadow-lg'
                  : 'hover:bg-muted/50 hover:shadow-md'
              }`}
              onClick={() => {
                if (data.user_type === 'pessoal') {
                  setData({ ...data, salary_range: range.value });
                } else {
                  setData({ ...data, revenue_range: range.value });
                }
              }}
            >
              <div className="flex items-center space-x-4 p-4 rounded-lg border border-border">
                <div className={`w-4 h-4 bg-gradient-to-r ${range.color} rounded-full`} />
                <div className="flex-1">
                  <p className="font-medium">{range.label}</p>
                </div>
                {((data.user_type === 'pessoal' ? data.salary_range : data.revenue_range) === range.value) && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                  >
                    <span className="text-white text-xs">✓</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );

  const renderStep4 = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Como você quer que nos te chamemos?</h2>
        <p className="text-muted-foreground">Este nome aparecerá na sua dashboard personalizada.</p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div className="relative">
          <Input
            type="text"
            placeholder="Digite seu nome preferido"
            value={data.nome_preferido}
            onChange={(e) => setData({ ...data, nome_preferido: e.target.value })}
            className="h-14 text-center text-lg border-2 focus:ring-2 focus:ring-primary/20"
          />
          <Sparkles className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary" />
        </div>

        <AnimatePresence>
          {data.nome_preferido && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center p-6 bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-xl border border-primary/20"
            >
              <p className="text-sm text-muted-foreground mb-1">Prévia da sua dashboard:</p>
              <p className="text-xl font-semibold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Olá, {data.nome_preferido}! 👋
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  const renderStep5 = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Como você conheceu a Financy?</h2>
        <p className="text-muted-foreground">Queremos entender como você chegou até nós.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
        {howDidYouKnowOptions.map((option) => (
          <motion.div
            key={option.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative cursor-pointer transition-all duration-300 ${
              data.how_did_you_know === option.id 
                ? 'ring-2 ring-primary bg-primary/5 shadow-lg' 
                : 'hover:bg-muted/50 hover:shadow-md'
            }`}
            onClick={() => setData({ ...data, how_did_you_know: option.id })}
          >
            <div className="flex items-center space-x-3 p-4 rounded-lg border border-border">
              <span className="text-2xl">{option.icon}</span>
              <div className="flex-1">
                <h3 className="font-medium">{option.label}</h3>
              </div>
              {data.how_did_you_know === option.id && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                >
                  <span className="text-white text-xs">✓</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderStep9 = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Termos de Uso e Privacidade</h2>
        <p className="text-muted-foreground">Por favor, leia e aceite nossos termos para finalizar.</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-muted/30 rounded-xl p-6 max-h-64 overflow-y-auto border border-border">
          <h3 className="font-semibold mb-4 text-lg">📋 Termos de Uso da Financy</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p><strong>🔐 Privacidade Total:</strong> Seus dados financeiros são criptografados end-to-end e nunca compartilhados.</p>
            <p><strong>🛡️ Segurança Avançada:</strong> Utilizamos as melhores práticas de segurança para proteger suas informações.</p>
            <p><strong>🎯 Uso Responsável:</strong> A plataforma deve ser utilizada apenas para fins legais de gestão financeira.</p>
            <p><strong>📊 Inteligência Artificial:</strong> Nossos algoritmos analisam seus dados para fornecer insights personalizados.</p>
            <p><strong>🔄 Atualizações Automáticas:</strong> Melhorias constantes na plataforma para sua melhor experiência.</p>
            <p><strong>🎧 Suporte 24/7:</strong> Nossa equipe está disponível para auxiliar quando precisar.</p>
          </div>
        </div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-start space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
            data.termos_aceitos 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => setData({ ...data, termos_aceitos: !data.termos_aceitos })}
        >
          <Checkbox
            id="termos"
            checked={data.termos_aceitos}
            className="mt-0.5"
          />
          <Label htmlFor="termos" className="text-sm leading-relaxed cursor-pointer">
            <strong>✅ Li e aceito</strong> os termos de uso da Financy e autorizo o processamento dos meus dados para uma experiência personalizada e inteligente.
          </Label>
        </motion.div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl rounded-3xl shadow-2xl border-0 overflow-hidden">
        <CardHeader className="text-center space-y-6 px-8 py-8 bg-gradient-to-r from-primary/5 to-blue-500/5">
          <div className="flex justify-between items-center w-full">
            {/* Skip Button */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSkip}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Configuração rápida
            </Button>

            {/* Logo and Progress */}
            <div className="flex flex-col items-center space-y-4">
              <motion.div 
                className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-3xl flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.05 }}
              >
                {getStepIcon()}
              </motion.div>
              
              {/* Progress Dots */}
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((step) => (
                  <motion.div
                    key={step}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      step <= currentStep 
                        ? 'bg-primary shadow-lg' 
                        : 'bg-muted'
                    }`}
                    animate={{ scale: step === currentStep ? 1.2 : 1 }}
                  />
                ))}
              </div>
              
              <div className="text-center">
                <h1 className="text-lg font-semibold">{getStepTitle()}</h1>
                <p className="text-sm text-muted-foreground">Passo {currentStep} de 9</p>
              </div>
            </div>

            {/* Progress Percentage */}
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {Math.round((currentStep / 9) * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">concluído</div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
              {currentStep === 5 && renderStep5()}
              {currentStep === 6 && <FinancialDataStep data={data} setData={setData} />}
              {currentStep === 7 && <ExpenseSheetStep data={data} setData={setData} />}
              {currentStep === 8 && <FinancialGoalStep data={data} setData={setData} />}
              {currentStep === 9 && renderStep9()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-8 mt-8 border-t border-border">
            {currentStep > 1 ? (
              <Button 
                variant="outline" 
                onClick={handleBack} 
                disabled={loading}
                className="flex items-center space-x-2 px-6"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar</span>
              </Button>
            ) : (
              <div />
            )}

            <Button 
              onClick={handleNext} 
              disabled={!canProceed() || loading}
              className="flex items-center space-x-2 px-8 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
              size="lg"
            >
              <span>
                {currentStep === 9 ? (loading ? 'Finalizando...' : '🎉 Finalizar') : 'Continuar'}
              </span>
              {currentStep < 9 && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};