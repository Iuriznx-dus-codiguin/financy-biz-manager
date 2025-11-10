import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Download, BarChart3, TrendingUp, TrendingDown, FolderOpen, FileText, Users, Target, DollarSign, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import FlappyFinancyGame from '@/components/FlappyFinancyGame';
import { useSectionTutorials } from '@/hooks/useSectionTutorials';

const Ajuda = () => {
  const { resetTutorials } = useSectionTutorials();
  
  const restartTutorial = async (section: string) => {
    await resetTutorials();
    // Recarregar a página para a seção específica
    window.location.hash = section;
    window.location.reload();
  };

  const generatePDF = (guideType: string) => {
    const doc = new jsPDF();
    
    // Configurar fonte
    doc.setFont('helvetica');
    
    switch (guideType) {
      case 'receitas-despesas':
        doc.setFontSize(20);
        doc.text('Guia: Como Cadastrar Receitas e Despesas', 20, 30);
        
        doc.setFontSize(14);
        doc.text('1. CADASTRANDO RECEITAS', 20, 50);
        doc.setFontSize(12);
        doc.text('• Acesse a seção "Receitas" no menu lateral', 25, 65);
        doc.text('• Clique no botão "Nova Receita"', 25, 75);
        doc.text('• Preencha os campos obrigatórios:', 25, 85);
        doc.text('  - Data da receita', 30, 95);
        doc.text('  - Descrição detalhada', 30, 105);
        doc.text('  - Categoria (Vendas, Serviços, etc.)', 30, 115);
        doc.text('  - Valor em reais', 30, 125);
        doc.text('  - Forma de pagamento', 30, 135);
        doc.text('• Opcionalmente, adicione o nome do cliente', 25, 145);
        doc.text('• Confirme clicando em "Adicionar Receita"', 25, 155);
        
        doc.setFontSize(14);
        doc.text('2. CADASTRANDO DESPESAS', 20, 175);
        doc.setFontSize(12);
        doc.text('• Acesse a seção "Despesas" no menu lateral', 25, 190);
        doc.text('• Clique no botão "Nova Despesa"', 25, 200);
        doc.text('• Preencha os campos obrigatórios:', 25, 210);
        doc.text('  - Data da despesa', 30, 220);
        doc.text('  - Descrição detalhada', 30, 230);
        doc.text('  - Categoria (Fornecedores, Equipamentos, etc.)', 30, 240);
        doc.text('  - Valor em reais', 30, 250);
        doc.text('  - Forma de pagamento', 30, 260);
        doc.text('• Opcionalmente, adicione o nome do fornecedor', 25, 270);
        doc.text('• Confirme clicando em "Adicionar Despesa"', 25, 280);
        break;
        
      case 'impostos':
        doc.setFontSize(20);
        doc.text('Guia: Controle de Impostos no Financy', 20, 30);
        
        doc.setFontSize(14);
        doc.text('1. CADASTRANDO IMPOSTOS E TAXAS', 20, 50);
        doc.setFontSize(12);
        doc.text('• Acesse "Impostos e Taxas" no menu', 25, 65);
        doc.text('• Clique em "Adicionar Imposto/Taxa"', 25, 75);
        doc.text('• Selecione o tipo: Imposto ou Taxa', 25, 85);
        doc.text('• Descreva o imposto (ex: DAS, IPTU)', 25, 95);
        doc.text('• Defina o valor e tipo (fixo ou porcentagem)', 25, 105);
        doc.text('• Informe a data de vencimento', 25, 115);
        doc.text('• Escolha: Pagamento único ou recorrente', 25, 125);
        
        doc.setFontSize(14);
        doc.text('2. GERENCIANDO PAGAMENTOS', 20, 145);
        doc.setFontSize(12);
        doc.text('• Use "Marcar como Pago" após quitar', 25, 160);
        doc.text('• Configure alertas para vencimentos', 25, 170);
        doc.text('• Acompanhe impostos vencidos no dashboard', 25, 180);
        break;
        
      case 'dashboard':
        doc.setFontSize(20);
        doc.text('Guia: Como Usar o Dashboard', 20, 30);
        
        doc.setFontSize(14);
        doc.text('1. VISÃO GERAL FINANCEIRA', 20, 50);
        doc.setFontSize(12);
        doc.text('• Saldo atual: diferença entre receitas e despesas', 25, 65);
        doc.text('• Total de receitas do período', 25, 75);
        doc.text('• Total de despesas do período', 25, 85);
        doc.text('• Impostos próximos do vencimento', 25, 95);
        
        doc.setFontSize(14);
        doc.text('2. GRÁFICOS E ANÁLISES', 20, 115);
        doc.setFontSize(12);
        doc.text('• Evolução mensal das finanças', 25, 130);
        doc.text('• Distribuição por categorias', 25, 140);
        doc.text('• Comparativo receitas vs despesas', 25, 150);
        break;
        
      case 'relatorios':
        doc.setFontSize(20);
        doc.text('Guia: Relatórios Financeiros', 20, 30);
        
        doc.setFontSize(14);
        doc.text('1. TIPOS DE RELATÓRIOS', 20, 50);
        doc.setFontSize(12);
        doc.text('• Relatório mensal de receitas', 25, 65);
        doc.text('• Relatório mensal de despesas', 25, 75);
        doc.text('• Demonstrativo de fluxo de caixa', 25, 85);
        doc.text('• Análise por categorias', 25, 95);
        
        doc.setFontSize(14);
        doc.text('2. COMO GERAR RELATÓRIOS', 20, 115);
        doc.setFontSize(12);
        doc.text('• Acesse a seção "Relatórios"', 25, 130);
        doc.text('• Selecione o período desejado', 25, 140);
        doc.text('• Escolha o tipo de relatório', 25, 150);
        doc.text('• Clique em "Gerar Relatório"', 25, 160);
        doc.text('• Exporte em PDF ou Excel', 25, 170);
        break;
    }
    
    // Rodapé
    doc.setFontSize(10);
    doc.text('Gerado pelo Financy - Sistema de Gestão Financeira', 20, 280);
    doc.text('Para mais dúvidas, entre em contato conosco!', 20, 290);
    
    // Download do PDF
    doc.save(`financy-guia-${guideType}.pdf`);
  };

  const guias = [
    {
      title: 'Como cadastrar receitas e despesas',
      description: 'Aprenda a registrar suas movimentações financeiras',
      icon: '💰',
      guideType: 'receitas-despesas'
    },
    {
      title: 'Controle de impostos no Financy',
      description: 'Mantenha seus impostos organizados e em dia',
      icon: '🧾',
      guideType: 'impostos'
    },
    {
      title: 'Como usar o dashboard',
      description: 'Entenda todos os indicadores e gráficos',
      icon: '📊',
      guideType: 'dashboard'
    },
    {
      title: 'Relatórios financeiros',
      description: 'Gere relatórios para acompanhar sua performance',
      icon: '📈',
      guideType: 'relatorios'
    }
  ];

  const faq = [
    {
      pergunta: 'Como faço para cadastrar uma nova receita?',
      resposta: 'Acesse a seção "Receitas" no menu lateral, clique em "Nova Receita" e preencha os campos obrigatórios: data, descrição, categoria, valor e forma de pagamento. Você também pode adicionar informações do cliente se desejar.'
    },
    {
      pergunta: 'Posso editar ou excluir receitas e despesas já cadastradas?',
      resposta: 'Sim! Na lista de receitas ou despesas, clique no ícone de lixeira ao lado do registro que deseja excluir. Para editar, entre em contato com o suporte.'
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

  const handleWhatsAppSupport = () => {
    const message = encodeURIComponent("Gostaria de conversar com o suporte da Financy");
    window.open(`https://wa.me/5587999083662?text=${message}`, '_blank');
  };

  const handleEmailSupport = () => {
    window.open('mailto:central.financy@gmail.com', '_blank');
  };

  const handleReportProblem = () => {
    const subject = encodeURIComponent("Relatar Problema - Financy");
    const body = encodeURIComponent("Descreva o problema encontrado:\n\n");
    window.open(`mailto:central.financy@gmail.com?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Ajuda e Suporte</h2>
        <p className="text-muted-foreground">Central de instruções e suporte para o Financy</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl shadow-sm border-green-200 dark:border-green-800">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="font-bold mb-2">WhatsApp</h3>
            <p className="text-sm text-muted-foreground mb-4">Suporte via WhatsApp das 8h às 18h</p>
            <Button className="w-full rounded-xl bg-green-600 hover:bg-green-700" onClick={handleWhatsAppSupport}>
              Abrir WhatsApp
            </Button>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl shadow-sm border-blue-200 dark:border-blue-800">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">📧</div>
            <h3 className="font-bold mb-2">Email</h3>
            <p className="text-sm text-muted-foreground mb-4">Resposta em até 24 horas</p>
            <Button variant="outline" className="w-full rounded-xl" onClick={handleEmailSupport}>
              Enviar Email
            </Button>
          </CardContent>
        </Card>
        
        <FlappyFinancyGame />
        
        <Card className="rounded-2xl shadow-sm border-red-200 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">🐛</div>
            <h3 className="font-bold mb-2">Relatar Problema</h3>
            <p className="text-sm text-muted-foreground mb-4">Reporte bugs ou problemas técnicos</p>
            <Button variant="outline" className="w-full rounded-xl" onClick={handleReportProblem}>
              Relatar Problema
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
              <div key={index} className="p-6 border border-border rounded-xl hover:bg-muted/30 transition-colors">
                <div className="flex items-start space-x-4">
                  <span className="text-3xl">{guia.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-2">{guia.title}</h4>
                    <p className="text-sm text-muted-foreground mb-4">{guia.description}</p>
                    <Button
                      onClick={() => generatePDF(guia.guideType)}
                      className="rounded-lg bg-primary hover:bg-primary/90"
                      size="sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Baixar Guia em PDF
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
          <CardTitle>🎓 Tutoriais Interativos</CardTitle>
          <CardDescription>
            Revise os tutoriais de cada seção da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              className="w-full justify-start h-auto py-4"
              onClick={() => restartTutorial('painel')}
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Dashboard</div>
                  <div className="text-xs text-muted-foreground">Visão geral financeira</div>
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start h-auto py-4"
              onClick={() => restartTutorial('receitas')}
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div className="text-left">
                  <div className="font-semibold">Receitas</div>
                  <div className="text-xs text-muted-foreground">Registrar entradas</div>
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start h-auto py-4"
              onClick={() => restartTutorial('despesas')}
            >
              <div className="flex items-center gap-3">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <div className="text-left">
                  <div className="font-semibold">Despesas</div>
                  <div className="text-xs text-muted-foreground">Registrar saídas</div>
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start h-auto py-4"
              onClick={() => restartTutorial('categorias')}
            >
              <div className="flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold">Categorias</div>
                  <div className="text-xs text-muted-foreground">Organizar finanças</div>
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start h-auto py-4"
              onClick={() => restartTutorial('impostos')}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-orange-600" />
                <div className="text-left">
                  <div className="font-semibold">Impostos</div>
                  <div className="text-xs text-muted-foreground">Gerenciar tributos</div>
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start h-auto py-4"
              onClick={() => restartTutorial('metas')}
            >
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-purple-600" />
                <div className="text-left">
                  <div className="font-semibold">Metas</div>
                  <div className="text-xs text-muted-foreground">Definir objetivos</div>
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start h-auto py-4"
              onClick={() => restartTutorial('relatorios')}
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div className="text-left">
                  <div className="font-semibold">Relatórios</div>
                  <div className="text-xs text-muted-foreground">Análises financeiras</div>
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start h-auto py-4"
              onClick={() => restartTutorial('equipe')}
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-indigo-600" />
                <div className="text-left">
                  <div className="font-semibold">Equipe</div>
                  <div className="text-xs text-muted-foreground">Gerenciar membros</div>
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start h-auto py-4"
              onClick={() => restartTutorial('fechamento')}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-teal-600" />
                <div className="text-left">
                  <div className="font-semibold">Fechamento</div>
                  <div className="text-xs text-muted-foreground">Fechar período</div>
                </div>
              </div>
            </Button>
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
