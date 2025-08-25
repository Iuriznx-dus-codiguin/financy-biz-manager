import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Building, User, Plus, ChevronDown, Briefcase } from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { OnboardingData } from '@/types/onboarding';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const CompactDashboardSelector = () => {
  const { currentDashboard, dashboards, setCurrentDashboard, createDashboard } = useDashboard();
  const { isFeatureAvailable, getLimits } = useFeatureAccess();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardType, setNewDashboardType] = useState<'personal' | 'business'>('business');
  const [showOnboarding, setShowOnboarding] = useState(false);

  const limits = getLimits();
  const canCreateDashboard = isFeatureAvailable('multi_dashboard') && dashboards.length < limits.maxDashboards;

  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) return;

    try {
      await createDashboard(newDashboardName, newDashboardType);
      setIsCreateDialogOpen(false);
      setNewDashboardName('');
      setNewDashboardType('business');
    } catch (error) {
      console.error('Error creating dashboard:', error);
    }
  };

  const handleOnboardingComplete = async (data: OnboardingData) => {
    if (!user) return;

    try {
      // Criar novo dashboard baseado no tipo escolhido no onboarding
      const dashboardType = data.user_type === 'pessoal' ? 'personal' : 'business';
      const dashboardName = data.nome_preferido || `${data.user_type === 'pessoal' ? 'Pessoal' : 'Empresa'} ${dashboards.length + 1}`;
      
      await createDashboard(dashboardName, dashboardType);
      
      // Como createDashboard não retorna o dashboard criado, vamos buscar o mais recente
      // após criar para salvar os dados relacionados
      
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

      setShowOnboarding(false);
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

  const personalDashboards = dashboards.filter(d => d.type === 'personal');
  const businessDashboards = dashboards.filter(d => d.type === 'business');

  if (!currentDashboard) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-8 px-3 text-xs">
            <Briefcase className="h-3 w-3" />
            {currentDashboard.name}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-2">
          {/* Personal Dashboards */}
          {personalDashboards.length > 0 && (
            <div className="mb-2">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                PESSOAL
              </div>
              {personalDashboards.map((dashboard) => (
                <button
                  key={dashboard.id}
                  onClick={() => setCurrentDashboard(dashboard)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors ${
                    currentDashboard.id === dashboard.id ? 'bg-muted' : ''
                  }`}
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-left">{dashboard.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Business Dashboards */}
          {businessDashboards.length > 0 && (
            <div className="mb-2">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                EMPRESARIAL
              </div>
              {businessDashboards.map((dashboard) => (
                <button
                  key={dashboard.id}
                  onClick={() => setCurrentDashboard(dashboard)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors ${
                    currentDashboard.id === dashboard.id ? 'bg-muted' : ''
                  }`}
                >
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-left">{dashboard.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Add Dashboard Option */}
          {canCreateDashboard && (
            <>
              <DropdownMenuSeparator />
              <button
                onClick={() => setIsCreateDialogOpen(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors text-primary"
              >
                <Plus className="h-4 w-4" />
                <span>+ Adicionar Dashboard</span>
              </button>
            </>
          )}

          {/* Create New Account/Dashboard */}
          {canCreateDashboard && (
            <>
              <DropdownMenuSeparator />
              <button
                onClick={() => setShowOnboarding(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors text-green-600"
              >
                <Plus className="h-4 w-4" />
                <span>Criar Nova Conta</span>
              </button>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Dashboard Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Dashboard</DialogTitle>
          </DialogHeader>
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
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateDashboard} disabled={!newDashboardName.trim()}>
                Criar Dashboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 bg-background">
          <OnboardingFlow onComplete={handleOnboardingComplete} />
        </div>
      )}
    </>
  );
};