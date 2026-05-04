
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useAppContext } from '@/contexts/AppContext';
import { TimeFilter } from '@/components/TimeFilter';
import { isDateInRange, getDateRange } from '@/utils/dateFilters';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { downloadXlsx, SheetSpec } from '@/utils/excelExport';
import { FileText, Download } from 'lucide-react';
import { useSectionTutorialTrigger } from '@/hooks/useSectionTutorialTrigger';
import { SectionTutorial } from '@/components/tutorials/SectionTutorial';

  const Relatorios = () => {
  const [selectedReport, setSelectedReport] = useState('mensal');
  const [timeFilter, setTimeFilter] = useState('este-mes');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportKey, setReportKey] = useState(0); // Para forçar atualização
  const { receitas, despesas, impostos } = useAppContext();
  const { showTutorial, closeTutorial } = useSectionTutorialTrigger('relatorios');

  // Filtrar dados baseado no filtro de tempo
  const filteredReceitas = receitas.filter(r => isDateInRange(r.data, timeFilter));
  const filteredDespesas = despesas.filter(d => isDateInRange(d.data, timeFilter));
  const filteredImpostos = impostos.filter(i => isDateInRange(i.vencimento, timeFilter));

  // Calcular dados reais baseados no filtro, incluindo TODOS os gastos
  const totalReceitas = filteredReceitas.reduce((sum, r) => sum + r.valor, 0);
  const totalDespesas = filteredDespesas.reduce((sum, d) => sum + d.valor, 0);
  const totalImpostosPagos = filteredImpostos.filter(i => i.pago).reduce((sum, i) => sum + i.valor, 0);
  const totalTaxasPagas = filteredImpostos.filter(i => i.pago && i.tipo === 'taxa').reduce((sum, i) => sum + i.valor, 0);
  
  // Calcular gastos operacionais totais
  const totalGastosOperacionais = totalDespesas + totalImpostosPagos + totalTaxasPagas;
  const lucroLiquido = totalReceitas - totalGastosOperacionais;
  const margemLucro = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;

  // Dados para gráfico de rosca dos principais gastos - Adaptado para usuários pessoais
  const gerarDadosPrincipaisGastos = () => {
    const gastosCategorizados: Record<string, number> = {};
    
    // Agrupar despesas por categoria
    filteredDespesas.forEach(d => {
      const categoria = d.categoria || 'Outros';
      gastosCategorizados[categoria] = (gastosCategorizados[categoria] || 0) + d.valor;
    });
    
    // Adicionar impostos E taxas pagos como categorias separadas
    const totalImpostosPagosCalc = filteredImpostos.filter(i => i.pago && i.tipo === 'imposto').reduce((sum, i) => sum + i.valor, 0);
    const totalTaxasPagasCalc = filteredImpostos.filter(i => i.pago && i.tipo === 'taxa').reduce((sum, i) => sum + i.valor, 0);
    
    if (totalImpostosPagosCalc > 0) {
      gastosCategorizados['Impostos'] = totalImpostosPagosCalc;
    }
    if (totalTaxasPagasCalc > 0) {
      gastosCategorizados['Taxas'] = totalTaxasPagasCalc;
    }

    return Object.entries(gastosCategorizados)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categorias
  };

  const dadosPrincipaisGastos = gerarDadosPrincipaisGastos();
  
  // Cores para o gráfico de rosca
  const CORES_GASTOS = [
    '#EF4444', // Vermelho
    '#F97316', // Laranja  
    '#EAB308', // Amarelo
    '#22C55E', // Verde
    '#3B82F6', // Azul
    '#8B5CF6', // Roxo
    '#EC4899', // Rosa
    '#6B7280'  // Cinza
  ];

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
      case 'categoria-receitas':
        return gerarDadosPorCategoria();
      case 'categoria-despesas':
        return gerarDadosPorCategoriaDespesas();
      case 'comparativo':
        return gerarDadosComparativos();
      case 'analise-impostos':
        return gerarDadosAnaliseImpostos();
      case 'fluxo-caixa':
        return gerarDadosFluxoCaixa();
      case 'economia':
        return gerarDadosEconomia();
      default:
        return gerarDadosMensais();
    }
  };

  const gerarDadosPorCategoriaDespesas = () => {
    const categorias = filteredDespesas.reduce((acc, despesa) => {
      const categoria = despesa.categoria || 'Outros';
      acc[categoria] = (acc[categoria] || 0) + despesa.valor;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categorias)
      .map(([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor);
  };

  const gerarDadosEconomia = () => {
    // Calcular quanto foi economizado comparado ao mês anterior
    const mesAtual = new Date();
    const mesAnterior = new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1);
    
    const despesasMesAtual = despesas.filter(d => {
      const data = new Date(d.data);
      return data.getMonth() === mesAtual.getMonth() && data.getFullYear() === mesAtual.getFullYear();
    }).reduce((sum, d) => sum + d.valor, 0);
    
    const despesasMesAnterior = despesas.filter(d => {
      const data = new Date(d.data);
      return data.getMonth() === mesAnterior.getMonth() && data.getFullYear() === mesAnterior.getFullYear();
    }).reduce((sum, d) => sum + d.valor, 0);
    
    const economia = despesasMesAnterior - despesasMesAtual;
    const percentualEconomia = despesasMesAnterior > 0 ? (economia / despesasMesAnterior) * 100 : 0;
    
    return [{
      periodo: 'Mês Anterior',
      despesas: despesasMesAnterior
    }, {
      periodo: 'Mês Atual',
      despesas: despesasMesAtual
    }];
  };

  const gerarDadosAnaliseImpostos = () => {
    return filteredImpostos.map(imposto => ({
      tipo: imposto.tipo,
      valor: imposto.valor,
      status: imposto.pago ? 'Pago' : 'Pendente',
      vencimento: imposto.vencimento
    }));
  };

  const gerarDadosFluxoCaixa = () => {
    const fluxoPorMes = [];
    const agora = new Date();
    
    for (let i = 0; i < 6; i++) {
      const mes = new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1);
      const mesStr = mes.getMonth() + 1;
      const anoStr = mes.getFullYear();
      
      const entradas = receitas.filter(r => {
        const dataReceita = new Date(r.data);
        return dataReceita.getMonth() + 1 === mesStr && dataReceita.getFullYear() === anoStr;
      }).reduce((sum, r) => sum + r.valor, 0);
      
      const saidas = despesas.filter(d => {
        const dataDespesa = new Date(d.data);
        return dataDespesa.getMonth() + 1 === mesStr && dataDespesa.getFullYear() === anoStr;
      }).reduce((sum, d) => sum + d.valor, 0);
      
      fluxoPorMes.push({
        mes: mes.toLocaleDateString('pt-BR', { month: 'short' }),
        entradas,
        saidas,
        liquido: entradas - saidas
      });
    }
    
    return fluxoPorMes;
  };

  const gerarDadosRentabilidade = () => {
    const categorias = filteredReceitas.reduce((acc, receita) => {
      acc[receita.categoria] = (acc[receita.categoria] || 0) + receita.valor;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categorias).map(([categoria, valor]) => ({
      categoria,
      receita: valor,
      margem: totalReceitas > 0 ? ((valor / totalReceitas) * 100).toFixed(1) : '0'
    }));
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
      // Forçar re-cálculo dos dados do relatório
      setReportKey(prev => prev + 1);
      
      // Pequeno delay para feedback visual
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const reportNames: Record<string, string> = {
        'mensal': 'Evolução no Tempo',
        'categoria-receitas': 'Receitas por Categoria',
        'categoria-despesas': 'Despesas por Categoria',
        'comparativo': 'Análise Comparativa',
        'analise-impostos': 'Impostos e Taxas',
        'fluxo-caixa': 'Fluxo de Caixa',
        'economia': 'Análise de Economia'
      };
      
      toast.success(`Relatório atualizado!`, {
        description: `${reportNames[selectedReport] || selectedReport} - ${getTimeFilterLabel(timeFilter)}`
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
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
      const resumoData = [
        ['Relatório Financeiro - Financy'],
        [`Período: ${getTimeFilterLabel(timeFilter)}`],
        [`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`],
        [''],
        ['Resumo Financeiro'],
        ['Receitas', `R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Despesas', `R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Lucro Líquido', `R$ ${lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Margem de Lucro', `${margemLucro.toFixed(1)}%`],
      ];

      const sheets: SheetSpec[] = [{ name: 'Resumo', aoa: resumoData }];
      if (filteredReceitas.length > 0) sheets.push({ name: 'Receitas', json: filteredReceitas as any });
      if (filteredDespesas.length > 0) sheets.push({ name: 'Despesas', json: filteredDespesas as any });

      const fileName = `relatorio-${timeFilter}-${new Date().toISOString().split('T')[0]}.xlsx`;
      await downloadXlsx(fileName, sheets);
      toast.success(`Relatório Excel exportado: ${fileName}`);
    } catch (error) {
      toast.error('Erro ao exportar Excel');
    }
  };

  // Usar useMemo para recalcular dados quando filtros mudam
  const dadosRelatorio = useMemo(() => {
    return gerarDadosRelatorio();
  }, [selectedReport, timeFilter, reportKey, receitas, despesas, impostos]);

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
        title: 'Principal Fonte de Renda',
        description: `${maiorCategoria[0]} representa ${percentual}% da sua renda no período`,
        type: 'info'
      });
    }

    // Insight sobre maior categoria de despesa
    if (filteredDespesas.length > 0) {
      const categoriasDespesas = filteredDespesas.reduce((acc, d) => {
        const cat = d.categoria || 'Outros';
        acc[cat] = (acc[cat] || 0) + d.valor;
        return acc;
      }, {} as Record<string, number>);
      
      const maiorDespesa = Object.entries(categoriasDespesas).reduce(([prevCat, prevVal], [cat, val]) => 
        val > prevVal ? [cat, val] : [prevCat, prevVal]
      );
      
      const percentualDespesa = totalDespesas > 0 ? (maiorDespesa[1] / totalDespesas * 100).toFixed(1) : '0';
      insights.push({
        title: 'Maior Gasto',
        description: `${percentualDespesa}% dos seus gastos estão em ${maiorDespesa[0]}`,
        type: 'warning'
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
      case 'positive': return 'bg-success/10 border-success/30';
      case 'warning': return 'bg-warning/10 border-warning/30';
      case 'info': return 'bg-primary/10 border-primary/30';
      default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  return (
    <section id="relatorios" className="space-y-8">
      <SectionTutorial 
        section="relatorios"
        isOpen={showTutorial}
        onClose={(completed) => closeTutorial(completed)}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">📊 Relatórios Financeiros</h2>
          <p className="text-muted-foreground mt-1">Visualize e analise suas finanças pessoais</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-xl flex items-center gap-2" onClick={handleExportPDF}>
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar PDF</span>
          </Button>
          <Button variant="outline" className="rounded-xl flex items-center gap-2" onClick={handleExportExcel}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>
        </div>
      </div>

      {/* Resumo Executivo - Movido para o topo */}
      <Card className="rounded-2xl shadow-sm border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            💰 Resumo do Período
            <span className="text-sm font-normal text-muted-foreground">({getTimeFilterLabel(timeFilter)})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-primary/30/50 dark:border-blue-800/50">
              <p className="text-xs text-muted-foreground mb-1">💵 Total de Receitas</p>
              <p className="text-xl md:text-2xl font-bold text-primary">
                R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl border border-destructive/30/50 dark:border-red-800/50">
              <p className="text-xs text-muted-foreground mb-1">💸 Total de Despesas</p>
              <p className="text-xl md:text-2xl font-bold text-destructive">
                R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-success/30/50 dark:border-green-800/50">
              <p className="text-xs text-muted-foreground mb-1">💰 Saldo do Período</p>
              <p className={`text-xl md:text-2xl font-bold ${lucroLiquido >= 0 ? 'text-success' : 'text-destructive'}`}>
                R$ {lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200/50 dark:border-purple-800/50">
              <p className="text-xs text-muted-foreground mb-1">📊 Taxa de Economia</p>
              <p className={`text-xl md:text-2xl font-bold ${margemLucro >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-destructive'}`}>
                {margemLucro.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico Principal - Principais Gastos */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            🎯 Distribuição de Gastos por Categoria
          </CardTitle>
          <p className="text-sm text-muted-foreground">Veja onde seu dinheiro está sendo gasto</p>
        </CardHeader>
        <CardContent>
          {dadosPrincipaisGastos.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                  <PieChart>
                    <Pie
                      data={dadosPrincipaisGastos}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {dadosPrincipaisGastos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CORES_GASTOS[index % CORES_GASTOS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                <h3 className="font-semibold text-lg mb-4">Legenda</h3>
                {dadosPrincipaisGastos.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: CORES_GASTOS[index % CORES_GASTOS.length] }}
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-muted-foreground">
                        {dadosPrincipaisGastos.reduce((sum, g) => sum + g.value, 0) > 0 
                          ? ((item.value / dadosPrincipaisGastos.reduce((sum, g) => sum + g.value, 0)) * 100).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-muted-foreground">Nenhum gasto registrado no período selecionado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controles de Relatório */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            📈 Análises Detalhadas
          </CardTitle>
          <p className="text-sm text-muted-foreground">Escolha o tipo de análise e período</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Tipo de Relatório" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">📅 Evolução no Tempo</SelectItem>
                <SelectItem value="categoria-receitas">💵 Receitas por Categoria</SelectItem>
                <SelectItem value="categoria-despesas">💸 Despesas por Categoria</SelectItem>
                <SelectItem value="comparativo">⚖️ Comparativo de Períodos</SelectItem>
                <SelectItem value="analise-impostos">🏛️ Impostos e Taxas</SelectItem>
                <SelectItem value="fluxo-caixa">💰 Fluxo de Caixa</SelectItem>
                <SelectItem value="economia">🎯 Análise de Economia</SelectItem>
              </SelectContent>
            </Select>
            
            <TimeFilter value={timeFilter} onChange={setTimeFilter} showIcon={false} />
            
            <Button 
              className="rounded-xl" 
              onClick={handleGerarRelatorio}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Atualizando...
                </>
              ) : (
                '✨ Atualizar Relatório'
              )}
            </Button>
            
            <Button variant="outline" className="rounded-xl" onClick={() => {
              setSelectedReport('mensal');
              setTimeFilter('este-mes');
            }}>
              🔄 Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Insights do Período */}
      <Card className="rounded-2xl shadow-sm border-amber-200/50 dark:border-amber-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            💡 Insights Personalizados
          </CardTitle>
          <p className="text-sm text-muted-foreground">Análises inteligentes das suas finanças</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((insight, index) => (
              <div 
                key={index} 
                className={`p-5 rounded-xl border-2 ${getInsightColor(insight.type)} transition-all hover:shadow-md`}
              >
                <h4 className="font-bold mb-2 text-base">{insight.title}</h4>
                <p className="text-sm leading-relaxed">{insight.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Relatório Alternativo Selecionado */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            {selectedReport === 'mensal' && '📅 Evolução no Tempo'}
            {selectedReport === 'categoria-receitas' && '💵 Receitas por Categoria'}
            {selectedReport === 'categoria-despesas' && '💸 Despesas por Categoria'}
            {selectedReport === 'comparativo' && '⚖️ Análise Comparativa'}
            {selectedReport === 'analise-impostos' && '🏛️ Impostos e Taxas'}
            {selectedReport === 'fluxo-caixa' && '💰 Fluxo de Caixa'}
            {selectedReport === 'economia' && '🎯 Análise de Economia'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{getTimeFilterLabel(timeFilter)}</p>
        </CardHeader>
        <CardContent>
          {dadosRelatorio.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              {selectedReport === 'categoria-receitas' || selectedReport === 'categoria-despesas' ? (
                <BarChart data={dadosRelatorio}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis 
                    dataKey="categoria"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    contentStyle={{ borderRadius: '8px' }}
                  />
                  <Bar 
                    dataKey="valor" 
                    fill={selectedReport === 'categoria-receitas' ? '#22C55E' : '#EF4444'} 
                    radius={[8, 8, 0, 0]} 
                  />
                </BarChart>
              ) : selectedReport === 'economia' ? (
                <BarChart data={dadosRelatorio}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="periodo" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  <Bar dataKey="despesas" fill="#EF4444" radius={[8, 8, 0, 0]} name="Despesas" />
                </BarChart>
              ) : selectedReport === 'fluxo-caixa' ? (
                <LineChart data={dadosRelatorio}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    contentStyle={{ borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="entradas" stroke="#22C55E" strokeWidth={3} name="Entradas" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="saidas" stroke="#EF4444" strokeWidth={3} name="Saídas" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="liquido" stroke="#3B82F6" strokeWidth={3} name="Saldo" dot={{ r: 4 }} />
                </LineChart>
              ) : selectedReport === 'analise-impostos' ? (
                <div className="space-y-3">
                  {dadosRelatorio.map((imposto: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-4 border-2 rounded-xl hover:shadow-md transition-all">
                      <div className="flex-1">
                        <p className="font-bold text-base">{imposto.tipo}</p>
                        <p className="text-sm text-muted-foreground mt-1">📅 Vencimento: {new Date(imposto.vencimento).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">R$ {imposto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className={`text-sm font-semibold mt-1 ${imposto.status === 'Pago' ? 'text-success' : 'text-warning'}`}>
                          {imposto.status === 'Pago' ? '✅ Pago' : '⏰ Pendente'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <LineChart data={dadosRelatorio}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    contentStyle={{ borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="receitas" stroke="#22C55E" strokeWidth={3} name="Receitas" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="despesas" stroke="#EF4444" strokeWidth={3} name="Despesas" dot={{ r: 4 }} />
                  {dadosRelatorio[0]?.lucro !== undefined && (
                    <Line type="monotone" dataKey="lucro" stroke="#3B82F6" strokeWidth={3} name="Saldo" dot={{ r: 4 }} />
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <p className="text-muted-foreground text-lg">📊 Nenhum dado disponível</p>
              <p className="text-muted-foreground text-sm mt-2">Adicione transações para visualizar os relatórios</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default Relatorios;
