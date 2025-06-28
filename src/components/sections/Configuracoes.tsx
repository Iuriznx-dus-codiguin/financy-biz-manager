
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';

const Configuracoes = () => {
  const { configuracoes, updateConfiguracoes } = useAppContext();

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Configurações</h2>
        <p className="text-muted-foreground">Personalize sua experiência no Financy</p>
      </div>

      {/* Preferências Visuais */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Preferências Visuais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="tema">Tema</Label>
              <Select 
                value={configuracoes.tema} 
                onValueChange={(value: 'light' | 'dark') => updateConfiguracoes({ tema: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">🌞 Claro</SelectItem>
                  <SelectItem value="dark">🌙 Escuro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="moeda">Moeda</Label>
              <Select 
                value={configuracoes.moeda} 
                onValueChange={(value: 'BRL' | 'USD' | 'EUR') => updateConfiguracoes({ moeda: value })}
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
              <Label htmlFor="idioma">Idioma</Label>
              <Select 
                value={configuracoes.idioma} 
                onValueChange={(value: 'pt-BR' | 'en-US' | 'es-ES') => updateConfiguracoes({ idioma: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">🇧🇷 Português</SelectItem>
                  <SelectItem value="en-US">🇺🇸 English</SelectItem>
                  <SelectItem value="es-ES">🇪🇸 Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button className="rounded-xl">
              Salvar Preferências
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informações da Conta */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Informações da Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Status da Conta</h3>
                <p className="text-sm text-muted-foreground">Conta premium ativa</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">✓ Ativo</p>
                <p className="text-sm text-muted-foreground">Válido até: 15/02/2025</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-border rounded-xl">
              <h4 className="font-semibold mb-2">Dados Salvos</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• Configurações: Salvos localmente</p>
                <p>• Transações: Armazenadas no navegador</p>
                <p>• Backup: Disponível na assinatura premium</p>
              </div>
            </div>

            <div className="p-4 border border-border rounded-xl">
              <h4 className="font-semibold mb-2">Recursos Disponíveis</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• ✓ Dashboard completo</p>
                <p>• ✓ Relatórios avançados</p>
                <p>• ✓ Inteligência financeira</p>
                <p>• ✓ Suporte prioritário</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações da Conta */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Ações da Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="rounded-xl h-auto p-4">
              <div className="text-center">
                <div className="text-2xl mb-2">📥</div>
                <h3 className="font-semibold">Exportar Dados</h3>
                <p className="text-sm text-muted-foreground">Baixar backup dos seus dados</p>
              </div>
            </Button>

            <Button variant="outline" className="rounded-xl h-auto p-4">
              <div className="text-center">
                <div className="text-2xl mb-2">📤</div>
                <h3 className="font-semibold">Importar Dados</h3>
                <p className="text-sm text-muted-foreground">Restaurar dados de backup</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sobre o Sistema */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Sobre o Financy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto">
              <span className="text-primary-foreground font-bold text-2xl">F</span>
            </div>
            <div>
              <h3 className="text-xl font-bold">Financy</h3>
              <p className="text-muted-foreground">Sistema de Gestão Financeira</p>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Versão 2.0.1</p>
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
