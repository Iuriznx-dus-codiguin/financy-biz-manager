// Autorização: assinatura ativa, posse de dashboard e limite de uso.
import { assinaturaAtiva, type LinhaAssinante, type LinhaAssinatura } from './assinatura.ts';
import { ErroHttp, proibido } from './http.ts';
import { log } from './logger.ts';
import type { SupabaseClient } from './supabase.ts';

export async function buscarAssinatura(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ linha: LinhaAssinatura | null; assinante: LinhaAssinante | null }> {
  const [assinatura, assinante] = await Promise.all([
    supabase
      .from('user_subscriptions')
      .select('status, subscription_type, expires_at, plan_id, plan_name, features')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('subscribers').select('subscription_tier, subscribed').eq('user_id', userId).maybeSingle(),
  ]);
  if (assinatura.error) throw new ErroHttp(500, 'ERRO_ASSINATURA', 'Não foi possível verificar a assinatura');
  return { linha: assinatura.data, assinante: assinante.data ?? null };
}

/** 402 com código ASSINATURA_INATIVA quando o usuário não tem assinatura ativa (mesma regra do front). */
export async function exigirAssinaturaAtiva(supabase: SupabaseClient, userId: string): Promise<void> {
  const { linha, assinante } = await buscarAssinatura(supabase, userId);
  if (!assinaturaAtiva(linha, assinante)) {
    throw new ErroHttp(402, 'ASSINATURA_INATIVA', 'Este recurso exige uma assinatura ativa.');
  }
}

/** 403 se o dashboard informado não pertence ao usuário. Sem dashboard informado, nada a checar. */
export async function exigirDonoDoDashboard(
  supabase: SupabaseClient,
  userId: string,
  dashboardId: string | null | undefined,
): Promise<void> {
  if (!dashboardId) return;
  const { data, error } = await supabase
    .from('user_dashboards')
    .select('id')
    .eq('id', dashboardId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) throw proibido('Dashboard não encontrado');
}

/**
 * Incrementa e verifica o limite de uso (tabela rate_limits). Falha fechada: se o banco não
 * responder, a chamada é recusada (antes liberava, e a IA ficava sem limite).
 */
export async function consumirLimite(
  supabase: SupabaseClient,
  chave: string,
  acao: string,
  maximo: number,
  janelaMinutos: number,
): Promise<void> {
  const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
    p_user_id: chave,
    p_action: acao,
    p_max_requests: maximo,
    p_window_minutes: janelaMinutos,
  });
  if (error) {
    log('error', 'limite_de_uso.erro', { acao, erro: error.message });
    throw new ErroHttp(503, 'LIMITE_INDISPONIVEL', 'Não foi possível verificar o limite de uso. Tente novamente.');
  }
  if (data !== true) {
    throw new ErroHttp(429, 'LIMITE_ATINGIDO', 'Limite diário atingido. Tente novamente amanhã.');
  }
}
