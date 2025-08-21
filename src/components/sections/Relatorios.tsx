
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
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

  // Dados para gráfico de rosca dos principais gastos
  const gerarDadosPrincipaisGastos = () => {
    const gastosCategorizados = {
      'Despesas Operacionais': filteredDespesas.reduce((sum, d) => sum + d.valor, 0),
      'Impostos': filteredImpostos.filter(i => i.pago).reduce((sum, i) => sum + i.valor, 0),
      'Equipe': filteredDespesas.filter(d => d.categoria === 'equipe').reduce((sum, d) => sum + d.valor, 0),
      'Fornecedores': filteredDespesas.filter(d => d.categoria === 'fornecedores').reduce((sum, d) => sum + d.valor, 0),
      'Marketing': filteredDespesas.filter(d => d.categoria === 'marketing').reduce((sum, d) => sum + d.valor, 0),
      'Tecnologia': filteredDespesas.filter(d => d.categoria === 'tecnologia').reduce((sum, d) => sum + d.valor, 0),
    };

    return Object.entries(gastosCategorizados)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
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
      case 'categoria':
        return gerarDadosPorCategoria();
      case 'cliente':
        return gerarDadosPorCliente();
      case 'comparativo':
        return gerarDadosComparativos();
      case 'gastos-equipe':
        return gerarDadosGastosEquipe();
      case 'gastos-fornecedor':
        return gerarDadosGastosFornecedor();
      case 'analise-impostos':
        return gerarDadosAnaliseImpostos();
      case 'fluxo-caixa':
        return gerarDadosFluxoCaixa();
      case 'rentabilidade':
        return gerarDadosRentabilidade();
      case 'benchmark':
        return gerarDadosBenchmark();
      default:
        return gerarDadosMensais();
    }
  };

  const gerarDadosGastosEquipe = () => {
    // Aqui assumindo que existe um array membrosEquipe no contexto
    const gastosEquipe = filteredDespesas
      .filter(d => d.categoria === 'equipe')
      .reduce((acc, despesa) => {
        const fornecedor = despesa.fornecedor || 'Membro não especificado';
        acc[fornecedor] = (acc[fornecedor] || 0) + despesa.valor;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(gastosEquipe).map(([membro, valor]) => ({
      membro,
      valor
    }));
  };

  const gerarDadosGastosFornecedor = () => {
    const gastosFornecedor = filteredDespesas
      .filter(d => d.categoria === 'fornecedores')
      .reduce((acc, despesa) => {
        const fornecedor = despesa.fornecedor || 'Fornecedor não especificado';
        acc[fornecedor] = (acc[fornecedor] || 0) + despesa.valor;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(gastosFornecedor).map(([fornecedor, valor]) => ({
      fornecedor,
      valor
    }));
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

  const gerarDadosBenchmark = () => {
    const ticketMedio = filteredReceitas.length > 0 ? totalReceitas / filteredReceitas.length : 0;
    const custoPorReceita = totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 0;
    
    return [
      { 
        metrica: 'Ticket Médio',
        valor: `R$ ${ticketMedio.toFixed(2)}`,
        benchmark: 'R$ 500,00',
        performance: ticketMedio >= 500 ? 'Bom' : 'Melhorar'
      },
      {
        metrica: 'Custo por Receita',
        valor: `${custoPorReceita.toFixed(1)}%`,
        benchmark: '< 70%',
        performance: custoPorReceita < 70 ? 'Bom' : 'Atenção'
      },
      {
        metrica: 'Margem de Lucro',
        valor: `${margemLucro.toFixed(1)}%`,
        benchmark: '> 20%',
        performance: margemLucro > 20 ? 'Excelente' : margemLucro > 10 ? 'Bom' : 'Melhorar'
      }
    ];
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

      {/* Gráfico Principal - Principais Gastos */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>📊 Principais Gastos - {getTimeFilterLabel(timeFilter)}</CardTitle>
        </CardHeader>
        <CardContent>
          {dadosPrincipaisGastos.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dadosPrincipaisGastos}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
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
              
              <div className="space-y-3">
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
        <CardHeader>
          <CardTitle>⚙️ Configurar Relatórios Alternativos</CardTitle>
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
                <SelectItem value="gastos-equipe">Gastos com Equipe</SelectItem>
                <SelectItem value="gastos-fornecedor">Gastos com Fornecedores</SelectItem>
                <SelectItem value="analise-impostos">Análise de Impostos</SelectItem>
                <SelectItem value="fluxo-caixa">Fluxo de Caixa</SelectItem>
                <SelectItem value="rentabilidade">Análise de Rentabilidade</SelectItem>
                <SelectItem value="benchmark">Benchmark de Performance</SelectItem>
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

      {/* Relatório Alternativo Selecionado */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>
            📈 {selectedReport === 'mensal' && 'Evolução Temporal'}
            {selectedReport === 'categoria' && 'Receitas por Categoria'}
            {selectedReport === 'cliente' && 'Receitas por Cliente'}
            {selectedReport === 'comparativo' && 'Análise Comparativa'}
            {selectedReport === 'gastos-equipe' && 'Gastos com Equipe'}
            {selectedReport === 'gastos-fornecedor' && 'Gastos com Fornecedores'}
            {selectedReport === 'analise-impostos' && 'Análise de Impostos'}
            {selectedReport === 'fluxo-caixa' && 'Fluxo de Caixa'}
            {selectedReport === 'rentabilidade' && 'Análise de Rentabilidade'}
            {selectedReport === 'benchmark' && 'Benchmark de Performance'}
            {' - '}
            {getTimeFilterLabel(timeFilter)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dadosRelatorio.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              {selectedReport === 'categoria' || selectedReport === 'cliente' || 
               selectedReport === 'gastos-equipe' || selectedReport === 'gastos-fornecedor' ? (
                <BarChart data={dadosRelatorio}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={
                    selectedReport === 'categoria' ? 'categoria' : 
                    selectedReport === 'cliente' ? 'cliente' :
                    selectedReport === 'gastos-equipe' ? 'membro' : 'fornecedor'
                  } />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  <Bar dataKey="valor" fill="#22C55E" radius={[8, 8, 0, 0]} />
                </BarChart>
              ) : selectedReport === 'fluxo-caixa' ? (
                <LineChart data={dadosRelatorio}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  <Line type="monotone" dataKey="entradas" stroke="#22C55E" strokeWidth={3} name="Entradas" />
                  <Line type="monotone" dataKey="saidas" stroke="#EF4444" strokeWidth={3} name="Saídas" />
                  <Line type="monotone" dataKey="liquido" stroke="#3B82F6" strokeWidth={3} name="Líquido" />
                </LineChart>
              ) : selectedReport === 'benchmark' ? (
                <div className="space-y-4">
                  {dadosRelatorio.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-muted/20 rounded-lg">
                      <div>
                        <p className="font-medium">{item.metrica}</p>
                        <p className="text-sm text-muted-foreground">Benchmark: {item.benchmark}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{item.valor}</p>
                        <p className={`text-sm ${
                          item.performance === 'Excelente' ? 'text-green-600' :
                          item.performance === 'Bom' ? 'text-blue-600' : 'text-orange-600'
                        }`}>
                          {item.performance}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedReport === 'analise-impostos' ? (
                <div className="space-y-2">
                  {dadosRelatorio.map((imposto: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{imposto.tipo}</p>
                        <p className="text-sm text-muted-foreground">Venc: {imposto.vencimento}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">R$ {imposto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className={`text-sm ${imposto.status === 'Pago' ? 'text-green-600' : 'text-red-600'}`}>
                          {imposto.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
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
