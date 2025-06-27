
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Check, Calendar, AlertTriangle } from 'lucide-react';

const Assinatura: React.FC = () => {
  const handlePayment = () => {
    window.open('https://pay.cakto.com.br/4cwxcix_453682', '_blank');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assinatura</h1>
          <p className="text-muted-foreground mt-2">Gerencie sua assinatura do Financy</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Plano Atual */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Plano Premium
            </CardTitle>
            <CardDescription>
              Acesso completo a todas as funcionalidades do Financy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">R$ 49,90</div>
              <div className="text-muted-foreground">/mês</div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Dashboard completo</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Gestão de receitas e despesas</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Controle de impostos</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Relatórios avançados</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Fechamento de caixa</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Suporte prioritário</span>
              </div>
            </div>

            <Button 
              onClick={handlePayment}
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12"
            >
              Assinar Agora
            </Button>
          </CardContent>
        </Card>

        {/* Status da Assinatura */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Status da Assinatura
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="font-semibold text-yellow-800 dark:text-yellow-200">Período de Teste</span>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Você está no período de teste gratuito. Assine para continuar usando todas as funcionalidades.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium text-yellow-600">Teste Gratuito</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Próximo Vencimento:</span>
                <span className="font-medium">--</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Método de Pagamento:</span>
                <span className="font-medium">--</span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">Histórico de Pagamentos</h4>
              <div className="text-sm text-muted-foreground text-center py-8">
                Nenhum pagamento realizado ainda
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ da Assinatura */}
      <Card>
        <CardHeader>
          <CardTitle>Perguntas Frequentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Como funciona a cobrança?</h4>
            <p className="text-sm text-muted-foreground">
              A cobrança é mensal no valor de R$ 49,90 e é processada automaticamente todo mês na mesma data da primeira assinatura.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Posso cancelar a qualquer momento?</h4>
            <p className="text-sm text-muted-foreground">
              Sim, você pode cancelar sua assinatura a qualquer momento. O acesso continuará até o final do período pago.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Há período de teste gratuito?</h4>
            <p className="text-sm text-muted-foreground">
              Sim, oferecemos um período de teste para que você possa conhecer todas as funcionalidades antes de assinar.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Assinatura;
