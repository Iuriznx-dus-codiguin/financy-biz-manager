
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingData } from '@/types/onboarding';

interface OnboardingContextType {
  isOnboardingComplete: boolean;
  completeOnboarding: (data: OnboardingData) => Promise<void>;
  loading: boolean;
  onboardingData: OnboardingData | null;
  refetchOnboardingData: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Provide default values to prevent context errors
const defaultContextValue: OnboardingContextType = {
  isOnboardingComplete: false,
  completeOnboarding: async () => {},
  loading: true,
  onboardingData: null,
  refetchOnboardingData: async () => {}
};

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!user) {
      setLoading(false);
      setIsOnboardingComplete(false); // Força onboarding se não tem usuário
      return;
    }

    try {
      const { data, error } = await supabase
        .from('onboarding_data')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar onboarding:', error);
      }

      // Se existe dados de onboarding, considera como completo
      setIsOnboardingComplete(!!data);
      setOnboardingData(data ? { ...data, whatsapp: '' } : null);
    } catch (error) {
      console.error('Erro ao verificar onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async (data: OnboardingData) => {
    if (!user) return;

    try {
      // 1. Obter ou criar dashboard principal
      const { data: existingDashboards } = await supabase
        .from('user_dashboards')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();

      let mainDashboardId = existingDashboards?.id;

      if (!mainDashboardId) {
        // Criar dashboard principal com nome apropriado
        const dashboardName = data.user_type === 'empresarial' && data.nome_empresa
          ? data.nome_empresa
          : data.nome_preferido || 'Perfil Principal';
        
        const dashboardType = data.user_type === 'empresarial' ? 'business' : 'personal';

        const { data: newDashboard, error: dashboardError } = await supabase
          .from('user_dashboards')
          .insert({
            user_id: user.id,
            name: dashboardName,
            type: dashboardType,
            is_default: true
          })
          .select()
          .single();

        if (dashboardError) throw dashboardError;
        mainDashboardId = newDashboard.id;
      } else if (data.user_type === 'empresarial' && data.nome_empresa) {
        // Atualizar nome do dashboard existente se for empresa
        await supabase
          .from('user_dashboards')
          .update({ name: data.nome_empresa })
          .eq('id', mainDashboardId);
      }

      // 2. Atualizar o perfil com o telefone se fornecido
      if (data.whatsapp) {
        // Verificar se o telefone já está cadastrado em outra conta
        const { data: existingPhone, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('telefone', data.whatsapp)
          .neq('id', user.id)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Erro ao verificar telefone:', checkError);
          throw new Error('Erro ao verificar telefone');
        }

        if (existingPhone) {
          throw new Error('Este número de telefone já está cadastrado em outra conta');
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            telefone: data.whatsapp,
            nome_completo: data.nome_preferido
          })
          .eq('id', user.id);

        if (profileError) {
          console.error('Erro ao salvar telefone no perfil:', profileError);
          
          // Verificar se é erro de constraint de unicidade
          if (profileError.code === '23505') {
            throw new Error('Este número de telefone já está cadastrado');
          }
          
          throw new Error('Erro ao salvar telefone');
        }
      }

      // 3. Salvar dados de onboarding (usar upsert para evitar duplicatas)
      const { error: onboardingError } = await supabase
        .from('onboarding_data')
        .upsert({
          user_id: user.id,
          user_type: data.user_type,
          how_did_you_know: data.how_did_you_know,
          salary_range: data.salary_range,
          revenue_range: data.revenue_range,
          nome_preferido: data.nome_preferido,
          termos_aceitos: data.termos_aceitos
        }, {
          onConflict: 'user_id'
        });

      if (onboardingError) {
        console.error('Erro ao salvar dados de onboarding:', onboardingError);
        throw onboardingError;
      }

      // 4. Salvar gastos iniciais como despesas (com dashboard_id)
      if (data.gastos_iniciais && data.gastos_iniciais.length > 0) {
        const despesas = data.gastos_iniciais.map(gasto => ({
          user_id: user.id,
          dashboard_id: mainDashboardId,
          data: new Date().toISOString().split('T')[0],
          valor: gasto.valor_mensal,
          descricao: gasto.descricao,
          categoria: gasto.categoria,
          forma_pagamento: gasto.forma_pagamento,
          fornecedor: ''
        }));

        const { error: despesasError } = await supabase
          .from('despesas')
          .insert(despesas);

        if (despesasError) {
          console.error('Erro ao salvar gastos iniciais:', despesasError);
        }
      }

      // 5. Salvar meta financeira (com dashboard_id)
      if (data.meta_financeira && data.valor_meta) {
        const prazoDate = new Date();
        switch (data.prazo_meta) {
          case '3-meses':
            prazoDate.setMonth(prazoDate.getMonth() + 3);
            break;
          case '6-meses':
            prazoDate.setMonth(prazoDate.getMonth() + 6);
            break;
          case '1-ano':
            prazoDate.setFullYear(prazoDate.getFullYear() + 1);
            break;
          case '2-anos':
            prazoDate.setFullYear(prazoDate.getFullYear() + 2);
            break;
          case '5-anos':
            prazoDate.setFullYear(prazoDate.getFullYear() + 5);
            break;
          default:
            prazoDate.setMonth(prazoDate.getMonth() + 12);
        }

        const { error: metaError } = await supabase
          .from('metas')
          .insert({
            user_id: user.id,
            dashboard_id: mainDashboardId,
            titulo: data.meta_financeira,
            categoria: 'Financeira',
            valor_meta: data.valor_meta,
            valor_atual: 0,
            prazo: prazoDate.toISOString().split('T')[0],
            progresso: 0,
            status: 'em_andamento'
          });

        if (metaError) {
          console.error('Erro ao salvar meta financeira:', metaError);
        }
      }

      setIsOnboardingComplete(true);
      
      // Recarregar dados de onboarding após completar
      await checkOnboardingStatus();
    } catch (error) {
      console.error('Erro ao completar onboarding:', error);
      throw error;
    }
  };

  return (
    <OnboardingContext.Provider value={{ 
      isOnboardingComplete, 
      completeOnboarding, 
      loading,
      onboardingData,
      refetchOnboardingData: checkOnboardingStatus
    }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    console.error('useOnboarding called outside OnboardingProvider - returning default values');
    return defaultContextValue;
  }
  return context;
};
