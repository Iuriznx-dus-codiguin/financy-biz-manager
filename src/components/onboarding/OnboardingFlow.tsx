
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, User, Building, Star, PartyPopper } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OnboardingData } from '@/types/onboarding';
import { FinancialDataStep } from './FinancialDataStep';
import { ExpenseSheetStep } from './ExpenseSheetStep';
import { FinancialGoalStep } from './FinancialGoalStep';
import confetti from 'canvas-confetti';

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => Promise<void>;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
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
    const count = 200;
    const defaults = {
      origin: { y: 0.7 }
    };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });

    fire(0.2, {
      spread: 60,
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  };

  const howDidYouKnowOptions = [
    { id: 'google', label: 'Pesquisa no Google' },
    { id: 'social', label: 'Redes sociais' },
    { id: 'friend', label: 'Indicação de amigo' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'blog', label: 'Blog ou artigo' },
    { id: 'influencer', label: 'Influenciador' },
    { id: 'advertisement', label: 'Anúncio' },
    { id: 'other', label: 'Outro' }
  ];

  const salaryRanges = [
    { value: '0-2000', label: 'Até R$ 2.000' },
    { value: '2000-5000', label: 'R$ 2.000 - R$ 5.000' },
    { value: '5000-10000', label: 'R$ 5.000 - R$ 10.000' },
    { value: '10000-20000', label: 'R$ 10.000 - R$ 20.000' },
    { value: '20000+', label: 'Acima de R$ 20.000' }
  ];

  const revenueRanges = [
    { value: '0-10000', label: 'Até R$ 10.000/mês' },
    { value: '10000-50000', label: 'R$ 10.000 - R$ 50.000/mês' },
    { value: '50000-200000', label: 'R$ 50.000 - R$ 200.000/mês' },
    { value: '200000-1000000', label: 'R$ 200.000 - R$ 1.000.000/mês' },
    { value: '1000000+', label: 'Acima de R$ 1.000.000/mês' }
  ];

  const handleNext = async () => {
    if (currentStep < 8) {
      setCurrentStep(currentStep + 1);
    } else {
      setLoading(true);
      try {
        await onComplete(data);
        triggerConfetti();
        toast({
          title: "Bem-vindo ao Financy!",
          description: `Olá ${data.nome_preferido}! Sua plataforma foi personalizada com sucesso.`,
        });
      } catch (error) {
        console.error('Erro ao completar onboarding:', error);
        toast({
          title: "Erro",
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

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.user_type !== '';
      case 2:
        return data.user_type === 'pessoal' ? data.salary_range !== '' : data.revenue_range !== '';
      case 3:
        return data.nome_preferido !== '';
      case 4:
        return data.how_did_you_know !== '';
      case 5:
        return true; // Dados financeiros são opcionais
      case 6:
        return true; // Planilha de gastos é opcional
      case 7:
        return true; // Meta financeira é opcional
      case 8:
        return data.termos_aceitos === true;
      default:
        return false;
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Para qual uso você irá destinar a Financy?</h2>
        <p className="text-muted-foreground">Isso nos ajudará a personalizar sua experiência.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        <div
          className={`relative cursor-pointer transition-all duration-200 ${
            data.user_type === 'pessoal' 
              ? 'ring-2 ring-primary bg-primary/5' 
              : 'hover:bg-muted/50'
          }`}
          onClick={() => setData({ ...data, user_type: 'pessoal' })}
        >
          <div className="flex flex-col items-center space-y-4 p-6 rounded-lg border">
            <User className="w-12 h-12 text-primary" />
            <div className="text-center">
              <h3 className="font-semibold text-lg">Pessoal</h3>
              <p className="text-sm text-muted-foreground">Para controle das suas finanças pessoais</p>
            </div>
            {data.user_type === 'pessoal' && (
              <div className="absolute top-2 right-2">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          className={`relative cursor-pointer transition-all duration-200 ${
            data.user_type === 'empresarial' 
              ? 'ring-2 ring-primary bg-primary/5' 
              : 'hover:bg-muted/50'
          }`}
          onClick={() => setData({ ...data, user_type: 'empresarial' })}
        >
          <div className="flex flex-col items-center space-y-4 p-6 rounded-lg border">
            <Building className="w-12 h-12 text-primary" />
            <div className="text-center">
              <h3 className="font-semibold text-lg">Empresarial</h3>
              <p className="text-sm text-muted-foreground">Para gestão financeira da sua empresa</p>
            </div>
            {data.user_type === 'empresarial' && (
              <div className="absolute top-2 right-2">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          {data.user_type === 'pessoal' 
            ? 'Qual seu salário?' 
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
        <Select 
          value={data.user_type === 'pessoal' ? data.salary_range : data.revenue_range} 
          onValueChange={(value) => {
            if (data.user_type === 'pessoal') {
              setData({ ...data, salary_range: value });
            } else {
              setData({ ...data, revenue_range: value });
            }
          }}
        >
          <SelectTrigger className="w-full h-12">
            <SelectValue placeholder="Selecione uma faixa" />
          </SelectTrigger>
          <SelectContent>
            {(data.user_type === 'pessoal' ? salaryRanges : revenueRanges).map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Como você quer que nos te chamemos?</h2>
        <p className="text-muted-foreground">Este nome aparecerá na sua dashboard.</p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <Input
          type="text"
          placeholder="Digite seu nome preferido"
          value={data.nome_preferido}
          onChange={(e) => setData({ ...data, nome_preferido: e.target.value })}
          className="h-12 text-center"
        />
        {data.nome_preferido && (
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Prévia:</p>
            <p className="text-lg font-semibold">Olá, {data.nome_preferido}!</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Como você conheceu a Financy?</h2>
        <p className="text-muted-foreground">Queremos entender como você chegou até nós.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
        {howDidYouKnowOptions.map((option) => (
          <div
            key={option.id}
            className={`relative cursor-pointer transition-all duration-200 ${
              data.how_did_you_know === option.id 
                ? 'ring-2 ring-primary bg-primary/5' 
                : 'hover:bg-muted/50'
            }`}
            onClick={() => setData({ ...data, how_did_you_know: option.id })}
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border">
              <div className="flex-1">
                <h3 className="font-medium">{option.label}</h3>
              </div>
              {data.how_did_you_know === option.id && (
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Termos de Uso</h2>
        <p className="text-muted-foreground">Por favor, leia e aceite nossos termos para continuar.</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-muted/50 rounded-lg p-6 max-h-64 overflow-y-auto border">
          <h3 className="font-semibold mb-4">Termos de Uso da Financy</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>1. <strong>Aceitação dos Termos:</strong> Ao usar a Financy, você concorda com estes termos de uso.</p>
            <p>2. <strong>Privacidade de Dados:</strong> Seus dados financeiros são criptografados e protegidos conforme nossa política de privacidade.</p>
            <p>3. <strong>Uso Adequado:</strong> A plataforma deve ser utilizada apenas para fins legais de gestão financeira.</p>
            <p>4. <strong>Responsabilidade:</strong> Você é responsável pela veracidade das informações inseridas.</p>
            <p>5. <strong>Atualizações:</strong> Estes termos podem ser atualizados periodicamente.</p>
            <p>6. <strong>Suporte:</strong> Disponibilizamos suporte técnico para auxiliar no uso da plataforma.</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 justify-center">
          <Checkbox
            id="termos"
            checked={data.termos_aceitos}
            onCheckedChange={(checked) => setData({ ...data, termos_aceitos: checked as boolean })}
          />
          <Label htmlFor="termos" className="text-sm">
            Concordo com os termos de uso da Financy e autorizo o processamento dos meus dados
          </Label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl rounded-2xl shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-2xl">F</span>
          </div>
          
          <div className="flex items-center justify-center space-x-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          
          <p className="text-sm text-muted-foreground">{currentStep} / 8</p>
        </CardHeader>

        <CardContent className="space-y-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && <FinancialDataStep data={data} setData={setData} />}
          {currentStep === 6 && <ExpenseSheetStep data={data} setData={setData} />}
          {currentStep === 7 && <FinancialGoalStep data={data} setData={setData} />}
          {currentStep === 8 && renderStep5()}

          <div className="flex justify-between pt-6">
            {currentStep > 1 ? (
              <Button variant="outline" onClick={handleBack} className="flex items-center space-x-2" disabled={loading}>
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar</span>
              </Button>
            ) : (
              <div />
            )}

            <Button 
              onClick={handleNext} 
              disabled={!canProceed() || loading}
              className="flex items-center space-x-2 bg-primary hover:bg-primary/90"
            >
              <span>{currentStep === 8 ? (loading ? 'Finalizando...' : 'Finalizar') : 'Avançar'}</span>
              {currentStep < 8 && <ChevronRight className="w-4 h-4" />}
              {currentStep === 8 && <PartyPopper className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
