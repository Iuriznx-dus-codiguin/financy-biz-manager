import React, { useState, useEffect } from 'react';
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
  AlertTriangle,
  Edit3,
  Save,
  X,
  Lock,
  Shield,
  Eye,
  EyeOff,
  Phone,
  Mail,
  LogOut
} from 'lucide-react';
import { useSettings, useCurrency } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { useDashboard } from '@/hooks/useDashboard';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { DashboardCreateDialog } from '@/components/DashboardCreateDialog';
import { DashboardPersonalization } from '@/components/DashboardPersonalization';
import { useOnboarding } from '@/hooks/useOnboarding';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { isDeveloperTier } from '@/utils/subscriptionHelpers';
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
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { subscriptionData, subscriptionTier, loading: subscriptionLoading } = useSubscription();
  const { subscription: userSubscription } = useUserSubscription();
  const isDeveloper = isDeveloperTier(userSubscription);
  const { formatCurrency } = useCurrency();
  const { dashboards, currentDashboard, createDashboard, deleteDashboard, updateDashboardName } = useDashboard();
  const { getLimits } = useFeatureAccess();
  const { toast } = useToast();
  const { onboardingData, refetchOnboardingData } = useOnboarding();
  const [isCreatingDashboard, setIsCreatingDashboard] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [isCreateDashboardOpen, setIsCreateDashboardOpen] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<string | null>(null);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [dashboardToDelete, setDashboardToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isEditingNome, setIsEditingNome] = useState(false);
  const [newNomePreferido, setNewNomePreferido] = useState(onboardingData?.nome_preferido || '');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  // Estados para edição de email e telefone
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingTelefone, setIsEditingTelefone] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newTelefone, setNewTelefone] = useState('');
  const [userProfile, setUserProfile] = useState<{email?: string; telefone?: string} | null>(null);

  const limits = getLimits();

  // Buscar dados do perfil do usuário
  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email, telefone')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      setUserProfile(data);
      setNewEmail(data?.email || user.email || '');
      setNewTelefone(data?.telefone || '');
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const formatSubscriptionEnd = (endDate: string | null) => {
    if (!endDate) return 'N/A';
    return new Date(endDate).toLocaleDateString('pt-BR');
  };

  const getSubscriptionStatus = () => {
    if (subscriptionLoading) return { status: 'Carregando...', variant: 'secondary' };

    if (!user) return { status: 'Não autenticado', variant: 'destructive' };

    // Plataforma sem teste grátis: usuário sem assinatura ativa = pagamento pendente
    if (!subscriptionData || !subscriptionData.subscribed) {
      return {
        status: 'Aguardando Pagamento',
        variant: 'destructive',
        endDate: 'N/A'
      };
    }

    if (subscriptionData.subscription_end) {
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
      }
      return {
        status: 'Assinatura Expirada',
        variant: 'destructive',
        endDate: formatSubscriptionEnd(subscriptionData.subscription_end)
      };
    }

    return { status: 'Sem Assinatura', variant: 'secondary' };
  };



  const handleDeleteAllData = async () => {
    if (!user) return;
    
    try {
      setIsDeletingData(true);
      
      // ============================================
      // APAGAR TODOS OS DADOS DO USUÁRIO
      // ============================================
      // MANTIDOS (não apagar):
      // - security_audit_logs (logs de auditoria)
      // - profiles (perfil básico do usuário)
      // - user_subscriptions (assinatura atual)
      // - subscribers (dados de assinatura)
      // - customer_subscriptions (dados Cakto)
      // - auth_rate_limits (segurança)
      // ============================================

      
      // Deletar na ordem correta para evitar problemas com RLS e foreign keys
      // 1. Primeiro: dados financeiros (ANTES de deletar dashboards ou membros)
      await Promise.all([
        supabase.from('receitas').delete().eq('user_id', user.id),
        supabase.from('despesas').delete().eq('user_id', user.id),
        supabase.from('impostos').delete().eq('user_id', user.id),
        supabase.from('metas').delete().eq('user_id', user.id),
      ]);
      
      // 2. Segundo: equipe e audit (depois de despesas, antes de dashboards)
      await Promise.all([
        supabase.from('equipe_membros').delete().eq('user_id', user.id),
        supabase.from('equipe_membros_audit').delete().eq('user_id', user.id),
      ]);
      
      // 3. Terceiro: dashboards e outros dados
      await Promise.all([
        supabase.from('user_dashboards').delete().eq('user_id', user.id),
        supabase.from('categorias_personalizadas').delete().eq('user_id', user.id),
        supabase.from('ai_recognized_transactions').delete().eq('user_id', user.id),
        supabase.from('ai_conversations').delete().eq('user_id', user.id),
        supabase.from('notificacoes').delete().eq('user_id', user.id),
        supabase.from('section_tutorials').delete().eq('user_id', user.id),
        supabase.from('user_tour_progress').delete().eq('user_id', user.id),
        supabase.from('onboarding_data').delete().eq('user_id', user.id),
        supabase.from('query_cache').delete().eq('user_id', user.id),
        supabase.from('validacao_n8n').delete().eq('user_id', user.id),
      ]);

      // Resetar configurações do perfil (mas manter o registro)
      await supabase
        .from('profiles')
        .update({ 
          settings: null,
          telefone: null,
          nome_completo: null 
        } as any)
        .eq('id', user.id);

      // Limpar localStorage
      localStorage.removeItem('financy-settings');
      localStorage.removeItem('financy-dashboards');
      localStorage.removeItem('financy-categories');
      
      toast({
        title: "Dados apagados com sucesso",
        description: "Todos os seus dados foram permanentemente apagados. Sua assinatura foi preservada.",
      });


      // Recarregar página
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.replace(window.location.pathname);
        }, 1500);
      }
      
    } catch (error) {
      console.error('Erro ao apagar dados:', error);
      toast({
        title: "Erro ao apagar dados",
        description: "Não foi possível apagar todos os dados. Tente novamente ou contate o suporte.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingData(false);
    }
  };

  const handleEditDashboard = (dashboard: any) => {
    setEditingDashboard(dashboard.id);
    setNewDashboardName(dashboard.name);
  };

  const handleSaveDashboardName = async (dashboardId: string) => {
    if (!newDashboardName.trim()) {
      toast({
        title: "Erro",
        description: "Nome do dashboard não pode estar vazio.",
        variant: "destructive"
      });
      return;
    }

    try {
      await updateDashboardName(dashboardId, newDashboardName.trim());
      setEditingDashboard(null);
      toast({
        title: "Sucesso",
        description: "Nome do dashboard atualizado com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar nome do dashboard.",
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingDashboard(null);
    setNewDashboardName('');
  };

  const handleDeleteDashboard = (dashboardId: string, dashboardName: string) => {
    setDashboardToDelete({ id: dashboardId, name: dashboardName });
  };

  const confirmDeleteDashboard = async () => {
    if (!dashboardToDelete) return;
    try {
      await deleteDashboard(dashboardToDelete.id);
      toast({
        title: "Dashboard excluído",
        description: "Dashboard e todos os dados relacionados foram excluídos permanentemente."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir dashboard. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setDashboardToDelete(null);
    }
  };

  const handleUpdateNomePreferido = async () => {
    if (!user || !newNomePreferido.trim()) return;

    try {
      const { error } = await supabase
        .from('onboarding_data')
        .upsert({
          user_id: user.id,
          nome_preferido: newNomePreferido.trim(),
          user_type: onboardingData?.user_type || 'pessoal',
          how_did_you_know: onboardingData?.how_did_you_know || 'outro',
          termos_aceitos: onboardingData?.termos_aceitos || true,
          salary_range: onboardingData?.salary_range,
          revenue_range: onboardingData?.revenue_range
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      // Recarregar dados de onboarding sem recarregar a página inteira
      await refetchOnboardingData();
      
      setIsEditingNome(false);
      toast({
        title: "✅ Nome atualizado",
        description: "Seu nome preferido foi atualizado com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao atualizar nome:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar seu nome. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos, incluindo a senha atual.",
        variant: "destructive"
      });
      return;
    }

    if (passwords.new !== passwords.confirm) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive"
      });
      return;
    }

    if (passwords.new.length < 8) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 8 caracteres.",
        variant: "destructive"
      });
      return;
    }

    if (!/\d/.test(passwords.new)) {
      toast({
        title: "Erro",
        description: "A nova senha deve conter pelo menos um número.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Verificar senha atual via reautenticação
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email ?? '',
        password: passwords.current
      });

      if (signInError) {
        toast({
          title: "Senha atual incorreta",
          description: "A senha atual informada não confere. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      // Atualizar para nova senha
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });

      if (error) throw error;

      setIsChangingPassword(false);
      setPasswords({ current: '', new: '', confirm: '' });
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar a senha. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleUpdateEmail = async () => {
    if (!user || !newEmail.trim()) {
      toast({
        title: "Erro",
        description: "Email não pode estar vazio.",
        variant: "destructive"
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: "Erro",
        description: "Por favor, insira um email válido.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Atualizar no Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        email: newEmail.trim()
      });

      if (authError) throw authError;

      // Atualizar na tabela profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ email: newEmail.trim() })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setIsEditingEmail(false);
      await loadUserProfile();
      toast({
        title: "Email atualizado",
        description: "Seu email foi atualizado com sucesso. Verifique sua caixa de entrada para confirmar o novo email."
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o email. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateTelefone = async () => {
    if (!user) return;

    try {
      // Atualizar na tabela profiles
      const { error } = await supabase
        .from('profiles')
        .update({ telefone: newTelefone.trim() || null })
        .eq('id', user.id);

      if (error) throw error;

      setIsEditingTelefone(false);
      await loadUserProfile();
      toast({
        title: "Telefone atualizado",
        description: "Seu telefone foi atualizado com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o telefone. Tente novamente.",
        variant: "destructive"
      });
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
        <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight">Configurações</h1>
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
              onValueChange={(value: 'light' | 'dark' | 'system') => {
                updateSettings({ tema: value });
              }}
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

      {/* Nome Preferido */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Nome Preferido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome que aparece nos dashboards</Label>
            {isEditingNome ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newNomePreferido}
                  onChange={(e) => setNewNomePreferido(e.target.value)}
                  placeholder="Digite seu nome preferido"
                  className="flex-1"
                />
                <Button size="sm" onClick={handleUpdateNomePreferido}>
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setIsEditingNome(false);
                  setNewNomePreferido(onboardingData?.nome_preferido || '');
                }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <span className="font-medium">{onboardingData?.nome_preferido || 'Não definido'}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingNome(true)}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Este nome aparece nas saudações dos dashboards ("Olá, {onboardingData?.nome_preferido}!")
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Alterar Senha</Label>
            {isChangingPassword ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Senha Atual</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showPasswords.current ? "text" : "password"}
                      value={passwords.current}
                      onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                      placeholder="Digite sua senha atual"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility('current')}
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPasswords.new ? "text" : "password"}
                      value={passwords.new}
                      onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                      placeholder="Digite sua nova senha"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility('new')}
                    >
                      {showPasswords.new ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwords.confirm}
                      onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                      placeholder="Confirme sua nova senha"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility('confirm')}
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={handleChangePassword}>
                    <Lock className="h-4 w-4 mr-2" />
                    Confirmar Alteração
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswords({ current: '', new: '', confirm: '' });
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">••••••••</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsChangingPassword(true)}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Alterar Senha
                </Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Altere sua senha para manter sua conta segura
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Principal */}
      <DashboardPersonalization />

      {/* Dashboards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            Perfis/Empresas
            <Badge variant="outline">
              {dashboards.length}/{limits.maxProfiles === -1 ? '∞' : limits.maxProfiles}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Perfis/Empresas Criados</Label>
            {dashboards.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum perfil/empresa criado ainda.</p>
            ) : (
              <div className="space-y-2">
                {dashboards.map((dashboard) => (
                  <div key={dashboard.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2 flex-1">
                      {editingDashboard === dashboard.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={newDashboardName}
                            onChange={(e) => setNewDashboardName(e.target.value)}
                            className="flex-1"
                            placeholder="Nome do dashboard"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveDashboardName(dashboard.id)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium">{dashboard.name}</span>
                          {dashboard.isDefault && <Badge variant="default">Principal</Badge>}
                          {currentDashboard?.id === dashboard.id && <Badge variant="outline">Atual</Badge>}
                        </>
                      )}
                    </div>
                    
                    {editingDashboard !== dashboard.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditDashboard(dashboard)}
                          title="Editar nome"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        {!dashboard.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDashboard(dashboard.id, dashboard.name)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Excluir dashboard"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Criar Novo Dashboard</Label>
            <Button 
              onClick={() => setIsCreateDashboardOpen(true)}
              disabled={isCreatingDashboard}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Dashboard Completo
            </Button>
          </div>
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

            <Separator />

            {/* Email */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              {isEditingEmail ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Digite seu novo email"
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleUpdateEmail}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setIsEditingEmail(false);
                    setNewEmail(userProfile?.email || user?.email || '');
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <span className="text-sm">{userProfile?.email || user?.email || 'Não informado'}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingEmail(true)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              {isEditingTelefone ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="tel"
                    value={newTelefone}
                    onChange={(e) => setNewTelefone(e.target.value)}
                    placeholder="Digite seu telefone (ex: +55 11 99999-9999)"
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleUpdateTelefone}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setIsEditingTelefone(false);
                    setNewTelefone(userProfile?.telefone || '');
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <span className="text-sm">{userProfile?.telefone || 'Não informado'}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingTelefone(true)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <span className="font-medium">Limites do Plano:</span>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Perfis/Empresas: {limits.maxProfiles === -1 ? 'Ilimitado' : limits.maxProfiles}</div>
                <div>Receitas: {limits.maxReceitas === -1 ? 'Ilimitado' : limits.maxReceitas}</div>
                <div>Despesas: {limits.maxDespesas === -1 ? 'Ilimitado' : limits.maxDespesas}</div>
                <div>Metas: {limits.maxMetas === -1 ? 'Ilimitado' : limits.maxMetas}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessão - Desconectar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Sessão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sair da sua conta e voltar para a tela de login.
            </p>
            <Button 
              variant="destructive" 
              onClick={signOut}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Desconectar
            </Button>
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
                  Esta ação irá apagar <strong>PERMANENTEMENTE</strong> todos os seus dados:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>Receitas, despesas, impostos e metas</li>
                  <li>Todos os dashboards (pessoais e empresariais)</li>
                  <li>Categorias personalizadas e membros da equipe</li>
                  <li>Histórico de conversas com IA</li>
                  <li>Configurações e preferências</li>
                  <li>Notificações e tutoriais</li>
                </ul>
                <div className="bg-success/10 dark:bg-green-950/20 border border-success/30 rounded p-2 mt-2">
                  <p className="text-xs text-success font-medium">
                    ✅ Serão mantidos: assinatura ativa e histórico de teste gratuito (para prevenção de fraude)
                  </p>
                </div>
                <p className="text-xs text-destructive font-bold mt-2">
                  ⚠️ Esta ação NÃO pode ser desfeita!
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
            <AlertDialogContent className="max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Você tem certeza absoluta?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p className="font-semibold text-foreground">
                    Esta ação irá apagar PERMANENTEMENTE:
                  </p>
                  <ul className="text-sm space-y-1 ml-4 list-disc">
                    <li>Todas as receitas, despesas e impostos</li>
                    <li>Todas as metas financeiras</li>
                    <li>Todos os dashboards (incluindo personalizados)</li>
                    <li>Todas as categorias personalizadas</li>
                    <li>Todos os membros da equipe e auditoria</li>
                    <li>Todo o histórico de conversas com IA</li>
                    <li>Todas as notificações e progresso de tutoriais</li>
                    <li>Todas as configurações personalizadas</li>
                  </ul>
                  
                  <div className="bg-success/10 dark:bg-green-950/20 border-2 border-green-500 rounded-lg p-3 mt-3">
                    <p className="text-sm text-green-900 dark:text-green-100 font-semibold">
                      ✅ O QUE SERÁ MANTIDO:
                    </p>
                    <ul className="text-xs text-success space-y-1 mt-2 ml-4 list-disc">
                      <li>Suas credenciais de login (email/senha)</li>
                      <li>Status da sua assinatura atual</li>
                      <li><strong>Histórico de teste gratuito</strong> (prevenção de fraude)</li>
                      <li>Logs de segurança e auditoria</li>
                    </ul>
                  </div>

                  <div className="bg-destructive/10 border border-destructive rounded-lg p-3 mt-3">
                    <p className="text-sm text-destructive font-bold">
                      ⚠️ ESTA AÇÃO NÃO PODE SER DESFEITA!
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Todos os dados apagados serão perdidos permanentemente.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteAllData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sim, Apagar Tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Dashboard Create Dialog */}
      <DashboardCreateDialog
        open={isCreateDashboardOpen}
        onOpenChange={setIsCreateDashboardOpen}
      />

      {/* Confirmação de exclusão de dashboard */}
      <AlertDialog open={!!dashboardToDelete} onOpenChange={(open) => !open && setDashboardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir dashboard "{dashboardToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os dados salvos (receitas, despesas, metas, impostos) neste dashboard serão apagados permanentemente.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteDashboard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isDeveloper && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />
              Ferramentas de desenvolvedor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Acompanhe eventos processados pelo webhook da Cakto, erros e reenvios com filtros por assinatura, categoria e status.
            </p>
            <Button asChild variant="default" size="sm">
              <Link to="/auditoria/webhooks-cakto">Abrir auditoria de webhooks</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Configuracoes;
