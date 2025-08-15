import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAppContext } from '@/contexts/AppContext';
import { InteligenciaFinanceiraAprimorada } from '@/components/InteligenciaFinanceiraAprimorada';
import { InteligenciaFinanceiraBasica } from '@/components/InteligenciaFinanceiraBasica';
import { UpgradeCard } from '@/components/UpgradeCard';

import { TimeFilter } from '@/components/TimeFilter';
import { TooltipInfo } from '@/components/TooltipInfo';
import { DashboardAvancado } from '@/components/DashboardAvancado';
import { isDateInRange } from '@/utils/dateFilters';
import { Crown, Sparkles } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { FloatingDashboardInfo } from '@/components/FloatingDashboardInfo';

interface DashboardProps {
  setActiveSection?: (section: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

import { useOnboarding } from '@/hooks/useOnboarding';

const Dashboard: React.FC<DashboardProps> = ({ setActiveSection }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [periodo, setPeriodo] = useState('6meses');
  const [timeFilter, setTimeFilter] = useState('este-mes');
  const [isClosingCash, setIsClosingCash] = useState(false);
  const { receitas, despesas, impostos } = useAppContext();
  const { onboardingData } = useOnboarding();
  
  const { isFeatureAvailable } = useFeatureAccess();
  const hasBasicIntelligence = isFeatureAvailable('inteligencia_basica');
  const hasAdvancedIntelligence = isFeatureAvailable('inteligencia_avancada');
  const hasAdvancedDashboard = isFeatureAvailable('dashboard_avancado');

  const handleCloseCash = async () => {
    setIsClosingCash(true);
    setTimeout(() => {
      setIsClosingCash(false);
      setIsDialogOpen(false);
    }, 2000);
  };

  const filteredReceitas = receitas.filter(r => isDateInRange(r.data, timeFilter));
  const filteredDespesas = despesas.filter(d => isDateInRange(d.data, timeFilter));
  const filteredImpostos = impostos.filter(i => isDateInRange(i.vencimento, timeFilter));

  const totalReceitas = filteredReceitas.reduce((sum, r) => sum + r.valor, 0);
  const totalDespesas = filteredDespesas.reduce((sum, d) => sum + d.valor, 0);
  const totalImpostos = filteredImpostos.reduce((sum, i) => sum + i.valor, 0);
  const saldo = totalReceitas - totalDespesas;

  // Dashboard avançado para planos premium
  if (hasAdvancedDashboard) {
    return (
      <section id="painel" className="space-y-6">
        {/* Saudação personalizada */}
        {onboardingData?.nome_preferido && (
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
            <h1 className="text-2xl font-bold text-primary">
              Olá, {onboardingData.nome_preferido}! 👋
            </h1>
            <p className="text-muted-foreground">
              Bem-vindo de volta ao seu painel financeiro.
            </p>
          </div>
        )}

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
      </section>
    );
  }

  // Dashboard básico
  return (
    <section id="painel" className="space-y-6">
      {/* Saudação personalizada */}
      {onboardingData?.nome_preferido && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
          <h1 className="text-2xl font-bold text-primary">
            Olá, {onboardingData.nome_preferido}! 👋
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta ao seu painel financeiro.
          </p>
        </div>
      )}

      <FloatingDashboardInfo
        timeFilter={timeFilter} 
        setTimeFilter={setTimeFilter}
        dashboardType="basic"
      />

      <UpgradeCard
        feature="Dashboard Avançado"
        description="Gráficos interativos, métricas avançadas, análises preditivas e insights personalizados com IA"
        requiredPlan="Premium ou superior"
        onUpgrade={() => setActiveSection?.('assinatura')}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredReceitas.length} transações
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredDespesas.length} transações
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Receitas - Despesas
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Impostos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {totalImpostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredImpostos.length} pendências
            </p>
          </CardContent>
        </Card>
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
    </section>
  );
};

export default Dashboard;