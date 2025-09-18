import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, Shield, Database, Bell, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const ConfiguracoesAvancadas: React.FC = () => {
  const [settings, setSettings] = useState({
    notificacoes: {
      email: true,
      push: false,
      vencimentos: true,
      gastos_altos: true,
      metas: true
    },
    privacidade: {
      backup_automatico: true,
      compartilhar_dados: false,
      historico_local: true
    },
    interface: {
      tema: 'system',
      idioma: 'pt-BR',
      moeda: 'BRL',
      formato_data: 'DD/MM/YYYY'
    },
    financeiro: {
      limite_gastos_diario: 500,
      alerta_orcamento: 80,
      categorias_personalizadas: true
    }
  });

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleBackupData = async () => {
    if (!user) return;
    
    setIsBackingUp(true);
    try {
      // Buscar todos os dados do usuário
      const [receitas, despesas, metas, impostos] = await Promise.all([
        supabase.from('receitas').select('*').eq('user_id', user.id),
        supabase.from('despesas').select('*').eq('user_id', user.id),
        supabase.from('metas').select('*').eq('user_id', user.id),
        supabase.from('impostos').select('*').eq('user_id', user.id)
      ]);

      const backupData = {
        export_date: new Date().toISOString(),
        user_id: user.id,
        receitas: receitas.data || [],
        despesas: despesas.data || [],
        metas: metas.data || [],
        impostos: impostos.data || [],
        configuracoes: settings
      };

      // Criar arquivo de backup
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financy-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup Criado",
        description: "Seus dados foram exportados com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      toast({
        title: "Erro no Backup",
        description: "Não foi possível criar o backup dos dados.",
        variant: "destructive"
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configurações Avançadas</h2>
        <p className="text-muted-foreground">Personalize sua experiência no Financy</p>
      </div>

      {/* Notificações */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Notificações por Email</Label>
              <p className="text-sm text-muted-foreground">Receba alertas por email</p>
            </div>
            <Switch
              checked={settings.notificacoes.email}
              onCheckedChange={(value) => updateSetting('notificacoes', 'email', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Alertas de Vencimento</Label>
              <p className="text-sm text-muted-foreground">Impostos e contas próximas do vencimento</p>
            </div>
            <Switch
              checked={settings.notificacoes.vencimentos}
              onCheckedChange={(value) => updateSetting('notificacoes', 'vencimentos', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Gastos Acima da Média</Label>
              <p className="text-sm text-muted-foreground">Alertas quando os gastos ultrapassarem a média</p>
            </div>
            <Switch
              checked={settings.notificacoes.gastos_altos}
              onCheckedChange={(value) => updateSetting('notificacoes', 'gastos_altos', value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Interface */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Interface
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tema">Tema</Label>
              <Select value={settings.interface.tema} onValueChange={(value) => updateSetting('interface', 'tema', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="moeda">Moeda</Label>
              <Select value={settings.interface.moeda} onValueChange={(value) => updateSetting('interface', 'moeda', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real (R$)</SelectItem>
                  <SelectItem value="USD">Dólar ($)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações Financeiras */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Configurações Financeiras</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="limite-diario">Limite de Gastos Diário (R$)</Label>
            <Input
              id="limite-diario"
              type="number"
              value={settings.financeiro.limite_gastos_diario}
              onChange={(e) => updateSetting('financeiro', 'limite_gastos_diario', Number(e.target.value))}
              className="max-w-xs"
            />
          </div>

          <div>
            <Label htmlFor="alerta-orcamento">Alerta de Orçamento (%)</Label>
            <Input
              id="alerta-orcamento"
              type="number"
              min="0"
              max="100"
              value={settings.financeiro.alerta_orcamento}
              onChange={(e) => updateSetting('financeiro', 'alerta_orcamento', Number(e.target.value))}
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Receba alertas quando atingir este percentual do orçamento
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Backup e Segurança */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Backup e Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Backup Automático</Label>
              <p className="text-sm text-muted-foreground">Salvar dados automaticamente na nuvem</p>
            </div>
            <Switch
              checked={settings.privacidade.backup_automatico}
              onCheckedChange={(value) => updateSetting('privacidade', 'backup_automatico', value)}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleBackupData}
              disabled={isBackingUp}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isBackingUp ? 'Criando Backup...' : 'Baixar Backup'}
            </Button>

            <Button
              variant="outline"
              disabled={isRestoring}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Restaurar Backup
            </Button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900 dark:text-blue-100">Informações de Segurança</span>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Seus dados são criptografados e armazenados de forma segura. 
              Recomendamos fazer backups regulares para maior segurança.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Status do Sistema */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Status do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Badge variant="secondary" className="mb-2">Online</Badge>
              <p className="text-sm text-muted-foreground">Conexão</p>
            </div>
            <div className="text-center">
              <Badge variant="secondary" className="mb-2">Ativo</Badge>
              <p className="text-sm text-muted-foreground">Sincronização</p>
            </div>
            <div className="text-center">
              <Badge variant="secondary" className="mb-2">Seguro</Badge>
              <p className="text-sm text-muted-foreground">Criptografia</p>
            </div>
            <div className="text-center">
              <Badge variant="secondary" className="mb-2">v2.1.0</Badge>
              <p className="text-sm text-muted-foreground">Versão</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};