
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const Configuracoes = () => {
  const [notifications, setNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  const sessionsAtivas = [
    { dispositivo: 'MacBook Pro - Chrome', localizacao: 'São Paulo, BR', ultimo: '2 minutos atrás', ativo: true },
    { dispositivo: 'iPhone 14 - Safari', localizacao: 'São Paulo, BR', ultimo: '1 hora atrás', ativo: false },
    { dispositivo: 'Windows 11 - Edge', localizacao: 'Rio de Janeiro, BR', ultimo: '2 dias atrás', ativo: false }
  ];

  const integracoes = [
    { 
      nome: 'Google Sheets', 
      descricao: 'Exportar relatórios automaticamente', 
      status: 'Conectado',
      icon: '📊'
    },
    { 
      nome: 'Stripe', 
      descricao: 'Receber pagamentos online', 
      status: 'Desconectado',
      icon: '💳'
    },
    { 
      nome: 'Notion', 
      descricao: 'Sincronizar dados financeiros', 
      status: 'Desconectado',
      icon: '📝'
    },
    { 
      nome: 'API Contador', 
      descricao: 'Integração com seu contador', 
      status: 'Pendente',
      icon: '🧮'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Conectado':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">Conectado</Badge>;
      case 'Desconectado':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200">Desconectado</Badge>;
      case 'Pendente':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">Pendente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <section id="configuracoes" className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Configurações</h2>
        <p className="text-muted-foreground">Gerencie sua conta e preferências do sistema</p>
      </div>

      {/* Informações da Empresa */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>🏢 Informações da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="empresa-nome">Nome da Empresa</Label>
              <Input 
                id="empresa-nome" 
                defaultValue="Minha Empresa Ltda." 
                className="rounded-xl" 
              />
            </div>
            <div>
              <Label htmlFor="empresa-cnpj">CNPJ</Label>
              <Input 
                id="empresa-cnpj" 
                defaultValue="12.345.678/0001-90" 
                className="rounded-xl" 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="empresa-email">Email</Label>
              <Input 
                id="empresa-email" 
                type="email" 
                defaultValue="contato@minhaempresa.com" 
                className="rounded-xl" 
              />
            </div>
            <div>
              <Label htmlFor="empresa-telefone">Telefone</Label>
              <Input 
                id="empresa-telefone" 
                defaultValue="(11) 99999-9999" 
                className="rounded-xl" 
              />
            </div>
          </div>
          <div>
            <Label htmlFor="empresa-logo">Logo da Empresa</Label>
            <div className="flex items-center space-x-4 mt-2">
              <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-2xl">F</span>
              </div>
              <Button variant="outline" className="rounded-xl">
                Alterar Logo
              </Button>
            </div>
          </div>
          <Button className="rounded-xl">
            Salvar Informações
          </Button>
        </CardContent>
      </Card>

      {/* Preferências do Sistema */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>🎨 Preferências Visuais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="tema">Tema da Interface</Label>
              <Select>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione o tema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">🌞 Modo Claro</SelectItem>
                  <SelectItem value="dark">🌙 Modo Escuro</SelectItem>
                  <SelectItem value="auto">🔄 Automático</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="moeda">Moeda Principal</Label>
              <Select>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione a moeda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brl">🇧🇷 Real (R$)</SelectItem>
                  <SelectItem value="usd">🇺🇸 Dólar (US$)</SelectItem>
                  <SelectItem value="eur">🇪🇺 Euro (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="idioma">Idioma</Label>
              <Select>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione o idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-br">🇧🇷 Português (Brasil)</SelectItem>
                  <SelectItem value="en-us">🇺🇸 English (US)</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>🔔 Notificações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notif-email">Notificações por Email</Label>
                <p className="text-sm text-muted-foreground">Receba alertas importantes</p>
              </div>
              <Switch 
                id="notif-email" 
                checked={notifications} 
                onCheckedChange={setNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notif-vencimento">Alertas de Vencimento</Label>
                <p className="text-sm text-muted-foreground">Impostos e contas a pagar</p>
              </div>
              <Switch id="notif-vencimento" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notif-relatorio">Relatórios Automáticos</Label>
                <p className="text-sm text-muted-foreground">Resumo semanal por email</p>
              </div>
              <Switch id="notif-relatorio" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plano e Assinatura */}
      <Card className="rounded-2xl shadow-sm border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">💎 Plano Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl">
              <h3 className="font-bold text-2xl text-primary mb-2">Plano Premium</h3>
              <p className="text-3xl font-bold mb-2">R$ 89<span className="text-sm font-normal">/mês</span></p>
              <p className="text-sm text-muted-foreground mb-4">Renovação automática em 23 dias</p>
              <div className="space-y-2 text-sm">
                <p>✅ Relatórios ilimitados</p>
                <p>✅ Integrações avançadas</p>
                <p>✅ Suporte prioritário</p>
                <p>✅ API personalizada</p>
              </div>
            </div>
            <div className="space-y-4">
              <Button className="w-full rounded-xl">
                Alterar Plano
              </Button>
              <Button variant="outline" className="w-full rounded-xl">
                Ver Histórico de Pagamentos
              </Button>
              <Button variant="destructive" className="w-full rounded-xl">
                Cancelar Assinatura
              </Button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <h4 className="font-semibold text-green-800 dark:text-green-200">Economia Anual</h4>
                <p className="text-sm text-muted-foreground">Você economiza R$ 178 pagando anualmente</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">Próximo Pagamento</h4>
                <p className="text-sm text-muted-foreground">15 de Fevereiro, 2025</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Segurança */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>🔐 Segurança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-4">Alterar Senha</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input type="password" placeholder="Senha atual" className="rounded-xl" />
              <Input type="password" placeholder="Nova senha" className="rounded-xl" />
              <Input type="password" placeholder="Confirmar senha" className="rounded-xl" />
            </div>
            <Button className="mt-4 rounded-xl">Alterar Senha</Button>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="two-factor">Verificação em 2 Fatores</Label>
              <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança</p>
            </div>
            <Switch 
              id="two-factor" 
              checked={twoFactor} 
              onCheckedChange={setTwoFactor}
            />
          </div>
          
          <Separator />
          
          <div>
            <h4 className="font-semibold mb-4">Sessões Ativas</h4>
            <div className="space-y-3">
              {sessionsAtivas.map((sessao, index) => (
                <div key={index} className="flex justify-between items-center p-4 border border-border rounded-xl">
                  <div>
                    <p className="font-medium">{sessao.dispositivo}</p>
                    <p className="text-sm text-muted-foreground">{sessao.localizacao} • {sessao.ultimo}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {sessao.ativo ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">Ativo</Badge>
                    ) : (
                      <Button variant="outline" size="sm" className="rounded-lg">
                        Revogar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integrações */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>🔗 Integrações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {integracoes.map((integracao, index) => (
              <div key={index} className="p-4 border border-border rounded-xl hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{integracao.icon}</span>
                    <div>
                      <h4 className="font-semibold">{integracao.nome}</h4>
                      <p className="text-sm text-muted-foreground">{integracao.descricao}</p>
                    </div>
                  </div>
                  {getStatusBadge(integracao.status)}
                </div>
                <Button 
                  variant={integracao.status === 'Conectado' ? "destructive" : "default"}
                  size="sm" 
                  className="rounded-lg w-full"
                >
                  {integracao.status === 'Conectado' ? 'Desconectar' : 'Conectar agora'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default Configuracoes;
