import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [showOnboarding, setShowOnboarding] = useState(false);

  const limits = getLimits();
  const dashboardsRestantes = limits.maxDashboards === -1 ? 999 : limits.maxDashboards - dashboards.length;
  const isAtLimit = limits.maxDashboards !== -1 && dashboards.length >= limits.maxDashboards;

  const handleOnboardingComplete = async (data: OnboardingData) => {
    if (!user) return;

    try {
      // Criar novo dashboard baseado no tipo escolhido no onboarding
      const dashboardType = data.user_type === 'pessoal' ? 'personal' : 'business';
      const dashboardName = data.nome_preferido || `${data.user_type === 'pessoal' ? 'Pessoal' : 'Empresa'} ${dashboards.length + 1}`;
      
      // Criar o dashboard
      await createDashboard(dashboardName, dashboardType);
      
      // Buscar o dashboard recém-criado
      const { data: newDashboardData } = await supabase
        .from('user_dashboards')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', dashboardName)
        .single();

      if (newDashboardData) {
        // Salvar dados do onboarding com o dashboard_id correto
        const { error: onboardingError } = await supabase
          .from('onboarding_data')
          .insert({
            user_id: user.id,
            user_type: data.user_type,
            how_did_you_know: data.how_did_you_know,
            salary_range: data.salary_range,
            revenue_range: data.revenue_range,
            nome_preferido: data.nome_preferido,
            termos_aceitos: data.termos_aceitos
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
                    <p className="text-sm font-medium">Limite de dashboards atingido</p>
                    <p className="text-xs">
                      Você atingiu o limite de {limits.maxDashboards} dashboard(s) para seu plano {subscriptionTier}. 
                      Faça upgrade para criar mais dashboards.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="lg"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  if (subscriptionTier === 'free' && dashboardType === 'business') {
                    toast({
                      title: "Recurso não disponível",
                      description: "Dashboards empresariais não estão disponíveis no plano gratuito. Faça upgrade para acessar este recurso.",
                      variant: "destructive"
                    });
                    return;
                  }
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
                onClick={() => {
                  const type = dashboardType || 'business';
                  if (subscriptionTier === 'free' && type === 'business') {
                    toast({
                      title: "Recurso não disponível",
                      description: "Dashboards empresariais não estão disponíveis no plano gratuito. Faça upgrade para acessar este recurso.",
                      variant: "destructive"
                    });
                    return;
                  }
                  createDashboard(`Dashboard ${dashboards.length + 1}`, type);
                  onOpenChange(false);
                  toast({
                    title: "Dashboard criado!",
                    description: "Dashboard básico criado com sucesso.",
                  });
                }}
              >
                <Building className="h-6 w-6" />
                <div className="text-center">
                  <div className="text-sm font-medium">Criação Simples</div>
                  <div className="text-xs opacity-90">Dashboard vazio</div>
                </div>
              </Button>
            </div>
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