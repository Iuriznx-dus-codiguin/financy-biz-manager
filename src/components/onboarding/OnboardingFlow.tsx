
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, User, Users, Building, Building2, DollarSign, Star, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OnboardingData } from '@/types/onboarding';

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
    revenue_range: ''
  });
  const { toast } = useToast();

  const userTypes = [
    { id: 'personal', label: 'Usuário pessoal', icon: User, description: 'Para uso pessoal e familiar' },
    { id: 'mei', label: 'Microempreendedor', icon: Building, description: 'MEI ou pequeno negócio' },
    { id: 'medium', label: 'Empresa de médio porte', icon: Building2, description: 'Empresa com até 100 funcionários' },
    { id: 'large', label: 'Empresa de grande porte', icon: Building2, description: 'Grande corporação' }
  ];

  const howDidYouKnowOptions = [
    { id: 'google', label: 'Pesquisa no Google', icon: '🔍' },
    { id: 'social', label: 'Redes sociais', icon: '📱' },
    { id: 'friend', label: 'Indicação de amigo', icon: '👥' },
    { id: 'youtube', label: 'YouTube', icon: '🎥' },
    { id: 'blog', label: 'Blog ou artigo', icon: '📝' },
    { id: 'other', label: 'Outro', icon: '💡' }
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
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      setLoading(true);
      try {
        await onComplete(data);
        toast({
          title: "Configuração concluída!",
          description: "Sua plataforma foi personalizada com base nas suas respostas.",
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
        return data.how_did_you_know !== '';
      case 3:
        return data.user_type === 'personal' ? data.salary_range !== '' : data.revenue_range !== '';
      default:
        return false;
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Qual das seguintes funções melhor descreve você?</h2>
        <p className="text-muted-foreground">Seu feedback nos ajudará a personalizar a sua experiência.</p>
        <p className="text-sm text-muted-foreground">Selecione apenas 1</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {userTypes.map((type) => {
          const IconComponent = type.icon;
          return (
            <div
              key={type.id}
              className={`relative cursor-pointer transition-all duration-200 ${
                data.user_type === type.id 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => setData({ ...data, user_type: type.id })}
            >
              <div className="flex items-center space-x-4 p-4 rounded-lg border">
                <div className="flex-shrink-0">
                  <IconComponent className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{type.label}</h3>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
                {data.user_type === type.id && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Como você conheceu o Financy?</h2>
        <p className="text-muted-foreground">Seu feedback nos ajudará a personalizar a sua experiência.</p>
        <p className="text-sm text-muted-foreground">Selecione todos que se aplicam</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="flex items-center space-x-4 p-4 rounded-lg border">
              <div className="flex-shrink-0 text-2xl">
                {option.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{option.label}</h3>
              </div>
              {data.how_did_you_know === option.id && (
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          {data.user_type === 'personal' 
            ? 'Qual a faixa do seu salário?' 
            : 'Qual a média de faturamento mensal?'
          }
        </h2>
        <p className="text-muted-foreground">
          {data.user_type === 'personal' 
            ? 'Isso nos ajudará a personalizar suas metas financeiras.' 
            : 'Isso nos ajudará a configurar os recursos adequados para seu negócio.'
          }
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <Select 
          value={data.user_type === 'personal' ? data.salary_range : data.revenue_range} 
          onValueChange={(value) => {
            if (data.user_type === 'personal') {
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
            {(data.user_type === 'personal' ? salaryRanges : revenueRanges).map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl rounded-2xl shadow-xl">
        <CardHeader className="text-center space-y-4 relative">
          <div className="absolute top-4 right-4">
            <Button variant="ghost" size="sm" onClick={() => onComplete(data)} disabled={loading}>
              Ignorar
            </Button>
          </div>
          
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-2xl">F</span>
          </div>
          
          <div className="flex items-center justify-center space-x-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          
          <p className="text-sm text-muted-foreground">{currentStep} / 3</p>

          {/* Aviso sobre personalização */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mx-4">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Info className="w-4 h-4" />
              <p className="text-sm font-medium">
                Atenção: suas respostas serão utilizadas para adaptar a plataforma com base em suas necessidades
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

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
              className="flex items-center space-x-2 bg-cyan-500 hover:bg-cyan-600"
            >
              <span>{currentStep === 3 ? (loading ? 'Finalizando...' : 'Finalizar') : 'Avançar'}</span>
              {currentStep < 3 && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
