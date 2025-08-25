import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Users, Building, Plus } from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { OnboardingData } from '@/types/onboarding';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DashboardCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DashboardCreateDialog: React.FC<DashboardCreateDialogProps> = ({ open, onOpenChange }) => {
  const { dashboards, createDashboard } = useDashboard();
  const { isFeatureAvailable, getLimits } = useFeatureAccess();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'confirm' | 'simple' | 'onboarding'>('confirm');
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardType, setNewDashboardType] = useState<'personal' | 'business'>('business');
  const [showOnboarding, setShowOnboarding] = useState(false);

  const limits = getLimits();
  const canCreateDashboard = isFeatureAvailable('multi_dashboard') && dashboards.length < limits.maxDashboards;
  const remainingDashboards = limits.maxDashboards === -1 ? 'Ilimitado' : limits.maxDashboards - dashboards.length;

  const handleSimpleCreate = async () => {
    if (!newDashboardName.trim()) return;

    try {
      await createDashboard(newDashboardName, newDashboardType);
      onOpenChange(false);
      resetState();
      toast({
        title: "Dashboard criado!",
        description: `${newDashboardName} foi criado com sucesso.`,
      });
    } catch (error) {
      console.error('Error creating dashboard:', error);
      toast({
        title: "Erro",
        description: "Houve um erro ao criar o dashboard. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleOnboardingCreate = () => {
    setStep('onboarding');
  };

  const handleOnboardingComplete = async (data: OnboardingData) => {
    if (!user) return;

    try {
      const dashboardType = data.user_type === 'pessoal' ? 'personal' : 'business';
      const dashboardName = data.nome_preferido || `${data.user_type === 'pessoal' ? 'Pessoal' : 'Empresa'} ${dashboards.length + 1}`;
      
      await createDashboard(dashboardName, dashboardType);
      
      // Salvar dados do onboarding
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

      // Se tem gastos iniciais, criar despesas
      if (data.gastos_iniciais && data.gastos_iniciais.length > 0) {
        const despesas = data.gastos_iniciais.map(gasto => ({
          user_id: user.id,
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

      onOpenChange(false);
      resetState();
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

  const resetState = () => {
    setStep('confirm');
    setNewDashboardName('');
    setNewDashboardType('business');
    setShowOnboarding(false);
  };

  if (step === 'onboarding') {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(openState) => {
      onOpenChange(openState);
      if (!openState) resetState();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Criar Novo Dashboard
          </DialogTitle>
        </DialogHeader>

        {step === 'confirm' ? (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Dashboards restantes:</strong> {remainingDashboards}
                <br />
                Tem certeza que deseja criar mais um dashboard?
              </AlertDescription>
            </Alert>

            <div className="text-sm text-muted-foreground">
              Você pode escolher entre:
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant="outline" 
                onClick={() => setStep('simple')}
                className="h-auto p-4 flex flex-col items-start gap-2"
                disabled={!canCreateDashboard}
              >
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <strong>Criação Simples</strong>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  Apenas nome e tipo, sem configuração inicial
                </span>
              </Button>

              <Button 
                variant="outline" 
                onClick={handleOnboardingCreate}
                className="h-auto p-4 flex flex-col items-start gap-2"
                disabled={!canCreateDashboard}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <strong>Configuração Completa</strong>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  Com onboarding e configurações iniciais
                </span>
              </Button>
            </div>

            {!canCreateDashboard && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Você atingiu o limite de dashboards da sua assinatura.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Dashboard</Label>
              <Input
                id="name"
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
                placeholder="Ex: Empresa X, Freelances, Pessoal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={newDashboardType} onValueChange={(value: 'personal' | 'business') => setNewDashboardType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Empresarial</SelectItem>
                  <SelectItem value="personal">Pessoal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('confirm')}>
                Voltar
              </Button>
              <Button onClick={handleSimpleCreate} disabled={!newDashboardName.trim()}>
                Criar Dashboard
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};