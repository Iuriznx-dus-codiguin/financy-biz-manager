import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Upload, 
  RefreshCw, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Database,
  AlertCircle,
  Check,
  Trash2
} from 'lucide-react';
import { useSettings, useCurrency } from '@/hooks/useSettings';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { useDashboard } from '@/hooks/useDashboard';

const Configuracoes = () => {
  const { settings, updateSettings, resetSettings, exportSettings, importSettings, loading } = useSettings();
  const { user } = useAuth();
  const { subscriptionTier } = useSubscription();
  const { formatCurrency } = useCurrency();
  const { dashboards, currentDashboard, setCurrentDashboard } = useDashboard();
  const { toast } = useToast();
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleExportSettings = () => {
    const dataStr = exportSettings();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `financy-configuracoes-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportSettings = async () => {
    if (!importFile) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        await importSettings(content);
        setImportFile(null);
      } catch (error) {
        console.error('Erro ao importar configurações:', error);
      }
    };
    reader.readAsText(importFile);
  };

  const handleLogout = async () => {
    // Implementar logout quando necessário
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Configurações</h2>
        <p className="text-muted-foreground">Personalize sua experiência no Financy</p>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="perfil" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="privacidade" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Privacidade
          </TabsTrigger>
          <TabsTrigger value="dados" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Dados
          </TabsTrigger>
        </TabsList>

        {/* Configurações Gerais */}
        <TabsContent value="geral" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Aparência e Interface
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <Select 
                    value={settings.tema} 
                    onValueChange={(value: 'light' | 'dark' | 'system') => 
                      updateSettings({ tema: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">🔄 Automático</SelectItem>
                      <SelectItem value="light">🌞 Claro</SelectItem>
                      <SelectItem value="dark">🌙 Escuro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Moeda</Label>
                  <Select 
                    value={settings.moeda} 
                    onValueChange={(value: 'BRL' | 'USD' | 'EUR') => 
                      updateSettings({ moeda: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">🇧🇷 Real (R$)</SelectItem>
                      <SelectItem value="USD">🇺🇸 Dólar ($)</SelectItem>
                      <SelectItem value="EUR">🇪🇺 Euro (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Formato de Data</Label>
                  <Select 
                    value={settings.formatoData} 
                    onValueChange={(value: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD') => 
                      updateSettings({ formatoData: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/AAAA</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/AAAA</SelectItem>
                      <SelectItem value="YYYY-MM-DD">AAAA-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl">
                <div className="space-y-1">
                  <p className="font-medium">Animações</p>
                  <p className="text-sm text-muted-foreground">Ativar animações na interface</p>
                </div>
                <Switch
                  checked={settings.exibirAnimacoes}
                  onCheckedChange={(checked) => updateSettings({ exibirAnimacoes: checked })}
                />
              </div>

              {dashboards.length > 0 && (
                <div className="space-y-2">
                  <Label>Dashboard Padrão</Label>
                  <Select 
                    value={settings.dashboardPadrao || ''} 
                    onValueChange={(value) => updateSettings({ dashboardPadrao: value })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecionar dashboard padrão" />
                    </SelectTrigger>
                    <SelectContent>
                      {dashboards.map(dashboard => (
                        <SelectItem key={dashboard.id} value={dashboard.id}>
                          {dashboard.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Perfil */}
        <TabsContent value="perfil" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Status da Assinatura</h3>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={subscriptionTier === 'free' ? 'secondary' : 'default'}>
                      {subscriptionTier === 'free' ? 'Gratuito' : 'Premium'}
                    </Badge>
                  </div>
                </div>
              </div>

              {subscriptionTier === 'free' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-xl">
                    <h4 className="font-semibold mb-2 text-green-600">Recursos Disponíveis</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>• ✓ Dashboard básico</p>
                      <p>• ✓ Cadastro de receitas/despesas</p>
                      <p>• ✓ Controle básico de impostos</p>
                      <p>• ✓ Metas financeiras</p>
                    </div>
                  </div>

                  <div className="p-4 border rounded-xl">
                    <h4 className="font-semibold mb-2 text-orange-600">Premium Plus+</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>• 📊 Relatórios avançados</p>
                      <p>• 🤖 IA Financeira</p>
                      <p>• 📈 Analytics detalhado</p>
                      <p>• 🔄 Sincronização em nuvem</p>
                      <p>• 💬 Suporte prioritário</p>
                    </div>
                  </div>
                </div>
              )}

              {subscriptionTier === 'free' && (
                <div className="text-center pt-4">
                  <Button className="rounded-xl">
                    Fazer Upgrade para Premium
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notificacoes" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Preferências de Notificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <div className="space-y-1">
                    <p className="font-medium">Notificações por Email</p>
                    <p className="text-sm text-muted-foreground">Receber relatórios e alertas por email</p>
                  </div>
                  <Switch
                    checked={settings.notificacoes.email}
                    onCheckedChange={(checked) => 
                      updateSettings({ 
                        notificacoes: { ...settings.notificacoes, email: checked } 
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <div className="space-y-1">
                    <p className="font-medium">Notificações Push</p>
                    <p className="text-sm text-muted-foreground">Alertas no navegador sobre vencimentos</p>
                  </div>
                  <Switch
                    checked={settings.notificacoes.push}
                    onCheckedChange={(checked) => 
                      updateSettings({ 
                        notificacoes: { ...settings.notificacoes, push: checked } 
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <div className="space-y-1">
                    <p className="font-medium">Relatórios Automáticos</p>
                    <p className="text-sm text-muted-foreground">Receber relatórios mensais automáticos</p>
                  </div>
                  <Switch
                    checked={settings.notificacoes.relatorios}
                    onCheckedChange={(checked) => 
                      updateSettings({ 
                        notificacoes: { ...settings.notificacoes, relatorios: checked } 
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <div className="space-y-1">
                    <p className="font-medium">Marketing</p>
                    <p className="text-sm text-muted-foreground">Novidades e promoções do Financy</p>
                  </div>
                  <Switch
                    checked={settings.notificacoes.marketing}
                    onCheckedChange={(checked) => 
                      updateSettings({ 
                        notificacoes: { ...settings.notificacoes, marketing: checked } 
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacidade */}
        <TabsContent value="privacidade" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacidade e Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <div className="space-y-1">
                    <p className="font-medium">Perfil Público</p>
                    <p className="text-sm text-muted-foreground">Permitir que outros usuários vejam seu perfil</p>
                  </div>
                  <Switch
                    checked={settings.perfilPublico}
                    onCheckedChange={(checked) => updateSettings({ perfilPublico: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <div className="space-y-1">
                    <p className="font-medium">Compartilhar Dados</p>
                    <p className="text-sm text-muted-foreground">Ajudar a melhorar o Financy compartilhando dados anônimos</p>
                  </div>
                  <Switch
                    checked={settings.compartilharDados}
                    onCheckedChange={(checked) => updateSettings({ compartilharDados: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <div className="space-y-1">
                    <p className="font-medium">Backup Automático</p>
                    <p className="text-sm text-muted-foreground">Criar backups automáticos dos seus dados</p>
                  </div>
                  <Switch
                    checked={settings.backupAutomatico}
                    onCheckedChange={(checked) => updateSettings({ backupAutomatico: checked })}
                  />
                </div>

                {settings.backupAutomatico && (
                  <div className="space-y-2 pl-4">
                    <Label>Frequência do Backup</Label>
                    <Select 
                      value={settings.frequenciaBackup} 
                      onValueChange={(value: 'diario' | 'semanal' | 'mensal') => 
                        updateSettings({ frequenciaBackup: value })
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diario">Diário</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dados */}
        <TabsContent value="dados" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Gestão de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="rounded-xl h-auto p-4"
                  onClick={handleExportSettings}
                >
                  <div className="text-center w-full">
                    <Download className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <h3 className="font-semibold">Exportar Configurações</h3>
                    <p className="text-sm text-muted-foreground">Download arquivo JSON</p>
                  </div>
                </Button>

                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="rounded-xl h-auto p-4 w-full"
                    onClick={() => document.getElementById('import-file')?.click()}
                  >
                    <div className="text-center w-full">
                      <Upload className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <h3 className="font-semibold">Importar Configurações</h3>
                      <p className="text-sm text-muted-foreground">Restaurar de arquivo JSON</p>
                    </div>
                  </Button>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                  {importFile && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <span className="text-sm">{importFile.name}</span>
                      <Button size="sm" onClick={handleImportSettings}>
                        Importar
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="w-5 h-5" />
                  <h3 className="font-semibold">Zona de Perigo</h3>
                </div>
                
                <Button 
                  variant="outline" 
                  className="rounded-xl text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={resetSettings}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resetar Todas as Configurações
                </Button>
                
                <p className="text-sm text-muted-foreground">
                  Esta ação irá restaurar todas as configurações para os valores padrão.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sobre o Sistema */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Sobre o Financy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto overflow-hidden">
              <img 
                src="/lovable-uploads/2e0fe1e4-b99b-4e35-beb7-82837c2dfd13.png" 
                alt="Financy" 
                className="w-full h-full object-contain filter brightness-0 invert"
              />
            </div>
            <div>
              <h3 className="text-xl font-bold">Financy</h3>
              <p className="text-muted-foreground">Sistema de Gestão Financeira</p>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Versão 2.1.0</p>
              <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
              <p>Desenvolvido com ❤️ para pequenas e médias empresas</p>
              <p>© 2025 Financy. Todos os direitos reservados.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default Configuracoes;
