// Hook único de assinatura: situação, plano do catálogo, recursos e limites.
// Substitui useSubscription, useUserSubscription, useFeatureAccess e subscriptionHelpers, que aplicavam
// regras diferentes entre si (AUDITORIA A-05, A-08).
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';
import {
  assinaturaAtiva,
  ehDesenvolvedor,
  limiteDeDashboards,
  type LinhaAssinante,
  nomeComercial,
  type Plano,
  planoDaAssinatura,
  type Recurso,
  situacaoAssinatura,
  type SituacaoAssinatura,
  temRecurso,
} from './regras';

export type RegistroAssinatura = Tables<'user_subscriptions'>;

export const CHAVE_ASSINATURA = 'assinatura';

interface DadosAssinatura {
  linha: RegistroAssinatura | null;
  assinante: LinhaAssinante | null;
}

async function buscarAssinatura(userId: string): Promise<DadosAssinatura> {
  const [assinatura, assinante] = await Promise.all([
    supabase.from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('subscribers').select('subscription_tier, subscribed').eq('user_id', userId).maybeSingle(),
  ]);
  if (assinatura.error) throw assinatura.error;

  let linha = assinatura.data;
  if (!linha) {
    // Conta antiga sem registro: cria o registro pendente (sem acesso) e lê de novo.
    const { error } = await supabase.rpc('ensure_user_has_subscription', { p_user_id: userId });
    if (error) logger.warn('Não foi possível criar o registro de assinatura pendente:', error.message);
    const novo = await supabase.from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle();
    if (novo.error) throw novo.error;
    linha = novo.data;
  }
  return { linha, assinante: assinante.data ?? null };
}

export interface EstadoAssinatura {
  assinatura: RegistroAssinatura | null;
  plano: Plano | null;
  /** Nome comercial com período ("Plus Pessoal (mensal)"), "Desenvolvedor" ou o plan_name gravado. */
  nomePlano: string | null;
  situacao: SituacaoAssinatura;
  /** Acesso liberado (assinatura ativa ou desenvolvedor). */
  ativa: boolean;
  /** Usuário logado sem acesso: só Assinatura, Configurações, Ajuda e Suporte. */
  bloqueada: boolean;
  desenvolvedor: boolean;
  pagamentoPendente: boolean;
  /** Perfis/empresas permitidos (-1 = ilimitado, 0 = nenhum além do primeiro). */
  limiteDashboards: number;
  /** Plano empresarial (ou desenvolvedor): pode criar dashboards do tipo empresa. */
  podeCriarEmpresa: boolean;
  diasParaExpirar: number | null;
  temRecurso: (recurso: Recurso) => boolean;
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<unknown>;
}

export function useAssinatura(): EstadoAssinatura {
  const { user } = useAuth();
  const consulta = useQuery({
    queryKey: [CHAVE_ASSINATURA, user?.id],
    queryFn: () => buscarAssinatura(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data, isLoading, error, refetch } = consulta;

  return useMemo(() => {
    const linha = data?.linha ?? null;
    const assinante = data?.assinante ?? null;
    const agora = new Date();
    const desenvolvedor = ehDesenvolvedor(linha, assinante);
    const ativa = assinaturaAtiva(linha, assinante, agora);
    const situacao = situacaoAssinatura(linha, assinante, agora);
    const plano = planoDaAssinatura(linha);
    const expira = linha?.expires_at ? new Date(linha.expires_at).getTime() : null;

    return {
      assinatura: linha,
      plano,
      nomePlano: desenvolvedor ? 'Desenvolvedor' : plano ? nomeComercial(plano) : linha?.plan_name || null,
      situacao,
      ativa,
      bloqueada: !!user && !ativa,
      desenvolvedor,
      pagamentoPendente: situacao === 'pagamento_pendente',
      limiteDashboards: limiteDeDashboards(linha, assinante, agora),
      podeCriarEmpresa:
        desenvolvedor || (ativa && (plano ? plano.tipo === 'business' : linha?.subscription_type === 'business')),
      diasParaExpirar: expira === null || desenvolvedor ? null : Math.ceil((expira - agora.getTime()) / 86_400_000),
      temRecurso: (recurso: Recurso) => temRecurso(recurso, linha, assinante, agora),
      carregando: !!user && isLoading,
      erro: error ? 'Erro ao carregar dados da assinatura' : null,
      recarregar: refetch,
    };
  }, [data, isLoading, error, refetch, user]);
}

/** Recarrega a assinatura em todas as telas (após pagamento confirmado, por exemplo). */
export function useAtualizarAssinatura() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: [CHAVE_ASSINATURA] }), [queryClient]);
}
