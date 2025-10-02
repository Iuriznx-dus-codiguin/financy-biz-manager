import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAppContext } from '@/contexts/AppContext';
import { InteligenciaFinanceiraAprimorada } from '@/components/InteligenciaFinanceiraAprimorada';
import { InteligenciaFinanceiraBasica } from '@/components/InteligenciaFinanceiraBasica';
import { UpgradeCard } from '@/components/UpgradeCard';
import { OptimizedMetricCard } from '@/components/OptimizedMetricCard';
import { useFinancialCalculations } from '@/hooks/useFinancialCalculations';

import { TimeFilter } from '@/components/TimeFilter';
import { TooltipInfo } from '@/components/TooltipInfo';
import { DashboardAvancado } from '@/components/DashboardAvancado';
import { isDateInRange } from '@/utils/dateFilters';
import { Crown, Sparkles } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { FloatingDashboardInfo } from '@/components/FloatingDashboardInfo';
import { useSectionTutorialTrigger } from '@/hooks/useSectionTutorialTrigger';
import { SectionTutorial } from '@/components/tutorials/SectionTutorial';

interface DashboardProps {
  setActiveSection?: (section: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

import { useOnboarding } from '@/hooks/useOnboarding';
import { useDashboard } from '@/hooks/useDashboard';
import { RecurringTransactions } from '@/components/RecurringTransactions';

const Dashboard: React.FC<DashboardProps> = ({ setActiveSection }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [periodo, setPeriodo] = useState('6meses');
  const [timeFilter, setTimeFilter] = useState('este-mes');
  const [isClosingCash, setIsClosingCash] = useState(false);
  const { receitas, despesas, impostos } = useAppContext();
  const { onboardingData } = useOnboarding();
  const { showTutorial, closeTutorial } = useSectionTutorialTrigger('painel');
  const { currentDashboard } = useDashboard();
  
  const { isFeatureAvailable } = useFeatureAccess();
  const hasBasicIntelligence = isFeatureAvailable('inteligencia_basica');
  const hasAdvancedIntelligence = isFeatureAvailable('inteligencia_avancada');
  const hasAdvancedDashboard = isFeatureAvailable('dashboard_avancado');
  
  // Usar cálculos otimizados
  const financialData = useMemo(() => ({ receitas, despesas, impostos }), [receitas, despesas, impostos]);
  const { 
    totalReceitas, 
    totalDespesas, 
    totalImpostos, 
    totalTaxas, 
    saldo 
  } = useFinancialCalculations(financialData, timeFilter);

  // Dados filtrados para componentes
  const filteredData = useMemo(() => {
    return {
      receitas: receitas.filter(r => isDateInRange(r.data, timeFilter)),
      despesas: despesas.filter(d => isDateInRange(d.data, timeFilter)),
      impostos: impostos.filter(i => isDateInRange(i.vencimento, timeFilter))
    };
  }, [receitas, despesas, impostos, timeFilter]);

  const { receitas: filteredReceitas, despesas: filteredDespesas, impostos: filteredImpostos } = filteredData;

  const handleCloseCash = async () => {
    setIsClosingCash(true);
    setTimeout(() => {
      setIsClosingCash(false);
      setIsDialogOpen(false);
    }, 2000);
  };

  // Dashboard avançado para planos premium
  if (hasAdvancedDashboard) {
    return (
      <section id="painel" className="space-y-6">
        <SectionTutorial 
          section="painel"
          isOpen={showTutorial}
          onClose={(completed) => closeTutorial(completed)}
        />

        <FloatingDashboardInfo
          timeFilter={timeFilter} 
          setTimeFilter={setTimeFilter}
          dashboardType="advanced"
        />

        <DashboardAvancado timeFilter={timeFilter} setTimeFilter={setTimeFilter} />

        {hasAdvancedIntelligence ? (
          <InteligenciaFinanceiraAprimorada
            receitas={filteredReceitas}
            despesas={filteredDespesas}
            impostos={filteredImpostos}
          />
        ) : hasBasicIntelligence ? (
          <InteligenciaFinanceiraBasica
            receitas={filteredReceitas}
            despesas={filteredDespesas}
            impostos={filteredImpostos}
          />
        ) : (
          <UpgradeCard
            feature="Inteligência Financeira"
            description="Análises básicas de suas finanças com insights relevantes"
            requiredPlan="Plano gratuito"
            onUpgrade={() => setActiveSection?.('assinatura')}
          />
        )}

        <RecurringTransactions />
      </section>
    );
  }

  // Dashboard básico
  return (
    <section id="painel" className="space-y-6">
      <FloatingDashboardInfo
        timeFilter={timeFilter} 
        setTimeFilter={setTimeFilter}
        dashboardType="basic"
      />

      <UpgradeCard
        feature="Dashboard Avançado"
        description="Gráficos interativos, métricas avançadas e insights com IA"
        requiredPlan="Premium ou superior"
        onUpgrade={() => setActiveSection?.('assinatura')}
        dismissible={true}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <OptimizedMetricCard
          title="Total de Receitas"
          value={`R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle={`${filteredReceitas.length} transações`}
          valueClassName="text-2xl font-bold text-green-600"
        />

        <OptimizedMetricCard
          title="Total de Despesas"
          value={`R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle={`${filteredDespesas.length} transações`}
          valueClassName="text-2xl font-bold text-red-600"
        />

        <OptimizedMetricCard
          title="Saldo"
          value={`R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Receitas - Despesas"
          valueClassName={`text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}
        />

        <OptimizedMetricCard
          title="Total de Impostos"
          value={`R$ ${totalImpostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle={`${filteredImpostos.filter(i => i.tipo === 'imposto').length} impostos`}
          valueClassName="text-2xl font-bold text-blue-600"
        />

        <OptimizedMetricCard
          title="Total de Taxas"
          value={`R$ ${totalTaxas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle={`${filteredImpostos.filter(i => i.tipo === 'taxa').length} taxas`}
          valueClassName="text-2xl font-bold text-orange-600"
        />
      </div>

      {hasAdvancedIntelligence ? (
        <InteligenciaFinanceiraAprimorada
          receitas={filteredReceitas}
          despesas={filteredDespesas}
          impostos={filteredImpostos}
        />
      ) : hasBasicIntelligence ? (
        <InteligenciaFinanceiraBasica
          receitas={filteredReceitas}
          despesas={filteredDespesas}
          impostos={filteredImpostos}
        />
      ) : (
        <UpgradeCard
          feature="Inteligência Financeira"
          description="Análises básicas de suas finanças com insights relevantes"
          requiredPlan="Plano gratuito"
          onUpgrade={() => setActiveSection?.('assinatura')}
        />
      )}

      <RecurringTransactions />
    </section>
  );
};

export default Dashboard;