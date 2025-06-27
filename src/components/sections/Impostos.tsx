
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';

const Impostos = () => {
  const impostos = [
    { 
      tipo: 'DAS - Simples Nacional', 
      valor: 'R$ 850,00', 
      vencimento: '2025-01-20', 
      pago: false,
      descricao: 'Documento de Arrecadação do Simples Nacional - Pagamento mensal unificado'
    },
    { 
      tipo: 'ISS - Imposto sobre Serviços', 
      valor: 'R$ 420,00', 
      vencimento: '2025-01-15', 
      pago: true,
      descricao: 'Tributo municipal sobre prestação de serviços'
    },
    { 
      tipo: 'ICMS - Imposto s/ Circulação', 
      valor: 'R$ 1.200,00', 
      vencimento: '2025-01-18', 
      pago: false,
      descricao: 'Imposto estadual sobre circulação de mercadorias'
    },
    { 
      tipo: 'IRPJ - Imposto de Renda PJ', 
      valor: 'R$ 2.300,00', 
      vencimento: '2025-01-31', 
      pago: false,
      descricao: 'Imposto federal sobre lucro da pessoa jurídica'
    },
    { 
      tipo: 'INSS - Previdência Social', 
      valor: 'R$ 980,00', 
      vencimento: '2025-01-20', 
      pago: true,
      descricao: 'Contribuição previdenciária sobre folha de pagamento'
    }
  ];

  const proximosVencimentos = [
    { data: '15/01', imposto: 'ISS', valor: 'R$ 420,00' },
    { data: '18/01', imposto: 'ICMS', valor: 'R$ 1.200,00' },
    { data: '20/01', imposto: 'DAS', valor: 'R$ 850,00' },
    { data: '20/01', imposto: 'INSS', valor: 'R$ 980,00' },
    { data: '31/01', imposto: 'IRPJ', valor: 'R$ 2.300,00' }
  ];

  const linksUteis = [
    { nome: 'Portal do Simples Nacional', url: '#', descricao: 'Acesse para calcular e emitir DAS' },
    { nome: 'Receita Federal', url: '#', descricao: 'Portal oficial da Receita Federal' },
    { nome: 'Gov.br', url: '#', descricao: 'Portal unificado do governo federal' },
    { nome: 'Calculadora DAS', url: '#', descricao: 'Simule o valor do seu DAS mensal' }
  ];

  const getStatusBadge = (pago: boolean) => {
    return pago ? 
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">Pago</Badge> :
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">Em aberto</Badge>;
  };

  return (
    <section id="impostos" className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Impostos e Taxas</h2>
        <p className="text-muted-foreground">Controle completo das obrigações fiscais</p>
      </div>

      {/* Alertas de Vencimento */}
      <Card className="rounded-2xl shadow-sm border-orange-200 dark:border-orange-800">
        <CardHeader>
          <CardTitle className="text-orange-600">🚨 Próximos Vencimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proximosVencimentos.slice(0, 6).map((item, index) => (
              <div key={index} className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-orange-800 dark:text-orange-200">{item.imposto}</p>
                    <p className="text-sm text-muted-foreground">Vence: {item.data}</p>
                  </div>
                  <p className="font-bold text-orange-600">{item.valor}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendário e Resumo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Calendário Fiscal</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar className="rounded-xl" />
            </CardContent>
          </Card>
        </div>
        
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Resumo do Mês</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-sm text-muted-foreground">Total em Aberto</p>
              <p className="text-2xl font-bold text-red-600">R$ 4.350,00</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <p className="text-sm text-muted-foreground">Já Pagos</p>
              <p className="text-2xl font-bold text-green-600">R$ 1.400,00</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-sm text-muted-foreground">% sobre Receita</p>
              <p className="text-2xl font-bold text-blue-600">20.3%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Impostos */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Controle de Impostos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-semibold">Tipo de Imposto</th>
                  <th className="text-left p-4 font-semibold">Descrição</th>
                  <th className="text-left p-4 font-semibold">Vencimento</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-right p-4 font-semibold">Valor</th>
                  <th className="text-center p-4 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {impostos.map((imposto, index) => (
                  <tr key={index} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-4">
                      <div>
                        <p className="font-semibold">{imposto.tipo}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-muted-foreground max-w-xs">{imposto.descricao}</p>
                    </td>
                    <td className="p-4">{imposto.vencimento}</td>
                    <td className="p-4">{getStatusBadge(imposto.pago)}</td>
                    <td className="p-4 text-right font-bold text-foreground">{imposto.valor}</td>
                    <td className="p-4 text-center space-x-2">
                      {!imposto.pago && (
                        <Button size="sm" className="rounded-lg">
                          Pagar
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="rounded-lg">
                        Detalhes
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Guia Rápida */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>💡 Guia Rápida dos Impostos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">DAS - Simples Nacional</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Pagamento único mensal que inclui vários impostos. Ideal para pequenas empresas.
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <h4 className="font-semibold text-green-800 dark:text-green-200">ISS - Imposto sobre Serviços</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Tributo municipal sobre prestação de serviços. Varia de 2% a 5%.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <h4 className="font-semibold text-purple-800 dark:text-purple-200">ICMS - Circulação</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Imposto estadual sobre venda de produtos e mercadorias.
                </p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                <h4 className="font-semibold text-orange-800 dark:text-orange-200">IRPJ - Imposto de Renda</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Imposto federal sobre o lucro da empresa. Pode ser trimestral ou anual.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Links Úteis */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>🔗 Links Úteis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {linksUteis.map((link, index) => (
              <div key={index} className="p-4 border border-border rounded-xl hover:bg-muted/30 transition-colors cursor-pointer">
                <h4 className="font-semibold text-primary mb-2">{link.nome}</h4>
                <p className="text-sm text-muted-foreground">{link.descricao}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default Impostos;
