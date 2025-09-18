import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileText, Download, TrendingUp, PieChart, BarChart3, Calendar as CalendarIcon } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

interface ReportData {
  tipo: string;
  periodo: string;
  dados: {
    receitas: any[];
    despesas: any[];
    gastos_categoria: Record<string, number>;
  };
  resumo: {
    total_receitas: number;
    total_despesas: number;
    saldo: number;
    categoria_maior_gasto: string;
    tendencia: 'crescimento' | 'declinio' | 'estavel';
  };
}

export const RelatoriosAvancados: React.FC = () => {
  const [tipoRelatorio, setTipoRelatorio] = useState('resumo-mensal');
  const [periodoInicio, setPeriodoInicio] = useState<Date>(startOfMonth(new Date()));
  const [periodoFim, setPeriodoFim] = useState<Date>(endOfMonth(new Date()));
  const [formato, setFormato] = useState('pdf');
  const [isGenerating, setIsGenerating] = useState(false);

  const { receitas, despesas, impostos } = useAppContext();

  const reportData = useMemo((): ReportData => {
    const receitasFiltradas = receitas.filter(r => 
      new Date(r.data) >= periodoInicio && new Date(r.data) <= periodoFim
    );
    
    const despesasFiltradas = despesas.filter(d => 
      new Date(d.data) >= periodoInicio && new Date(d.data) <= periodoFim
    );

    const totalReceitas = receitasFiltradas.reduce((sum, r) => sum + r.valor, 0);
    const totalDespesas = despesasFiltradas.reduce((sum, d) => sum + d.valor, 0);
    
    // Análise por categoria
    const gastosPorCategoria = despesasFiltradas.reduce((acc, despesa) => {
      acc[despesa.categoria] = (acc[despesa.categoria] || 0) + despesa.valor;
      return acc;
    }, {} as Record<string, number>);

    const categoriaMaiorGasto = Object.entries(gastosPorCategoria)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    // Análise de tendência (simplificada)
    const periodoAnterior = {
      inicio: startOfMonth(subMonths(periodoInicio, 1)),
      fim: endOfMonth(subMonths(periodoFim, 1))
    };

    const receitasAnterior = receitas.filter(r => 
      new Date(r.data) >= periodoAnterior.inicio && new Date(r.data) <= periodoAnterior.fim
    ).reduce((sum, r) => sum + r.valor, 0);

    let tendencia: 'crescimento' | 'declinio' | 'estavel' = 'estavel';
    if (totalReceitas > receitasAnterior * 1.05) tendencia = 'crescimento';
    else if (totalReceitas < receitasAnterior * 0.95) tendencia = 'declinio';

    return {
      tipo: tipoRelatorio,
      periodo: `${format(periodoInicio, 'dd/MM/yyyy')} - ${format(periodoFim, 'dd/MM/yyyy')}`,
      dados: {
        receitas: receitasFiltradas,
        despesas: despesasFiltradas,
        gastos_categoria: gastosPorCategoria
      },
      resumo: {
        total_receitas: totalReceitas,
        total_despesas: totalDespesas,
        saldo: totalReceitas - totalDespesas,
        categoria_maior_gasto: categoriaMaiorGasto,
        tendencia
      }
    };
  }, [receitas, despesas, periodoInicio, periodoFim, tipoRelatorio]);

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Relatório Financeiro - Financy', 20, 30);
    
    doc.setFontSize(12);
    doc.text(`Período: ${reportData.periodo}`, 20, 45);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 55);

    // Resumo
    doc.setFontSize(16);
    doc.text('Resumo Executivo', 20, 75);
    
    doc.setFontSize(12);
    doc.text(`Total de Receitas: R$ ${reportData.resumo.total_receitas.toFixed(2)}`, 25, 90);
    doc.text(`Total de Despesas: R$ ${reportData.resumo.total_despesas.toFixed(2)}`, 25, 105);
    doc.text(`Saldo Líquido: R$ ${reportData.resumo.saldo.toFixed(2)}`, 25, 120);
    doc.text(`Maior Categoria de Gastos: ${reportData.resumo.categoria_maior_gasto}`, 25, 135);
    doc.text(`Tendência: ${reportData.resumo.tendencia}`, 25, 150);

    // Detalhes das Receitas
    let yPos = 170;
    doc.setFontSize(14);
    doc.text('Receitas Detalhadas', 20, yPos);
    yPos += 15;

    doc.setFontSize(10);
    reportData.dados.receitas.forEach((receita, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${receita.data} - ${receita.descricao}: R$ ${receita.valor.toFixed(2)}`, 25, yPos);
      yPos += 10;
    });

    // Salvar PDF
    doc.save(`relatorio-financy-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const generateExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Aba de Resumo
    const resumoData = [
      ['Relatório Financeiro - Financy'],
      [''],
      ['Período', reportData.periodo],
      ['Gerado em', format(new Date(), 'dd/MM/yyyy HH:mm')],
      [''],
      ['RESUMO EXECUTIVO'],
      ['Total de Receitas', `R$ ${reportData.resumo.total_receitas.toFixed(2)}`],
      ['Total de Despesas', `R$ ${reportData.resumo.total_despesas.toFixed(2)}`],
      ['Saldo Líquido', `R$ ${reportData.resumo.saldo.toFixed(2)}`],
      ['Maior Categoria de Gastos', reportData.resumo.categoria_maior_gasto],
      ['Tendência', reportData.resumo.tendencia]
    ];

    const resumoWS = XLSX.utils.aoa_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(workbook, resumoWS, 'Resumo');

    // Aba de Receitas
    const receitasData = [
      ['Data', 'Descrição', 'Categoria', 'Valor', 'Cliente'],
      ...reportData.dados.receitas.map(r => [
        r.data,
        r.descricao,
        r.categoria,
        r.valor,
        r.cliente || ''
      ])
    ];

    const receitasWS = XLSX.utils.aoa_to_sheet(receitasData);
    XLSX.utils.book_append_sheet(workbook, receitasWS, 'Receitas');

    // Aba de Despesas
    const despesasData = [
      ['Data', 'Descrição', 'Categoria', 'Valor', 'Fornecedor'],
      ...reportData.dados.despesas.map(d => [
        d.data,
        d.descricao,
        d.categoria,
        d.valor,
        d.fornecedor || ''
      ])
    ];

    const despesasWS = XLSX.utils.aoa_to_sheet(despesasData);
    XLSX.utils.book_append_sheet(workbook, despesasWS, 'Despesas');

    // Salvar Excel
    XLSX.writeFile(workbook, `relatorio-financy-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular processamento
      
      if (formato === 'pdf') {
        generatePDF();
      } else {
        generateExcel();
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getTrendenciaColor = (tendencia: string) => {
    switch (tendencia) {
      case 'crescimento': return 'text-green-600';
      case 'declinio': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  const getTrendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'crescimento': return <TrendingUp className="h-4 w-4" />;
      case 'declinio': return <TrendingUp className="h-4 w-4 rotate-180" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Relatórios Avançados</h2>
        <p className="text-muted-foreground">Análises detalhadas das suas finanças</p>
      </div>

      {/* Configuração do Relatório */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Configurar Relatório
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Relatório</label>
              <Select value={tipoRelatorio} onValueChange={setTipoRelatorio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resumo-mensal">Resumo Mensal</SelectItem>
                  <SelectItem value="fluxo-caixa">Fluxo de Caixa</SelectItem>
                  <SelectItem value="categorias">Análise por Categorias</SelectItem>
                  <SelectItem value="comparativo">Comparativo Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Início</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(periodoInicio, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={periodoInicio}
                    onSelect={(date) => date && setPeriodoInicio(date)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Fim</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(periodoFim, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={periodoFim}
                    onSelect={(date) => date && setPeriodoFim(date)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Formato</label>
              <Select value={formato} onValueChange={setFormato}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full md:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            {isGenerating ? 'Gerando...' : 'Gerar Relatório'}
          </Button>
        </CardContent>
      </Card>

      {/* Preview do Relatório */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Preview - {tipoRelatorio.replace('-', ' ').toUpperCase()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-2xl font-bold text-green-600">
                R$ {reportData.resumo.total_receitas.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">Total de Receitas</p>
            </Card>

            <Card className="p-4">
              <div className="text-2xl font-bold text-red-600">
                R$ {reportData.resumo.total_despesas.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">Total de Despesas</p>
            </Card>

            <Card className="p-4">
              <div className={`text-2xl font-bold ${reportData.resumo.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {reportData.resumo.saldo.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">Saldo Líquido</p>
            </Card>

            <Card className="p-4">
              <div className={`flex items-center gap-2 text-lg font-bold ${getTrendenciaColor(reportData.resumo.tendencia)}`}>
                {getTrendenciaIcon(reportData.resumo.tendencia)}
                {reportData.resumo.tendencia}
              </div>
              <p className="text-sm text-muted-foreground">Tendência</p>
            </Card>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Categoria com Maior Gasto</h4>
              <Badge variant="outline" className="text-sm">
                {reportData.resumo.categoria_maior_gasto}
              </Badge>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Período Analisado</h4>
              <p className="text-sm text-muted-foreground">{reportData.periodo}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};