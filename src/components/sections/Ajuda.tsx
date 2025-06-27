
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const Ajuda = () => {
  const guias = [
    {
      title: 'Como emitir nota fiscal',
      description: 'Passo a passo para emissão de NFe e NFSe',
      icon: '📄',
      content: 'Guia completo sobre emissão de notas fiscais eletrônicas...'
    },
    {
      title: 'O que é cada imposto',
      description: 'Entenda DAS, ISS, ICMS, IRPJ e outros',
      icon: '🧾',
      content: 'Explicação detalhada sobre cada tipo de imposto...'
    },
    {
      title: 'Como fazer um DRE',
      description: 'Demonstrativo do Resultado do Exercício',
      icon: '📊',
      content: 'Tutorial para criar seu DRE mensal e anual...'
    },
    {
      title: 'Como controlar o fluxo de caixa',
      description: 'Melhores práticas para gestão financeira',
      icon: '💰',
      content: 'Dicas essenciais para um controle efetivo...'
    }
  ];

  const faq = [
    {
      pergunta: 'Como faço para importar dados de outro sistema?',
      resposta: 'Você pode importar dados através da seção Configurações > Integrações. Oferecemos conectores para os principais sistemas de gestão e também importação via CSV.'
    },
    {
      pergunta: 'Posso usar o Financy em múltiplas empresas?',
      resposta: 'Sim! No plano Premium você pode gerenciar até 5 empresas diferentes na mesma conta. Cada empresa terá seus dados separados e independentes.'
    },
    {
      pergunta: 'Como funciona o fechamento automático de caixa?',
      resposta: 'O sistema pode ser configurado para fechar automaticamente o caixa todos os dias às 23h59. Você receberá um relatório por email com o resumo do dia.'
    },
    {
      pergunta: 'Meus dados estão seguros?',
      resposta: 'Sim! Utilizamos criptografia de ponta a ponta, backups automáticos diários e servidores seguros. Seus dados financeiros estão totalmente protegidos.'
    },
    {
      pergunta: 'Como cancelar minha assinatura?',
      resposta: 'Você pode cancelar a qualquer momento em Configurações > Plano e Assinatura. Não há multas ou taxas de cancelamento.'
    },
    {
      pergunta: 'Posso personalizar os relatórios?',
      resposta: 'Sim! Todos os relatórios podem ser personalizados com filtros, períodos específicos e você pode escolher quais dados incluir ou excluir.'
    }
  ];

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Ajuda e Suporte</h2>
        <p className="text-muted-foreground">Central de instruções e suporte para micro e pequenas empresas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl shadow-sm border-green-200 dark:border-green-800">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="font-bold mb-2">WhatsApp</h3>
            <p className="text-sm text-muted-foreground mb-4">Suporte via WhatsApp das 8h às 18h</p>
            <Button className="w-full rounded-xl bg-green-600 hover:bg-green-700">
              Abrir WhatsApp
            </Button>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl shadow-sm border-blue-200 dark:border-blue-800">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">📧</div>
            <h3 className="font-bold mb-2">Email</h3>
            <p className="text-sm text-muted-foreground mb-4">Resposta em até 24 horas</p>
            <Button variant="outline" className="w-full rounded-xl">
              Enviar Email
            </Button>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl shadow-sm border-purple-200 dark:border-purple-800">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">🎧</div>
            <h3 className="font-bold mb-2">Suporte Premium</h3>
            <p className="text-sm text-muted-foreground mb-4">Suporte prioritário por telefone</p>
            <Button variant="outline" className="w-full rounded-xl">
              Agendar Chamada
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>📖 Guias Essenciais para PMEs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {guias.map((guia, index) => (
              <div key={index} className="p-6 border border-border rounded-xl hover:bg-muted/30 transition-colors cursor-pointer">
                <div className="flex items-start space-x-4">
                  <span className="text-3xl">{guia.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-2">{guia.title}</h4>
                    <p className="text-sm text-muted-foreground mb-4">{guia.description}</p>
                    <Button variant="outline" size="sm" className="rounded-lg">
                      Ler Guia Completo
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>❓ Perguntas Frequentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faq.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left hover:no-underline">
                  {item.pergunta}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.resposta}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </section>
  );
};

export default Ajuda;
