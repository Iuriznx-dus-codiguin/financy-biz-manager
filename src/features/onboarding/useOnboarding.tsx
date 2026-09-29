
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingData } from '@/features/onboarding/tipos';
import type { Json } from '@/integrations/supabase/types';
import { hojeISO, somarMeses } from '@/shared/lib/datas';
import { ehFuncaoAusente, mensagemDeErro } from '@/shared/lib/erros';
import { rpcNova } from '@/shared/lib/rpcNovas';

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

/** Corpo da RPC concluir_onboarding (mesmos campos do formulário). */
function dadosParaRpc(data: OnboardingData): Json {
  return {
    user_type: data.user_type,
    how_did_you_know: data.how_did_you_know ?? null,
    salary_range: data.salary_range ?? null,
    revenue_range: data.revenue_range ?? null,
    nome_preferido: data.nome_preferido ?? null,
    nome_empresa: data.nome_empresa ?? null,
    termos_aceitos: data.termos_aceitos ?? false,
    whatsapp: data.whatsapp || null,
    saldo_conta: data.saldo_conta ?? null,
    saldo_carteira: data.saldo_carteira ?? null,
    dividas_atuais: data.dividas_atuais ?? null,
    receita_mensal: data.receita_mensal ?? null,
    gastos_iniciais: (data.gastos_iniciais ?? []).map((g) => ({
      descricao: g.descricao,
      categoria: g.categoria,
      valor_mensal: g.valor_mensal,
      forma_pagamento: g.forma_pagamento,
    })),
    meta_financeira: data.meta_financeira ?? null,
    valor_meta: data.valor_meta ?? null,
    prazo_meta: data.prazo_meta ?? null,
  };
}

const MESES_DO_PRAZO: Record<string, number> = { '3-meses': 3, '6-meses': 6, '1-ano': 12, '2-anos': 24, '5-anos': 60 };

/** Caminho anterior à migração 20260927120300, usado só se a RPC ainda não existir no banco. */
async function concluirSemRpc(userId: string, data: OnboardingData) {
  const { data: existente } = await supabase
    .from('user_dashboards')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();

  let dashboardId = existente?.id;
  if (!dashboardId) {
    const { data: novo, error } = await supabase
      .from('user_dashboards')
      .insert({
        user_id: userId,
        name: data.user_type === 'empresarial' && data.nome_empresa ? data.nome_empresa : data.nome_preferido || 'Perfil Principal',
        type: data.user_type === 'empresarial' ? 'business' : 'personal',
        is_default: true,
      })
      .select('id')
      .single();
    if (error) throw error;
    dashboardId = novo.id;
  } else if (data.user_type === 'empresarial' && data.nome_empresa) {
    await supabase.from('user_dashboards').update({ name: data.nome_empresa }).eq('id', dashboardId);
  }

  if (data.whatsapp) {
    const { error } = await supabase
      .from('profiles')
      .update({ telefone: data.whatsapp, nome_completo: data.nome_preferido })
      .eq('id', userId);
    if (error) throw new Error(error.code === '23505' ? 'Este número de telefone já está cadastrado' : 'Erro ao salvar telefone');
  }

  const { error: erroOnboarding } = await supabase.from('onboarding_data').upsert({
    user_id: userId,
    user_type: data.user_type,
    how_did_you_know: data.how_did_you_know,
    salary_range: data.salary_range,
    revenue_range: data.revenue_range,
    nome_preferido: data.nome_preferido,
    termos_aceitos: data.termos_aceitos,
    saldo_conta: data.saldo_conta ?? null,
    saldo_carteira: data.saldo_carteira ?? null,
    dividas_atuais: data.dividas_atuais ?? null,
    receita_extra: data.receita_mensal ?? null,
  }, { onConflict: 'user_id' });
  if (erroOnboarding) throw erroOnboarding;

  const hoje = hojeISO();
  if (data.gastos_iniciais?.length) {
    const { error } = await supabase.from('despesas').insert(data.gastos_iniciais.map((gasto) => ({
      user_id: userId,
      dashboard_id: dashboardId,
      data: hoje,
      valor: gasto.valor_mensal,
      descricao: gasto.descricao,
      categoria: gasto.categoria,
      forma_pagamento: gasto.forma_pagamento,
      fornecedor: '',
    })));
    if (error) console.error('Erro ao salvar gastos iniciais:', error);
  }

  if (data.meta_financeira && data.valor_meta) {
    const { error } = await supabase.from('metas').insert({
      user_id: userId,
      dashboard_id: dashboardId,
      titulo: data.meta_financeira,
      categoria: 'Financeira',
      valor_meta: data.valor_meta,
      valor_atual: 0,
      prazo: somarMeses(hoje, MESES_DO_PRAZO[data.prazo_meta ?? ''] ?? 12),
      progresso: 0,
      status: 'em_andamento',
    });
    if (error) console.error('Erro ao salvar meta financeira:', error);
  }
}

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
      // Uma transação no banco (concluir_onboarding): dashboard padrão com o tipo escolhido, telefone,
      // dados do onboarding, gastos iniciais e meta. Antes eram 6 escritas soltas, e falhas de gastos e
      // meta eram ignoradas; com o paywall no banco, só a RPC pode gravá-los antes do pagamento.
      const { error } = await rpcNova('concluir_onboarding', { p_dados: dadosParaRpc(data) });
      if (error) {
        if (!ehFuncaoAusente(error)) {
          throw new Error(mensagemDeErro(error, 'Houve um erro ao salvar. Tente novamente.'));
        }
        await concluirSemRpc(user.id, data);
      }

      setIsOnboardingComplete(true);
      
      // Boas-vindas pelo n8n (novo-usuario-webhook); falha aqui não impede o uso do app.
      const { error: erroBoasVindas } = await supabase.functions.invoke('novo-usuario-webhook', {
        body: { userId: user.id },
      });
      if (erroBoasVindas) console.error('Erro no webhook de boas-vindas:', erroBoasVindas);

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
