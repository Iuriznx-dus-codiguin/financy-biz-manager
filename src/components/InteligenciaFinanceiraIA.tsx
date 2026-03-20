import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, AlertTriangle, TrendingUp, Target, RefreshCw, Sparkles, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDashboard } from '@/hooks/useDashboard';
import { useUserContext } from '@/hooks/useUserContext';
import { useToast } from '@/components/ui/use-toast';

interface AIInsight {
  tipo: 'alerta' | 'sucesso' | 'dica' | 'info';
  titulo: string;
  descricao: string;
  acao: string;
}

interface AIInsightsProps {
  timeFilter: string;
}

export const InteligenciaFinanceiraIA: React.FC<AIInsightsProps> = ({ timeFilter }) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentDashboard } = useDashboard();
  const { isPersonalContext } = useUserContext();
  const { toast } = useToast();

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const { data, error: fnError } = await supabase.functions.invoke('ai-financial-insights', {
        body: {
          dashboardId: currentDashboard?.id,
          dashboardType: currentDashboard?.type || 'personal',
          timeFilter,
        },
      });

      if (fnError) {
        const msg = fnError.message || '';
        if (msg.includes('429')) {
          setError('Limite de requisições atingido. Tente novamente em instantes.');
        } else if (msg.includes('402')) {
          setError('Créditos de IA esgotados.');
        } else {
          throw fnError;
        }
        return;
      }

      setInsights(data?.insights || []);
      setHasLoaded(true);
    } catch (e: any) {
      console.error('Error fetching AI insights:', e);
      setError('Não foi possível gerar insights. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [currentDashboard, timeFilter]);

  // Auto-load on mount and when timeFilter changes
  useEffect(() => {
    if (currentDashboard?.id) {
      fetchInsights();
    }
  }, [currentDashboard?.id, timeFilter]);

  const getIconByType = (tipo: string) => {
    switch (tipo) {
      case 'alerta': return AlertTriangle;
      case 'sucesso': return TrendingUp;
      case 'dica': return Lightbulb;
      case 'info': return Info;
      default: return Sparkles;
    }
  };

  const getColorByType = (tipo: string) => {
    switch (tipo) {
      case 'alerta': return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'sucesso': return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'dica': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
      case 'info': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default: return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
    }
  };

  const getBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'alerta': return 'destructive';
      case 'sucesso': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            {isPersonalContext ? 'Inteligência Financeira' : 'Inteligência Financeira Avançada'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              IA
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchInsights}
              disabled={loading}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading && !hasLoaded ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">Analisando seus dados financeiros...</p>
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="ghost" size="sm" onClick={fetchInsights} className="mt-2">
              Tentar novamente
            </Button>
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-6">
            <Lightbulb className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Adicione transações para receber insights personalizados.
            </p>
          </div>
        ) : (
          <>
            {loading && hasLoaded && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Atualizando insights...
              </div>
            )}
            {insights.map((insight, index) => {
              const IconComponent = getIconByType(insight.tipo);
              return (
                <div key={index} className={`p-3.5 rounded-xl border ${getColorByType(insight.tipo)} transition-all`}>
                  <div className="flex items-start gap-3">
                    <IconComponent className="h-5 w-5 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{insight.titulo}</h4>
                        <Badge variant={getBadgeVariant(insight.tipo) as any} className="text-[9px] px-1.5 py-0">
                          {insight.tipo === 'alerta' ? 'Atenção' : insight.tipo === 'sucesso' ? 'Positivo' : insight.tipo === 'dica' ? 'Dica' : 'Info'}
                        </Badge>
                      </div>
                      <p className="text-xs opacity-90 mb-2 leading-relaxed">{insight.descricao}</p>
                      <div className="bg-background/50 p-2 rounded-lg">
                        <p className="text-[10px] font-medium uppercase tracking-wide opacity-70 mb-0.5">Ação Recomendada</p>
                        <p className="text-xs">{insight.acao}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
};
