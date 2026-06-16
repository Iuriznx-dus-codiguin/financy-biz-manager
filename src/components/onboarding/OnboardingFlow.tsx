import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BrazilianPhoneInput } from '@/components/ui/BrazilianPhoneInput';
import {
  ChevronLeft, ChevronRight, User, Building, Sparkles, MessageCircle,
  AlertCircle, ShieldCheck, Wallet, TrendingUp, CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OnboardingData } from '@/types/onboarding';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { requestGeneralTour } from '@/components/onboarding/ProductTour';
import { validateAndNormalizePhone, savePhoneCorrection, type CorrectionType } from '@/utils/evolutionPhoneValidation';
import { checkPhoneDuplicate } from '@/utils/phoneValidation';
import { useAuth } from '@/hooks/useAuth';
import financyLogo from '@/assets/financy-logo-new-dark.png';

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => Promise<void>;
  /** @deprecated mantido por compatibilidade; o telefone agora é opcional na etapa 2. */
  skipPhoneStep?: boolean;
}

const PREFER_NOT_SAY = 'prefer_not_say';

const SALARY_RANGES = [
  { value: '0-2000', label: 'Até R$ 2.000' },
  { value: '2000-5000', label: 'R$ 2.000 – R$ 5.000' },
  { value: '5000-10000', label: 'R$ 5.000 – R$ 10.000' },
  { value: '10000-20000', label: 'R$ 10.000 – R$ 20.000' },
  { value: '20000+', label: 'Acima de R$ 20.000' },
  { value: PREFER_NOT_SAY, label: 'Prefiro não informar' },
];

const REVENUE_RANGES = [
  { value: '0-10000', label: 'Até R$ 10.000/mês' },
  { value: '10000-50000', label: 'R$ 10.000 – R$ 50.000/mês' },
  { value: '50000-200000', label: 'R$ 50.000 – R$ 200.000/mês' },
  { value: '200000-1000000', label: 'R$ 200.000 – R$ 1Mi/mês' },
  { value: '1000000+', label: 'Acima de R$ 1Mi/mês' },
  { value: PREFER_NOT_SAY, label: 'Prefiro não informar' },
];

const TOTAL_STEPS = 4;

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    whatsapp: '',
    user_type: '',
    how_did_you_know: '',
    salary_range: '',
    revenue_range: '',
    nome_preferido: '',
    nome_empresa: '',
    termos_aceitos: false,
    gastos_iniciais: [],
  });

  // Phone state
  const [whatsappE164, setWhatsappE164] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneCorrections, setPhoneCorrections] = useState<CorrectionType[]>([]);
  const [phoneWarning, setPhoneWarning] = useState<string | null>(null);

  const triggerConfetti = () => {
    const end = Date.now() + 2000;
    const tick = () => {
      confetti({ particleCount: 40, spread: 80, origin: { y: 0.6 } });
      if (Date.now() < end) requestAnimationFrame(tick);
    };
    tick();
  };

  const handlePhoneChange = (formatted: string, isValid: boolean, normalized: string) => {
    setData((d) => ({ ...d, whatsapp: formatted }));
    setWhatsappE164(normalized);
    setIsPhoneValid(isValid);
    setPhoneError(null);
    setPhoneWarning(null);

    if (formatted && formatted.length > 5) {
      const result = validateAndNormalizePhone(formatted);
      if (!result.isValid) {
        setIsPhoneValid(false);
        setPhoneError(result.error || 'Número inválido');
        setPhoneCorrections([]);
      } else {
        setIsPhoneValid(true);
        setWhatsappE164(result.normalized!);
        setPhoneCorrections(result.corrections);
        if (result.corrections.length > 0) {
          setPhoneWarning(result.corrections.map((c) => c.message).join('\n'));
        } else if (result.warning) {
          setPhoneWarning(result.warning);
        }
      }
    }
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return data.user_type === 'pessoal' || data.user_type === 'empresarial';
      case 2:
        if (!data.nome_preferido?.trim()) return false;
        if (data.user_type === 'empresarial' && !data.nome_empresa?.trim()) return false;
        // WhatsApp opcional, mas se preenchido tem que ser válido
        if (data.whatsapp && data.whatsapp.length > 3 && !isPhoneValid) return false;
        return true;
      case 3:
        if (data.user_type === 'pessoal') return !!data.salary_range;
        return !!data.revenue_range;
      case 4:
        return !!data.termos_aceitos;
      default:
        return false;
    }
  };

  const goNext = async () => {
    if (!canProceed()) return;

    // Step 2: valida duplicata se telefone foi informado
    if (step === 2 && whatsappE164) {
      setLoading(true);
      try {
        const { isDuplicate, error } = await checkPhoneDuplicate(whatsappE164);
        if (error) {
          toast({ title: 'Erro', description: error, variant: 'destructive' });
          return;
        }
        if (isDuplicate) {
          setPhoneError('Este número já está cadastrado em outra conta');
          toast({
            title: 'Número já cadastrado',
            description: 'Este número está sendo usado em outra conta.',
            variant: 'destructive',
          });
          return;
        }
      } catch (e) {
        console.error(e);
        toast({ title: 'Erro', description: 'Falha ao validar telefone.', variant: 'destructive' });
        return;
      } finally {
        setLoading(false);
      }
    }

    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      return;
    }

    // Finalize
    setLoading(true);
    try {
      const finalData: OnboardingData = {
        ...data,
        whatsapp: whatsappE164 || '',
        how_did_you_know: '',
        gastos_iniciais: [],
      };
      await onComplete(finalData);

      if (user && phoneCorrections.length > 0 && whatsappE164) {
        await savePhoneCorrection(
          user.id,
          data.whatsapp,
          whatsappE164,
          phoneCorrections,
          'onboarding'
        );
      }

      triggerConfetti();
      requestGeneralTour();
      toast({
        title: '🎉 Bem-vindo ao Financy!',
        description: `Olá ${data.nome_preferido}! Vamos começar.`,
      });
    } catch (error: any) {
      console.error('Erro ao completar onboarding:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Houve um erro ao salvar. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Top bar com logo + progresso */}
      <header className="w-full px-4 sm:px-6 pt-5 pb-3 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <img src={financyLogo} alt="Financy" className="h-8 sm:h-10 object-contain" />
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">
            Etapa {step} de {TOTAL_STEPS} · {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </header>

      {/* Conteúdo */}
      <main className="flex-1 w-full px-4 sm:px-6 py-4 sm:py-8 max-w-3xl mx-auto w-full">
        <Card className="border-border/60 shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-5 sm:p-8 md:p-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
              >
                {step === 1 && (
                  <WelcomeAccountStep
                    value={data.user_type}
                    onChange={(v) => setData({ ...data, user_type: v })}
                  />
                )}
                {step === 2 && (
                  <IdentityStep
                    data={data}
                    setData={setData}
                    onPhoneChange={handlePhoneChange}
                    isPhoneValid={isPhoneValid}
                    phoneError={phoneError}
                    phoneWarning={phoneWarning}
                  />
                )}
                {step === 3 && (
                  <FinancialContextStep
                    userType={data.user_type}
                    salaryRange={data.salary_range || ''}
                    revenueRange={data.revenue_range || ''}
                    onSelectSalary={(v) => setData({ ...data, salary_range: v })}
                    onSelectRevenue={(v) => setData({ ...data, revenue_range: v })}
                  />
                )}
                {step === 4 && (
                  <TermsCompleteStep
                    accepted={!!data.termos_aceitos}
                    onToggle={() => setData({ ...data, termos_aceitos: !data.termos_aceitos })}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Nav */}
            <div className="flex items-center justify-between gap-3 pt-6 mt-6 sm:pt-8 sm:mt-8 border-t border-border/60">
              {step > 1 ? (
                <Button variant="ghost" onClick={goBack} disabled={loading} className="px-3 sm:px-5">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
              ) : (
                <div />
              )}

              <Button
                onClick={goNext}
                disabled={!canProceed() || loading}
                size="lg"
                className="flex-1 sm:flex-none sm:min-w-[180px]"
              >
                {step === TOTAL_STEPS
                  ? (loading ? 'Finalizando...' : 'Começar a usar')
                  : 'Continuar'}
                {step < TOTAL_STEPS && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4 sm:mt-6 px-4">
          Suas informações são criptografadas e usadas apenas para personalizar sua experiência.
        </p>
      </main>
    </div>
  );
};

// ───────────────────────────────────────────────────────────
// Step 1 — Welcome + tipo de conta
// ───────────────────────────────────────────────────────────
const WelcomeAccountStep: React.FC<{
  value: string;
  onChange: (v: string) => void;
}> = ({ value, onChange }) => (
  <div className="space-y-6 sm:space-y-8">
    <div className="text-center space-y-2 sm:space-y-3">
      <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 mb-1">
        <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
      </div>
      <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Bem-vindo ao Financy</h1>
      <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
        Vamos personalizar sua experiência em 4 etapas rápidas. Para começar, escolha o tipo de conta:
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <AccountCard
        active={value === 'pessoal'}
        onClick={() => onChange('pessoal')}
        icon={<User className="w-6 h-6 sm:w-7 sm:h-7" />}
        title="Pessoal"
        description="Controle suas finanças do dia a dia"
      />
      <AccountCard
        active={value === 'empresarial'}
        onClick={() => onChange('empresarial')}
        icon={<Building className="w-6 h-6 sm:w-7 sm:h-7" />}
        title="Empresarial"
        description="Gerencie as finanças do seu negócio"
      />
    </div>
  </div>
);

const AccountCard: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ active, onClick, icon, title, description }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative text-left p-5 sm:p-6 rounded-xl border-2 transition-all duration-200 active:scale-[0.98]
      ${active
        ? 'border-primary bg-primary/5 shadow-md'
        : 'border-border hover:border-primary/40 hover:bg-muted/40'
      }`}
  >
    <div className="flex items-start gap-3 sm:gap-4">
      <div className={`flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl shrink-0
        ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-base sm:text-lg">{title}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
    {active && (
      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
        <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
      </div>
    )}
  </button>
);

// ───────────────────────────────────────────────────────────
// Step 2 — Identidade (nome + empresa + WhatsApp opcional)
// ───────────────────────────────────────────────────────────
const IdentityStep: React.FC<{
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  onPhoneChange: (formatted: string, isValid: boolean, normalized: string) => void;
  isPhoneValid: boolean;
  phoneError: string | null;
  phoneWarning: string | null;
}> = ({ data, setData, onPhoneChange, isPhoneValid, phoneError, phoneWarning }) => {
  const isBusiness = data.user_type === 'empresarial';
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="text-center space-y-1.5">
        <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight">Como devemos te chamar?</h2>
        <p className="text-sm text-muted-foreground">Este nome aparecerá em sua dashboard.</p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        {isBusiness && (
          <div>
            <Label htmlFor="empresa" className="text-sm font-medium">
              Nome da empresa <span className="text-destructive">*</span>
            </Label>
            <Input
              id="empresa"
              value={data.nome_empresa || ''}
              onChange={(e) => setData((d) => ({ ...d, nome_empresa: e.target.value }))}
              placeholder="Ex: Minha Empresa LTDA"
              className="h-11 sm:h-12 mt-1.5"
            />
          </div>
        )}

        <div>
          <Label htmlFor="nome" className="text-sm font-medium">
            Seu nome preferido <span className="text-destructive">*</span>
          </Label>
          <Input
            id="nome"
            value={data.nome_preferido || ''}
            onChange={(e) => setData((d) => ({ ...d, nome_preferido: e.target.value }))}
            placeholder="Como podemos te chamar?"
            className="h-11 sm:h-12 mt-1.5"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label htmlFor="whatsapp" className="text-sm font-medium flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-success" />
              WhatsApp
            </Label>
            <Badge variant="secondary" className="text-[10px] h-5">Opcional</Badge>
          </div>
          <BrazilianPhoneInput
            value={data.whatsapp}
            onChange={onPhoneChange}
            placeholder="Digite seu número (opcional)"
            error={phoneError || undefined}
            showValidationFeedback={!!data.whatsapp && data.whatsapp.length > 3}
          />
          {phoneWarning && isPhoneValid && (
            <div className="mt-2 flex items-start gap-2 text-xs text-warning bg-warning/10 border border-warning/20 rounded-md p-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="whitespace-pre-line">{phoneWarning}</span>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Receba insights e alertas via WhatsApp. Você pode adicionar depois.
          </p>
        </div>

        {data.nome_preferido && (!isBusiness || data.nome_empresa) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-3.5 rounded-xl bg-gradient-to-r from-primary/8 to-primary/4 border border-primary/15"
          >
            <p className="text-xs text-muted-foreground">Prévia</p>
            <p className="text-base sm:text-lg font-semibold text-foreground mt-0.5">
              Olá, {data.nome_preferido}! 👋
            </p>
            {isBusiness && (
              <p className="text-xs text-muted-foreground mt-0.5">{data.nome_empresa}</p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────────
// Step 3 — Contexto financeiro
// ───────────────────────────────────────────────────────────
const FinancialContextStep: React.FC<{
  userType: string;
  salaryRange: string;
  revenueRange: string;
  onSelectSalary: (v: string) => void;
  onSelectRevenue: (v: string) => void;
}> = ({ userType, salaryRange, revenueRange, onSelectSalary, onSelectRevenue }) => {
  const isBusiness = userType === 'empresarial';
  const ranges = isBusiness ? REVENUE_RANGES : SALARY_RANGES;
  const selected = isBusiness ? revenueRange : salaryRange;
  const onSelect = isBusiness ? onSelectRevenue : onSelectSalary;
  const Icon = isBusiness ? TrendingUp : Wallet;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-1">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight">
          {isBusiness ? 'Qual o faturamento da empresa?' : 'Qual sua faixa de renda?'}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Usamos isso apenas para personalizar metas e sugestões da IA.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
        {ranges.map((r) => {
          const isSelected = selected === r.value;
          const isPrefer = r.value === PREFER_NOT_SAY;
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => onSelect(r.value)}
              className={`flex items-center justify-between p-3.5 sm:p-4 rounded-lg border-2 transition-all text-left active:scale-[0.99]
                ${isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-muted/40'}
                ${isPrefer ? 'mt-1' : ''}`}
            >
              <span className={`text-sm sm:text-base font-medium ${isPrefer ? 'text-muted-foreground italic' : ''}`}>
                {r.label}
              </span>
              {isSelected && (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────────
// Step 4 — Termos
// ───────────────────────────────────────────────────────────
const TermsCompleteStep: React.FC<{
  accepted: boolean;
  onToggle: () => void;
}> = ({ accepted, onToggle }) => (
  <div className="space-y-5 sm:space-y-6">
    <div className="text-center space-y-2">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-1">
        <ShieldCheck className="w-6 h-6 text-primary" />
      </div>
      <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight">Quase lá!</h2>
      <p className="text-sm text-muted-foreground">Aceite os termos para começar a usar.</p>
    </div>

    <div className="max-w-md mx-auto space-y-4">
      <div className="bg-muted/40 rounded-xl p-4 sm:p-5 text-sm space-y-2 text-muted-foreground max-h-48 overflow-y-auto border border-border/50">
        <p><strong className="text-foreground">🔐 Privacidade:</strong> Seus dados financeiros são criptografados e nunca compartilhados.</p>
        <p><strong className="text-foreground">🛡️ Segurança:</strong> Seguimos as melhores práticas para proteger suas informações.</p>
        <p><strong className="text-foreground">🤖 IA personalizada:</strong> Usamos seus dados apenas para gerar insights para você.</p>
        <p><strong className="text-foreground">✋ Controle:</strong> Você pode exportar ou excluir seus dados a qualquer momento.</p>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-start gap-3 p-3.5 sm:p-4 rounded-lg border-2 cursor-pointer transition-all text-left
          ${accepted ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
      >
        <Checkbox checked={accepted} className="mt-0.5 pointer-events-none" />
        <span className="text-sm leading-relaxed">
          <strong>Li e aceito</strong> os termos de uso da Financy e a Política de Privacidade.
        </span>
      </button>
    </div>
  </div>
);
