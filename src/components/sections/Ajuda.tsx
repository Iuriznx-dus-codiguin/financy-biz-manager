
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const Ajuda = () => {
  const guias = [
    {
      title: 'Como cadastrar receitas e despesas',
      description: 'Aprenda a registrar suas movimentações financeiras',
      icon: '💰',
      content: 'Guia completo sobre como cadastrar e gerenciar suas receitas e despesas...'
    },
    {
      title: 'Controle de impostos no Financy',
      description: 'Mantenha seus impostos organizados e em dia',
      icon: '🧾',
      content: 'Tutorial sobre como controlar vencimentos e pagamentos de impostos...'
    },
    {
      title: 'Como usar o dashboard',
      description: 'Entenda todos os indicadores e gráficos',
      icon: '📊',
      content: 'Explicação detalhada sobre cada seção do dashboard...'
    },
    {
      title: 'Relatórios financeiros',
      description: 'Gere relatórios para acompanhar sua performance',
      icon: '📈',
      content: 'Como gerar e interpretar os relatórios disponíveis...'
    }
  ];

  const faq = [
    {
      pergunta: 'Como faço para cadastrar uma nova receita?',
      resposta: 'Acesse a seção "Receitas" no menu lateral, clique em "Nova Receita" e preencha os campos obrigatórios: data, descrição, categoria, valor e forma de pagamento. Você também pode adicionar informações do cliente se desejar.'
    },
    {
      pergunta: 'Posso editar ou excluir receitas e despesas já cadastradas?',
      resposta: 'Sim! Na lista de receitas ou despesas, clique no ícone de edição ao lado do registro que deseja modificar. Você pode alterar qualquer informação ou excluir o registro completamente.'
    },
    {
      pergunta: 'Como funciona o controle de impostos?',
      resposta: 'Na seção "Impostos", você pode cadastrar todos os impostos com suas respectivas datas de vencimento. O sistema mostrará quais estão próximos do vencimento e permite marcar como pagos quando quitados.'
    },
    {
      pergunta: 'O que aparece no dashboard principal?',
      resposta: 'O dashboard mostra um resumo das suas finanças: total de receitas e despesas do mês, saldo atual, impostos próximos do vencimento e gráficos com a evolução dos seus números financeiros.'
    },
    {
      pergunta: 'Como posso acompanhar meu fluxo de caixa?',
      resposta: 'Use a combinação do dashboard para visão geral e a seção "Relatórios" para análises mais detalhadas. Você pode filtrar por períodos específicos e categorias para entender melhor seus padrões financeiros.'
    },
    {
      pergunta: 'É possível categorizar receitas e despesas?',
      resposta: 'Sim! Ao cadastrar receitas e despesas, você pode escolher entre várias categorias predefinidas ou criar suas próprias. Isso ajuda na organização e análise dos seus gastos por área.'
    },
    {
      pergunta: 'Como funciona o fechamento de caixa?',
      resposta: 'A seção "Fechamento" permite que você faça o fechamento do caixa de períodos específicos, consolidando todas as movimentações e gerando um resumo final para controle.'
    },
    {
      pergunta: 'Posso usar o Financy no celular?',
      resposta: 'Sim! O Financy é totalmente responsivo e funciona perfeitamente em dispositivos móveis. Você pode acessar pelo navegador do seu smartphone ou tablet.'
    }
  ];

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Ajuda e Suporte</h2>
        <p className="text-muted-foreground">Central de instruções e suporte para o Financy</p>
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
          <CardTitle>📖 Guias Essenciais do Financy</CardTitle>
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
