import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { 
  Palette, 
  DollarSign,
  LayoutDashboard,
  User,
  Trash2,
  Plus,
  Crown,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { useSettings, useCurrency } from '@/hooks/useSettings';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { useDashboard } from '@/hooks/useDashboard';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const Configuracoes = () => {
  const { settings, updateSettings, loading } = useSettings();
  const { user, signOut } = useAuth();
  const { subscriptionData, subscriptionTier, loading: subscriptionLoading } = useSubscription();
  const { formatCurrency } = useCurrency();
  const { dashboards, currentDashboard, createDashboard, deleteDashboard } = useDashboard();
  const { getLimits } = useFeatureAccess();
  const { toast } = useToast();
  const [newDashboardName, setNewDashboardName] = useState('');
  const [isCreatingDashboard, setIsCreatingDashboard] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);

  const limits = getLimits();

  const formatSubscriptionEnd = (endDate: string | null) => {
    if (!endDate) return 'N/A';
    return new Date(endDate).toLocaleDateString('pt-BR');
  };

  const getSubscriptionStatus = () => {
    if (subscriptionLoading) return { status: 'Carregando...', variant: 'secondary' };
    
    if (!user) return { status: 'Não autenticado', variant: 'destructive' };
    
    if (!subscriptionData) {
      // Usuário sem registro = teste gratuito
      const signUpDate = new Date(user.created_at || Date.now());
      const trialEndDate = new Date(signUpDate.getTime() + (7 * 24 * 60 * 60 * 1000));
      const today = new Date();
      const diffTime = trialEndDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        return { 
          status: `Teste Grátis (${diffDays} dias restantes)`, 
          variant: 'default',
          endDate: trialEndDate.toLocaleDateString('pt-BR')
        };
      } else {
        return { 
          status: 'Teste Grátis Expirado', 
          variant: 'destructive',
          endDate: trialEndDate.toLocaleDateString('pt-BR')
        };
      }
    }

    if (subscriptionData.subscribed && subscriptionData.subscription_end) {
      const endDate = new Date(subscriptionData.subscription_end);
      const today = new Date();
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        return { 
          status: `${subscriptionData.subscription_tier || 'Premium'} (${diffDays} dias restantes)`, 
          variant: 'default',
          endDate: formatSubscriptionEnd(subscriptionData.subscription_end)
        };
      } else {
        return { 
          status: 'Assinatura Expirada', 
          variant: 'destructive',
          endDate: formatSubscriptionEnd(subscriptionData.subscription_end)
        };
      }
    }

    return { status: 'Sem Assinatura', variant: 'secondary' };
  };

  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) {
      toast({
        title: "Nome inválido",
        description: "Por favor, insira um nome para o dashboard.",
        variant: "destructive",
      });
      return;
    }

    if (dashboards.length >= limits.maxDashboards && limits.maxDashboards !== -1) {
      toast({
        title: "Limite atingido",
        description: `Você atingiu o limite de ${limits.maxDashboards} dashboard(s) para seu plano atual.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreatingDashboard(true);
      await createDashboard(newDashboardName, 'personal');
      setNewDashboardName('');
      toast({
        title: "Dashboard criado",
        description: "Seu novo dashboard foi criado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o dashboard.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingDashboard(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!user) return;
    
    try {
      setIsDeletingData(true);
      
      // Deletar todos os dados financeiros do usuário
      await Promise.all([
        supabase.from('receitas').delete().eq('user_id', user.id),
        supabase.from('despesas').delete().eq('user_id', user.id),
        supabase.from('impostos').delete().eq('user_id', user.id),
        supabase.from('metas').delete().eq('user_id', user.id),
        supabase.from('ai_recognized_transactions').delete().eq('user_id', user.id),
        supabase.from('ai_conversations').delete().eq('user_id', user.id),
      ]);

      // Deletar dashboards (exceto o padrão se existir)
      await supabase
        .from('user_dashboards')
        .delete()
        .eq('user_id', user.id)
        .eq('is_default', false);

      // Resetar configurações (mas manter settings como null para não afetar a estrutura)
      await supabase
        .from('profiles')
        .update({ settings: null } as any)
        .eq('id', user.id);

      // Limpar localStorage das configurações
      localStorage.removeItem('financy-settings');
      
      toast({
        title: "Dados apagados",
        description: "Todos os seus dados financeiros e configurações foram apagados com sucesso. Sua assinatura e data de expiração do teste foram mantidas.",
      });

      // Recarregar a página para aplicar as mudanças
      window.location.reload();
      
    } catch (error) {
      console.error('Erro ao apagar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível apagar todos os dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingData(false);
    }
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando configurações...</div>
        </div>
      </div>
    );
  }

  const subscriptionStatus = getSubscriptionStatus();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <User className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Configurações</h1>
      </div>

      {/* Tema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Aparência
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tema">Tema</Label>
            <Select
              value={settings.tema}
              onValueChange={(value: 'light' | 'dark' | 'system') => 
                updateSettings({ tema: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Escuro</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Moeda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Moeda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="moeda">Moeda Padrão</Label>
            <Select
              value={settings.moeda}
              onValueChange={(value: 'BRL' | 'USD' | 'EUR') => 
                updateSettings({ moeda: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a moeda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">Real Brasileiro (R$)</SelectItem>
                <SelectItem value="USD">Dólar Americano ($)</SelectItem>
                <SelectItem value="EUR">Euro (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dashboards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            Dashboards
            <Badge variant="outline">
              {dashboards.length}/{limits.maxDashboards === -1 ? '∞' : limits.maxDashboards}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Dashboards Criados</Label>
            {dashboards.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum dashboard criado ainda.</p>
            ) : (
              <div className="space-y-2">
                {dashboards.map((dashboard) => (
                  <div key={dashboard.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{dashboard.name}</span>
                      {dashboard.isDefault && <Badge variant="default">Padrão</Badge>}
                      {currentDashboard?.id === dashboard.id && <Badge variant="outline">Atual</Badge>}
                    </div>
                    {!dashboard.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDashboard(dashboard.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {(dashboards.length < limits.maxDashboards || limits.maxDashboards === -1) && (
            <div className="space-y-2">
              <Label htmlFor="newDashboard">Criar Novo Dashboard</Label>
              <div className="flex gap-2">
                <Input
                  id="newDashboard"
                  placeholder="Nome do dashboard"
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                />
                <Button 
                  onClick={handleCreateDashboard}
                  disabled={isCreatingDashboard}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar
                </Button>
              </div>
            </div>
          )}

          {(limits.maxDashboards !== -1 && dashboards.length >= limits.maxDashboards) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md dark:bg-amber-950/50 dark:border-amber-900">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Crown className="h-4 w-4" />
                <p className="text-sm">
                  Você atingiu o limite de dashboards para seu plano atual. 
                  Faça upgrade para criar mais dashboards.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status da Conta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Status da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Plano Atual:</span>
              <Badge variant={subscriptionStatus.variant as any}>
                {subscriptionStatus.status}
              </Badge>
            </div>
            
            {subscriptionStatus.endDate && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Data de Expiração:</span>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{subscriptionStatus.endDate}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="font-medium">Email:</span>
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </div>

            <Separator />

            <div className="space-y-2">
              <span className="font-medium">Limites do Plano:</span>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Dashboards: {limits.maxDashboards === -1 ? 'Ilimitado' : limits.maxDashboards}</div>
                <div>Receitas: {limits.maxReceitas === -1 ? 'Ilimitado' : limits.maxReceitas}</div>
                <div>Despesas: {limits.maxDespesas === -1 ? 'Ilimitado' : limits.maxDespesas}</div>
                <div>Metas: {limits.maxMetas === -1 ? 'Ilimitado' : limits.maxMetas}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Apagar Dados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-destructive">Apagar Todos os Dados</h4>
                <p className="text-sm text-muted-foreground">
                  Esta ação irá apagar permanentemente todos os seus dados financeiros, 
                  configurações e dashboards. Sua assinatura e data de expiração do teste 
                  gratuito serão mantidas.
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  ⚠️ Esta ação não pode ser desfeita!
                </p>
              </div>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeletingData}>
                <Trash2 className="h-4 w-4 mr-2" />
                Apagar Todos os Dados
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá apagar permanentemente:
                  <br />• Todas as receitas, despesas e impostos
                  <br />• Todas as metas financeiras
                  <br />• Todos os dashboards personalizados
                  <br />• Todas as configurações personalizadas
                  <br />• Histórico de conversas com IA
                  <br /><br />
                  <strong>Suas credenciais de conta e status de assinatura serão mantidos.</strong>
                  <br /><br />
                  Digite "APAGAR" para confirmar esta ação irreversível.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteAllData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirmar Exclusão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracoes;