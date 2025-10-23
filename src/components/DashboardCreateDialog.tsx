import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building, User, AlertTriangle } from 'lucide-react';
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

export const DashboardCreateDialog: React.FC<DashboardCreateDialogProps> = ({ open, onOpenChange, dashboardType = null }) => {
  const { dashboards, createDashboard } = useDashboard();
  const { getLimits, subscriptionTier } = useFeatureAccess();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isBusinessPlan } = useUserSubscription();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedType, setSelectedType] = useState<'personal' | 'business'>('personal');

  const limits = getLimits();
  const dashboardsRestantes = limits.maxProfiles === -1 ? 999 : limits.maxProfiles - dashboards.length;
  const isAtLimit = limits.maxProfiles !== -1 && dashboards.length >= limits.maxProfiles;
  
  // Planos empresariais podem criar perfis e empresas
  // Planos pessoais só podem criar perfis
  const canCreateBusiness = isBusinessPlan();

  const handleOnboardingComplete = async (data: OnboardingData) => {
    if (!user) return;

    try {
      // Usar o tipo selecionado no diálogo, não do onboarding
      const dashboardName = data.nome_preferido || `${selectedType === 'personal' ? 'Perfil' : 'Empresa'} ${dashboards.length + 1}`;
      
      // Criar o dashboard com o tipo selecionado
      await createDashboard(dashboardName, selectedType);
      
      // Buscar o dashboard recém-criado
      const { data: newDashboardData } = await supabase
        .from('user_dashboards')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', dashboardName)
        .single();

      if (newDashboardData) {
        // Salvar dados do onboarding com o dashboard_id correto (usar upsert para evitar duplicatas)
        const { error: onboardingError } = await supabase
          .from('onboarding_data')
          .upsert({
            user_id: user.id,
            user_type: data.user_type,
            how_did_you_know: data.how_did_you_know,
            salary_range: data.salary_range,
            revenue_range: data.revenue_range,
            nome_preferido: data.nome_preferido,
            termos_aceitos: data.termos_aceitos
          }, {
            onConflict: 'user_id'
          });

        if (onboardingError) {
          console.error('Erro ao salvar dados do onboarding:', onboardingError);
        }

        // Se tem gastos iniciais, criar despesas com o dashboard_id correto
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

          const { error: despesasError } = await supabase
            .from('despesas')
            .insert(despesas);

          if (despesasError) {
            console.error('Erro ao salvar despesas iniciais:', despesasError);
          }
        }

        // Se tem meta financeira, criar meta com o dashboard_id correto
        if (data.meta_financeira && data.valor_meta) {
          const { error: metaError } = await supabase
            .from('metas')
            .insert({
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

          if (metaError) {
            console.error('Erro ao salvar meta financeira:', metaError);
          }
        }

        // Recarregar dashboards usando método mais seguro
        if (typeof window !== 'undefined') {
          window.location.replace(window.location.pathname);
        }
      }

      setShowOnboarding(false);
      onOpenChange(false);
      toast({
        title: "Dashboard criado com sucesso!",
        description: `${dashboardName} foi configurado e está pronto para uso.`,
      });
    } catch (error) {
      console.error('Erro ao completar onboarding do novo dashboard:', error);
      toast({
        title: "Erro",
        description: "Houve um erro ao criar o novo dashboard. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  if (showOnboarding) {
    return createPortal(
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'hsl(var(--background))',
            overflow: 'auto'
          }}
        >
          <OnboardingFlow onComplete={handleOnboardingComplete} />
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
            Criar Novo Dashboard
          </DialogTitle>
          <DialogDescription>
            Crie um novo dashboard para organizar suas informações financeiras de forma separada.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Tem certeza que deseja criar mais um dashboard? Você poderá configurar todas as configurações iniciais novamente.
            </AlertDescription>
          </Alert>

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Dashboards restantes:</span>
              <span className="text-lg font-bold text-primary">{dashboardsRestantes}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Baseado no seu plano atual
            </p>
          </div>

          {isAtLimit ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/50 dark:border-amber-900">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">Limite de perfis/empresas atingido</p>
                    <p className="text-xs">
                      Você atingiu o limite de {limits.maxProfiles} perfil/empresa para seu plano {subscriptionTier}. 
                      Faça upgrade para criar mais perfis/empresas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Seleção de tipo */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Tipo de {canCreateBusiness ? 'Perfil/Empresa' : 'Perfil'}</label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={selectedType === 'personal' ? 'default' : 'outline'}
                    size="lg"
                    className="h-16 flex-col gap-1"
                    onClick={() => setSelectedType('personal')}
                  >
                    <User className="h-5 w-5" />
                    <span className="text-sm">Perfil</span>
                  </Button>

                  {canCreateBusiness ? (
                    <Button
                      variant={selectedType === 'business' ? 'default' : 'outline'}
                      size="lg"
                      className="h-16 flex-col gap-1"
                      onClick={() => setSelectedType('business')}
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
                      <span className="text-xs text-muted-foreground">Plano Empresarial</span>
                    </Button>
                  )}
                </div>
                
                {!canCreateBusiness && (
                  <p className="text-xs text-muted-foreground">
                    💡 Empresas estão disponíveis apenas em planos empresariais. Faça upgrade para desbloquear!
                  </p>
                )}
              </div>

              {/* Opções de criação */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-20 flex-col gap-2"
                  onClick={() => {
                    setShowOnboarding(true);
                  }}
                >
                  <User className="h-6 w-6" />
                  <div className="text-center">
                    <div className="text-sm font-medium">Configuração Completa</div>
                    <div className="text-xs text-muted-foreground">Com onboarding</div>
                  </div>
                </Button>

                <Button
                  size="lg"
                  className="h-20 flex-col gap-2"
                  onClick={async () => {
                    try {
                      const defaultName = selectedType === 'personal' 
                        ? `Perfil ${dashboards.length + 1}` 
                        : `Empresa ${dashboards.length + 1}`;
                      
                      await createDashboard(defaultName, selectedType);
                      onOpenChange(false);
                      toast({
                        title: "Sucesso!",
                        description: `${defaultName} foi criado com sucesso.`,
                      });
                    } catch (error) {
                      toast({
                        title: "Erro",
                        description: "Erro ao criar. Tente novamente.",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  <Building className="h-6 w-6" />
                  <div className="text-center">
                    <div className="text-sm font-medium">Criação Simples</div>
                    <div className="text-xs opacity-90">{selectedType === 'personal' ? 'Perfil' : 'Empresa'} vazio</div>
                  </div>
                </Button>
              </div>
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