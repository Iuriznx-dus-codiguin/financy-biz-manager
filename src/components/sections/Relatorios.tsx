
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const Relatorios = () => {
  const [selectedReport, setSelectedReport] = useState('mensal');
  const { receitas, despesas, impostos } = useAppContext();

  // Calcular dados reais
  const totalReceitas = receitas.reduce((sum, r) => sum + r.valor, 0);
  const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0);
  const totalImpostosPagos = impostos.filter(i => i.pago).reduce((sum, i) => sum + i.valor, 0);
  const lucroLiquido = totalReceitas - totalDespesas - totalImpostosPagos;
  const margemLucro = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;

  // Gerar dados mensais baseados nos dados reais
  const gerarDadosMensais = () => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    const dados = [];
    
    for (let i = 0; i < 6; i++) {
      const mes = new Date();
      mes.setMonth(mes.getMonth() - (5 - i));
      const mesAtual = mes.getMonth() + 1;
      const anoAtual = mes.getFullYear();
      
      const receitasMes = receitas.filter(r => {
        const dataReceita = new Date(r.data);
        return dataReceita.getMonth() + 1 === mesAtual && dataReceita.getFullYear() === anoAtual;
      }).reduce((sum, r) => sum + r.valor, 0);
      
      const despesasMes = despesas.filter(d => {
        const dataDespesa = new Date(d.data);
        return dataDespesa.getMonth() + 1 === mesAtual && dataDespesa.getFullYear() === anoAtual;
      }).reduce((sum, d) => sum + d.valor, 0);
      
      dados.push({
        month: meses[i],
        receitas: receitasMes,
        despesas: despesasMes,
        lucro: receitasMes - despesasMes
      });
    }
    
    return dados;
  };

  // Gerar dados por categoria baseados nas receitas reais
  const gerarDadosPorCategoria = () => {
    const categorias = receitas.reduce((acc, receita) => {
      acc[receita.categoria] = (acc[receita.categoria] || 0) + receita.valor;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categorias).map(([categoria, valor]) => ({
      categoria,
      valor
    }));
  };

  const monthlyData = gerarDadosMensais();
  const categoryData = gerarDadosPorCategoria();

  // Gerar insights baseados nos dados reais
  const gerarInsights = () => {
    const insights = [];

    if (totalReceitas > totalDespesas) {
      const crescimento = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas * 100).toFixed(1) : '0';
      insights.push({
        title: 'Resultado Positivo',
        description: `Suas receitas superam as despesas em ${crescimento}%`,
        type: 'positive'
      });
    }

    if (margemLucro > 20) {
      insights.push({
        title: 'Boa Margem de Lucro',
        description: `Sua margem de lucro está em ${margemLucro.toFixed(1)}%`,
        type: 'positive'
      });
    } else if (margemLucro > 0) {
      insights.push({
        title: 'Margem Baixa',
        description: `Sua margem de lucro está em ${margemLucro.toFixed(1)}% - considere otimizar custos`,
        type: 'warning'
      });
    }

    if (categoryData.length > 0) {
      const maiorCategoria = categoryData.reduce((prev, current) => 
        prev.valor > current.valor ? prev : current
      );
      const percentualMaior = totalReceitas > 0 ? (maiorCategoria.valor / totalReceitas * 100).toFixed(1) : '0';
      insights.push({
        title: 'Principal Fonte de Receita',
        description: `${maiorCategoria.categoria} representa ${percentualMaior}% da sua receita`,
        type: 'info'
      });
    }

    if (insights.length === 0) {
      insights.push({
        title: 'Comece a Registrar',
        description: 'Adicione receitas e despesas para ver insights personalizados',
        type: 'info'
      });
    }

    return insights;
  };

  const insights = gerarInsights();

  // Gerar rankings baseados nos dados reais
  const gerarRankings = () => {
    const maioresDespesas = despesas
      .reduce((acc, despesa) => {
        const categoria = despesa.categoria;
        acc[categoria] = (acc[categoria] || 0) + despesa.valor;
        return acc;
      }, {} as Record<string, number>);

    const maioresReceitas = receitas
      .reduce((acc, receita) => {
        const categoria = receita.categoria;
        acc[categoria] = (acc[categoria] || 0) + receita.valor;
        return acc;
      }, {} as Record<string, number>);

    return {
      maioresGastos: Object.entries(maioresDespesas)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([item, valor]) => ({
          item,
          valor: `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        })),
      maioresReceitas: Object.entries(maioresReceitas)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([item, valor]) => ({
          item,
          valor: `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        }))
    };
  };

  const rankings = gerarRankings();

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'warning': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'info': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.text('Relatório Financeiro - Financy', 20, 30);
      
      // Current date
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 40);
      
      // Financial summary
      doc.setFontSize(14);
      doc.text('Resumo Executivo', 20, 60);
      
      doc.setFontSize(10);
      doc.text(`Receita Total: R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 75);
      doc.text(`Despesas Total: R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 85);
      doc.text(`Lucro Líquido: R$ ${lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 95);
      doc.text(`Margem de Lucro: ${margemLucro.toFixed(1)}%`, 20, 105);
      
      // Insights
      doc.setFontSize(14);
      doc.text('Insights Principais', 20, 125);
      
      let yPosition = 140;
      insights.slice(0, 3).forEach((insight) => {
        doc.setFontSize(10);
        doc.text(`• ${insight.title}: ${insight.description}`, 20, yPosition);
        yPosition += 10;
      });
      
      doc.save('relatorio-financeiro-financy.pdf');
      toast.success('Relatório PDF exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
      console.error('PDF Export Error:', error);
    }
  };

  const handleExportExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Summary sheet
      const summaryData = [
        ['Relatório Financeiro - Financy'],
        ['Gerado em:', new Date().toLocaleDateString('pt-BR')],
        [''],
        ['Resumo Executivo'],
        ['Receita Total', `R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Despesas Total', `R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Impostos Pagos', `R$ ${totalImpostosPagos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Lucro Líquido', `R$ ${lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Margem de Lucro', `${margemLucro.toFixed(1)}%`],
        [''],
        ['Insights Principais'],
        ...insights.map(insight => [insight.title, insight.description])
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
      
      // Monthly evolution sheet
      const monthlySheet = XLSX.utils.json_to_sheet(monthlyData);
      XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Evolução Mensal');
      
      // Categories sheet
      if (categoryData.length > 0) {
        const categoriesSheet = XLSX.utils.json_to_sheet(categoryData);
        XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Receitas por Categoria');
      }
      
      XLSX.writeFile(workbook, 'relatorio-financeiro-financy.xlsx');
      toast.success('Relatório Excel exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar Excel');
      console.error('Excel Export Error:', error);
    }
  };

  return (
    <section id="relatorios" className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Relatórios</h2>
          <p className="text-muted-foreground">Análises e insights gerenciais do seu negócio</p>
        </div>
        <div className="flex space-x-4">
          <Button variant="outline" className="rounded-xl" onClick={handleExportPDF}>
            📄 Exportar PDF
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={handleExportExcel}>
            📊 Exportar Excel
          </Button>
        </div>
      </div>

      {/* Seletor de Relatório */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Tipo de Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione o relatório" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">Relatório Mensal</SelectItem>
                <SelectItem value="categoria">Por Categoria</SelectItem>
                <SelectItem value="cliente">Por Cliente</SelectItem>
                <SelectItem value="comparativo">Comparativo</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ultimo-mes">Último Mês</SelectItem>
                <SelectItem value="ultimos-3-meses">Últimos 3 Meses</SelectItem>
                <SelectItem value="ultimos-6-meses">Últimos 6 Meses</SelectItem>
                <SelectItem value="ano-atual">Ano Atual</SelectItem>
              </SelectContent>
            </Select>
            <Button className="rounded-xl">
              Gerar Relatório
            </Button>
            <Button variant="outline" className="rounded-xl">
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Insights Principais */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>💡 Insights Principais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-xl border ${getInsightColor(insight.type)}`}
              >
                <h4 className="font-semibold mb-2">{insight.title}</h4>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Evolução Mensal - Receitas vs Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.some(d => d.receitas > 0 || d.despesas > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  <Line type="monotone" dataKey="receitas" stroke="#22C55E" strokeWidth={3} name="Receitas" />
                  <Line type="monotone" dataKey="despesas" stroke="#EF4444" strokeWidth={3} name="Despesas" />
                  <Line type="monotone" dataKey="lucro" stroke="#3B82F6" strokeWidth={3} name="Lucro" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">Nenhum dado disponível ainda</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Receitas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  <Bar dataKey="valor" fill="#22C55E" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">Nenhuma receita cadastrada ainda</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rankings e Listas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>🔻 Maiores Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {rankings.maioresGastos.length > 0 ? (
              <div className="space-y-3">
                {rankings.maioresGastos.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <span className="font-medium">{item.item}</span>
                    </div>
                    <span className="font-bold text-red-600">{item.valor}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma despesa registrada ainda</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>🔸 Maiores Fontes de Receita</CardTitle>
          </CardHeader>
          <CardContent>
            {rankings.maioresReceitas.length > 0 ? (
              <div className="space-y-3">
                {rankings.maioresReceitas.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <span className="font-medium">{item.item}</span>
                    </div>
                    <span className="font-bold text-green-600">{item.valor}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma receita registrada ainda</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo Executivo */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>📋 Resumo Executivo - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-sm text-muted-foreground">Receita Total</p>
              <p className="text-2xl font-bold text-blue-600">R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-sm text-muted-foreground">Despesas Total</p>
              <p className="text-2xl font-bold text-red-600">R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <p className="text-sm text-muted-foreground">Lucro Líquido</p>
              <p className={`text-2xl font-bold ${lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <p className="text-sm text-muted-foreground">Margem de Lucro</p>
              <p className={`text-2xl font-bold ${margemLucro >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                {margemLucro.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default Relatorios;
