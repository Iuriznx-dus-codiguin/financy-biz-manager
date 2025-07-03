
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAppContext } from '@/contexts/AppContext';
import { TimeFilter } from '@/components/TimeFilter';
import { isDateInRange, getDateRange } from '@/utils/dateFilters';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { FileText, Download } from 'lucide-react';

const Relatorios = () => {
  const [selectedReport, setSelectedReport] = useState('mensal');
  const [timeFilter, setTimeFilter] = useState('este-mes');
  const [isGenerating, setIsGenerating] = useState(false);
  const { receitas, despesas, impostos } = useAppContext();

  // Filtrar dados baseado no filtro de tempo
  const filteredReceitas = receitas.filter(r => isDateInRange(r.data, timeFilter));
  const filteredDespesas = despesas.filter(d => isDateInRange(d.data, timeFilter));
  const filteredImpostos = impostos.filter(i => isDateInRange(i.vencimento, timeFilter));

  // Calcular dados reais baseados no filtro
  const totalReceitas = filteredReceitas.reduce((sum, r) => sum + r.valor, 0);
  const totalDespesas = filteredDespesas.reduce((sum, d) => sum + d.valor, 0);
  const totalImpostosPagos = filteredImpostos.filter(i => i.pago).reduce((sum, i) => sum + i.valor, 0);
  const lucroLiquido = totalReceitas - totalDespesas - totalImpostosPagos;
  const margemLucro = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;

  const getTimeFilterLabel = (filter: string) => {
    const labels: Record<string, string> = {
      'hoje': 'Hoje',
      'ontem': 'Ontem',
      'esta-semana': 'Esta Semana',
      'semana-passada': 'Semana Passada',
      'este-mes': 'Este Mês',
      'mes-passado': 'Mês Passado',
      'ultimos-30-dias': 'Últimos 30 Dias',
      'ultimos-90-dias': 'Últimos 90 Dias',
      'este-ano': 'Este Ano',
      'ano-passado': 'Ano Passado'
    };
    return labels[filter] || 'Período Selecionado';
  };

  // Gerar dados baseados no tipo de relatório e período
  const gerarDadosRelatorio = () => {
    const { start, end } = getDateRange(timeFilter);
    
    switch (selectedReport) {
      case 'mensal':
        return gerarDadosMensais();
      case 'categoria':
        return gerarDadosPorCategoria();
      case 'cliente':
        return gerarDadosPorCliente();
      case 'comparativo':
        return gerarDadosComparativos();
      default:
        return gerarDadosMensais();
    }
  };

  const gerarDadosMensais = () => {
    const dados = [];
    const { start, end } = getDateRange(timeFilter);
    
    // Gera dados baseados no período selecionado
    if (timeFilter.includes('semana')) {
      // Dados por dia da semana
      for (let i = 0; i < 7; i++) {
        const data = new Date(start);
        data.setDate(start.getDate() + i);
        if (data <= end) {
          const dataStr = data.toISOString().split('T')[0];
          const receitasDia = receitas.filter(r => r.data === dataStr).reduce((sum, r) => sum + r.valor, 0);
          const despesasDia = despesas.filter(d => d.data === dataStr).reduce((sum, d) => sum + d.valor, 0);
          dados.push({
            period: data.toLocaleDateString('pt-BR', { weekday: 'short' }),
            receitas: receitasDia,
            despesas: despesasDia,
            lucro: receitasDia - despesasDia
          });
        }
      }
    } else {
      // Dados mensais
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const agora = new Date();
      for (let i = 0; i < 6; i++) {
        const mes = new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1);
        const mesStr = mes.getMonth() + 1;
        const anoStr = mes.getFullYear();
        const receitasMes = receitas.filter(r => {
          const dataReceita = new Date(r.data);
          return dataReceita.getMonth() + 1 === mesStr && dataReceita.getFullYear() === anoStr;
        }).reduce((sum, r) => sum + r.valor, 0);
        const despesasMes = despesas.filter(d => {
          const dataDespesa = new Date(d.data);
          return dataDespesa.getMonth() + 1 === mesStr && dataDespesa.getFullYear() === anoStr;
        }).reduce((sum, d) => sum + d.valor, 0);
        dados.push({
          period: meses[mes.getMonth()],
          receitas: receitasMes,
          despesas: despesasMes,
          lucro: receitasMes - despesasMes
        });
      }
    }
    
    return dados;
  };

  const gerarDadosPorCategoria = () => {
    const categorias = filteredReceitas.reduce((acc, receita) => {
      acc[receita.categoria] = (acc[receita.categoria] || 0) + receita.valor;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categorias).map(([categoria, valor]) => ({
      categoria,
      valor
    }));
  };

  const gerarDadosPorCliente = () => {
    const clientes = filteredReceitas.reduce((acc, receita) => {
      const cliente = receita.cliente || 'Cliente não informado';
      acc[cliente] = (acc[cliente] || 0) + receita.valor;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(clientes)
      .map(([cliente, valor]) => ({ cliente, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  };

  const gerarDadosComparativos = () => {
    // Comparar com período anterior
    const periodoAtual = getDateRange(timeFilter);
    const duracaoEmDias = Math.ceil((periodoAtual.end.getTime() - periodoAtual.start.getTime()) / (1000 * 60 * 60 * 24));
    
    const inicioAnterior = new Date(periodoAtual.start);
    inicioAnterior.setDate(inicioAnterior.getDate() - duracaoEmDias);
    const fimAnterior = new Date(periodoAtual.start);
    fimAnterior.setDate(fimAnterior.getDate() - 1);
    
    const receitasAtual = filteredReceitas.reduce((sum, r) => sum + r.valor, 0);
    const despesasAtual = filteredDespesas.reduce((sum, d) => sum + d.valor, 0);
    
    const receitasAnterior = receitas.filter(r => {
      const data = new Date(r.data);
      return data >= inicioAnterior && data <= fimAnterior;
    }).reduce((sum, r) => sum + r.valor, 0);
    
    const despesasAnterior = despesas.filter(d => {
      const data = new Date(d.data);
      return data >= inicioAnterior && data <= fimAnterior;
    }).reduce((sum, d) => sum + d.valor, 0);

    return [
      { period: 'Período Anterior', receitas: receitasAnterior, despesas: despesasAnterior },
      { period: 'Período Atual', receitas: receitasAtual, despesas: despesasAtual }
    ];
  };

  const handleGerarRelatorio = async () => {
    setIsGenerating(true);
    try {
      // Simular geração do relatório
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Relatório ${selectedReport} gerado com sucesso!`);
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(20);
      doc.text('Relatório Financeiro - Financy', 20, 30);
      
      // Período
      doc.setFontSize(12);
      doc.text(`Período: ${getTimeFilterLabel(timeFilter)}`, 20, 45);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 55);
      
      // Resumo financeiro
      doc.setFontSize(14);
      doc.text('Resumo Financeiro', 20, 75);
      
      doc.setFontSize(10);
      doc.text(`Receitas: R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 90);
      doc.text(`Despesas: R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 100);
      doc.text(`Lucro: R$ ${lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 110);
      doc.text(`Margem: ${margemLucro.toFixed(1)}%`, 20, 120);
      
      const fileName = `relatorio-${timeFilter}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success(`Relatório PDF exportado: ${fileName}`);
    } catch (error) {
      toast.error('Erro ao exportar PDF');
    }
  };

  const handleExportExcel = async () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Aba de resumo
      const resumoData = [
        ['Relatório Financeiro - Financy'],
        [`Período: ${getTimeFilterLabel(timeFilter)}`],
        [`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`],
        [''],
        ['Resumo Financeiro'],
        ['Receitas', `R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Despesas', `R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Lucro Líquido', `R$ ${lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Margem de Lucro', `${margemLucro.toFixed(1)}%`]
      ];
      
      const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData);
      XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo');
      
      // Aba de receitas
      if (filteredReceitas.length > 0) {
        const receitasSheet = XLSX.utils.json_to_sheet(filteredReceitas);
        XLSX.utils.book_append_sheet(workbook, receitasSheet, 'Receitas');
      }
      
      // Aba de despesas
      if (filteredDespesas.length > 0) {
        const despesasSheet = XLSX.utils.json_to_sheet(filteredDespesas);
        XLSX.utils.book_append_sheet(workbook, despesasSheet, 'Despesas');
      }
      
      const fileName = `relatorio-${timeFilter}-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success(`Relatório Excel exportado: ${fileName}`);
    } catch (error) {
      toast.error('Erro ao exportar Excel');
    }
  };

  const dadosRelatorio = gerarDadosRelatorio();

  const gerarInsights = () => {
    const insights = [];

    if (totalReceitas > totalDespesas) {
      const crescimento = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas * 100).toFixed(1) : '0';
      insights.push({
        title: 'Resultado Positivo',
        description: `Receitas superam despesas em ${crescimento}% no período`,
        type: 'positive'
      });
    }

    if (margemLucro > 20) {
      insights.push({
        title: 'Boa Margem de Lucro',
        description: `Margem de lucro está em ${margemLucro.toFixed(1)}%`,
        type: 'positive'
      });
    } else if (margemLucro > 0) {
      insights.push({
        title: 'Margem Baixa',
        description: `Margem de lucro está em ${margemLucro.toFixed(1)}% - considere otimizar custos`,
        type: 'warning'
      });
    }

    if (filteredReceitas.length > 0) {
      const categorias = filteredReceitas.reduce((acc, r) => {
        acc[r.categoria] = (acc[r.categoria] || 0) + r.valor;
        return acc;
      }, {} as Record<string, number>);
      
      const maiorCategoria = Object.entries(categorias).reduce(([prevCat, prevVal], [cat, val]) => 
        val > prevVal ? [cat, val] : [prevCat, prevVal]
      );
      
      const percentual = totalReceitas > 0 ? (maiorCategoria[1] / totalReceitas * 100).toFixed(1) : '0';
      insights.push({
        title: 'Principal Fonte de Receita',
        description: `${maiorCategoria[0]} representa ${percentual}% da receita no período`,
        type: 'info'
      });
    }

    if (insights.length === 0) {
      insights.push({
        title: 'Sem Dados Suficientes',
        description: 'Adicione mais transações para ver insights detalhados',
        type: 'info'
      });
    }

    return insights;
  };

  const insights = gerarInsights();

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'warning': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'info': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  return (
    <section id="relatorios" className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Relatórios</h2>
          <p className="text-muted-foreground">Análises detalhadas do período selecionado</p>
        </div>
        <div className="flex space-x-4">
          <Button variant="outline" className="rounded-xl flex items-center gap-2" onClick={handleExportPDF}>
            <FileText className="h-4 w-4" />
            Baixar PDF ({getTimeFilterLabel(timeFilter)})
          </Button>
          <Button variant="outline" className="rounded-xl flex items-center gap-2" onClick={handleExportExcel}>
            <Download className="h-4 w-4" />
            Baixar Excel ({getTimeFilterLabel(timeFilter)})
          </Button>
        </div>
      </div>

      {/* Controles de Relatório */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Configurar Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Tipo de Relatório" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">Evolução Temporal</SelectItem>
                <SelectItem value="categoria">Por Categoria</SelectItem>
                <SelectItem value="cliente">Por Cliente</SelectItem>
                <SelectItem value="comparativo">Comparativo</SelectItem>
              </SelectContent>
            </Select>
            
            <TimeFilter value={timeFilter} onChange={setTimeFilter} showIcon={false} />
            
            <Button 
              className="rounded-xl" 
              onClick={handleGerarRelatorio}
              disabled={isGenerating}
            >
              {isGenerating ? 'Gerando...' : 'Gerar Relatório'}
            </Button>
            
            <Button variant="outline" className="rounded-xl" onClick={() => {
              setSelectedReport('mensal');
              setTimeFilter('este-mes');
            }}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Insights do Período */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>💡 Insights - {getTimeFilterLabel(timeFilter)}</CardTitle>
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

      {/* Gráfico Principal */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>
            {selectedReport === 'mensal' && 'Evolução Temporal'}
            {selectedReport === 'categoria' && 'Receitas por Categoria'}
            {selectedReport === 'cliente' && 'Receitas por Cliente'}
            {selectedReport === 'comparativo' && 'Análise Comparativa'}
            {' - '}
            {getTimeFilterLabel(timeFilter)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dadosRelatorio.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              {selectedReport === 'categoria' || selectedReport === 'cliente' ? (
                <BarChart data={dadosRelatorio}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={selectedReport === 'categoria' ? 'categoria' : 'cliente'} />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  <Bar dataKey="valor" fill="#22C55E" radius={[8, 8, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={dadosRelatorio}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  <Line type="monotone" dataKey="receitas" stroke="#22C55E" strokeWidth={3} name="Receitas" />
                  <Line type="monotone" dataKey="despesas" stroke="#EF4444" strokeWidth={3} name="Despesas" />
                  {dadosRelatorio[0]?.lucro !== undefined && (
                    <Line type="monotone" dataKey="lucro" stroke="#3B82F6" strokeWidth={3} name="Lucro" />
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[400px]">
              <p className="text-muted-foreground">Nenhum dado disponível para o período selecionado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo Executivo */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>📋 Resumo Executivo - {getTimeFilterLabel(timeFilter)}</CardTitle>
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
