import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building, User, AlertTriangle, Sparkles } from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { OnboardingData } from '@/types/onboarding';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserSubscription } from '@/hooks/useUserSubscription';

interface DashboardCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardType?: 'personal' | 'business' | null;
}

interface FinalidadePreset {
  value: string;
  label: string;
  /** Sugestão de nome para o dashboard ao escolher esta finalidade. */
  suggestedName: string;
}

const PERSONAL_PRESETS: FinalidadePreset[] = [
  { value: 'eu',       label: 'Eu',          suggestedName: 'Meu Perfil' },
  { value: 'familia',  label: 'Família',     suggestedName: 'Família' },
  { value: 'filho',    label: 'Filho(a)',    suggestedName: 'Filho(a)' },
  { value: 'casa',     label: 'Casa',        suggestedName: 'Casa' },
  { value: 'viagens',  label: 'Viagens',     suggestedName: 'Viagens' },
  { value: 'outro',    label: 'Outro',       suggestedName: '' },
];

const BUSINESS_PRESETS: FinalidadePreset[] = [
  { value: 'vendas',      label: 'Setor de Vendas',     suggestedName: 'Vendas' },
  { value: 'transporte',  label: 'Setor de Transporte', suggestedName: 'Transporte' },
  { value: 'marketing',   label: 'Marketing',           suggestedName: 'Marketing' },
  { value: 'operacional', label: 'Operacional',         suggestedName: 'Operacional' },
  { value: 'filial',      label: 'Filial',              suggestedName: 'Filial' },
  { value: 'pessoal',     label: 'Pessoal do sócio',    suggestedName: 'Pessoal do sócio' },
  { value: 'outro',       label: 'Outro',               suggestedName: '' },
];

export const DashboardCreateDialog: React.FC<DashboardCreateDialogProps> = ({ open, onOpenChange, dashboardType = null }) => {
  const { dashboards, createDashboard, setCurrentDashboard } = useDashboard();
  const { getLimits, subscriptionTier } = useFeatureAccess();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isBusinessPlan } = useUserSubscription();
  const navigate = useNavigate();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedType, setSelectedType] = useState<'personal' | 'business'>(dashboardType ?? 'personal');
  const [finalidade, setFinalidade] = useState<string>('');
  const [nomeDashboard, setNomeDashboard] = useState<string>('');

  const limits = getLimits();
  const dashboardsRestantes = limits.maxProfiles === -1 ? 999 : limits.maxProfiles - dashboards.length;
  const isAtLimit = limits.maxProfiles !== -1 && dashboards.length >= limits.maxProfiles;
  const canCreateBusiness = isBusinessPlan();

  const presets = useMemo(
    () => (selectedType === 'business' ? BUSINESS_PRESETS : PERSONAL_PRESETS),
    [selectedType]
  );

  // Quando muda tipo ou finalidade, sugere automaticamente o nome (sem sobrescrever
  // se o usuário já digitou algo diferente da sugestão anterior).
  useEffect(() => {
    if (!finalidade) return;
    const preset = presets.find(p => p.value === finalidade);
    if (preset?.suggestedName) {
      setNomeDashboard(prev => (prev && prev.trim().length > 0 ? prev : preset.suggestedName));
    }
  }, [finalidade, presets]);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setShowOnboarding(false);
      setFinalidade('');
      setNomeDashboard('');
    }
  }, [open]);

  const handleOnboardingComplete = async (data: OnboardingData) => {
    if (!user) return;

    try {
      const dashboardName =
        (nomeDashboard && nomeDashboard.trim()) ||
        (selectedType === 'business' && data.nome_empresa) ||
        data.nome_preferido ||
        `${selectedType === 'personal' ? 'Perfil' : 'Empresa'} ${dashboards.length + 1}`;

      // Criar o dashboard com o tipo selecionado
      await createDashboard(dashboardName, selectedType);

      // Buscar o dashboard recém-criado para popular dados auxiliares (despesas iniciais, meta)
      const { data: newDashboardData } = await supabase
        .from('user_dashboards')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', dashboardName)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (newDashboardData) {
        // Se tem gastos iniciais, criar despesas vinculadas a este dashboard
        if (data.gastos_iniciais && data.gastos_iniciais.length > 0) {
          const despesas = data.gastos_iniciais.map(gasto => ({
            user_id: user.id,
            dashboard_id: newDashboardData.id,
            descricao: gasto.descricao,
            categoria: gasto.categoria,
            valor: gasto.valor_mensal,
            data: new Date().toISOString().split('T')[0],
            forma_pagamento: gasto.forma_pagamento || 'dinheiro',
            fornecedor: ''
          }));

          const { error: despesasError } = await supabase.from('despesas').insert(despesas);
          if (despesasError) console.error('Erro ao salvar despesas iniciais:', despesasError);
        }

        if (data.meta_financeira && data.valor_meta) {
          const { error: metaError } = await supabase.from('metas').insert({
            user_id: user.id,
            dashboard_id: newDashboardData.id,
            titulo: data.meta_financeira,
            valor_meta: data.valor_meta,
            valor_atual: 0,
            progresso: 0,
            prazo: data.prazo_meta || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            categoria: 'financeira',
            status: 'em_andamento',
            cor: 'bg-blue-500'
          });
          if (metaError) console.error('Erro ao salvar meta financeira:', metaError);
        }

        // Trocar para o novo dashboard sem reload — preserva o estado da app
        setCurrentDashboard({
          id: newDashboardData.id,
          name: newDashboardData.name,
          type: newDashboardData.type as 'personal' | 'business',
          isDefault: newDashboardData.is_default,
        });
      }

      setShowOnboarding(false);
      onOpenChange(false);
      navigate('/dashboard');
      toast({
        title: 'Dashboard criado com sucesso!',
        description: `${dashboardName} já está ativo e pronto para uso.`,
      });
    } catch (error) {
      console.error('Erro ao completar onboarding do novo dashboard:', error);
      toast({
        title: 'Erro',
        description: 'Houve um erro ao criar o novo dashboard. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  if (showOnboarding) {
    return createPortal(
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{ width: '100%', height: '100%', backgroundColor: 'hsl(var(--background))', overflow: 'auto' }}>
          <OnboardingFlow onComplete={handleOnboardingComplete} skipPhoneStep={true} />
        </div>
      </div>,
      document.body
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Criar novo dashboard
          </DialogTitle>
          <DialogDescription>
            Separe finanças por contexto — família, setores do negócio ou pessoal/empresarial — em um único plano.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium">Dashboards restantes</span>
            <span className="text-lg font-bold text-primary">{dashboardsRestantes}</span>
          </div>

          {isAtLimit ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/50 dark:border-amber-900">
              <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Limite atingido</p>
                  <p className="text-xs">
                    Seu plano {subscriptionTier} permite {limits.maxProfiles} dashboard(s). Faça upgrade para criar mais.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Tipo */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={selectedType === 'personal' ? 'default' : 'outline'}
                    size="lg"
                    className="h-16 flex-col gap-1"
                    onClick={() => { setSelectedType('personal'); setFinalidade(''); }}
                  >
                    <User className="h-5 w-5" />
                    <span className="text-sm">Perfil</span>
                  </Button>

                  {canCreateBusiness ? (
                    <Button
                      variant={selectedType === 'business' ? 'default' : 'outline'}
                      size="lg"
                      className="h-16 flex-col gap-1"
                      onClick={() => { setSelectedType('business'); setFinalidade(''); }}
                    >
                      <Building className="h-5 w-5" />
                      <span className="text-sm">Empresa</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-16 flex-col gap-1 opacity-50 cursor-not-allowed"
                      disabled
                      title="Disponível apenas em planos empresariais"
                    >
                      <Building className="h-5 w-5" />
                      <span className="text-sm">Empresa</span>
                      <span className="text-[10px] text-muted-foreground">Plano Empresarial</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Finalidade — chips adaptativos */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Finalidade <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map(p => {
                    const active = finalidade === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setFinalidade(active ? '' : p.value)}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-colors
                          ${active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {selectedType === 'business'
                    ? 'Ex.: separar transporte de vendas, ou pessoal do sócio do operacional.'
                    : 'Ex.: separar finanças da casa, da família ou das viagens.'}
                </p>
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="dashboard-name" className="text-sm font-medium">
                  Nome do dashboard
                </Label>
                <Input
                  id="dashboard-name"
                  value={nomeDashboard}
                  onChange={(e) => setNomeDashboard(e.target.value)}
                  placeholder={selectedType === 'business' ? 'Ex: Setor de Vendas' : 'Ex: Família'}
                  className="h-10"
                />
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Você fará uma configuração rápida em seguida. As finanças do novo dashboard ficam isoladas das demais.
                </AlertDescription>
              </Alert>

              <Button
                size="lg"
                className="w-full"
                onClick={() => setShowOnboarding(true)}
              >
                Continuar configuração
              </Button>
            </>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
