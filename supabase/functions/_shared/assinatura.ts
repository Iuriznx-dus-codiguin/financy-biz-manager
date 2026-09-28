// Regra única de assinatura (front, functions e — espelhada em SQL — `public.tem_assinatura_ativa`).
// Regras puras, sem dependências.

import { type LimitesPlano, type Plano, type Recurso, planoPorId, planoPorNomeAproximado, planoPorNomeCompleto } from './planos.ts';

/** Colunas de user_subscriptions que decidem o acesso. */
export interface LinhaAssinatura {
  status: string | null;
  subscription_type: string | null;
  expires_at: string | null;
  plan_id?: string | null;
  plan_name?: string | null;
  features?: unknown;
}

/** Colunas de subscribers (legado) que concedem o acesso de desenvolvedor. */
export interface LinhaAssinante {
  subscription_tier: string | null;
  subscribed: boolean | null;
}

export type SituacaoAssinatura =
  | 'ativa'
  | 'desenvolvedor'
  | 'pagamento_pendente'
  | 'pagamento_atrasado'
  | 'cancelada'
  | 'expirada'
  | 'sem_assinatura';

export function ehDesenvolvedor(linha: LinhaAssinatura | null, assinante?: LinhaAssinante | null): boolean {
  if (assinante?.subscription_tier === 'developer' && assinante.subscribed === true) return true;
  return linha?.subscription_type === 'developer' && linha.status === 'active';
}

/**
 * Assinatura ativa: desenvolvedor, ou status `active` com tipo definido e sem expiração vencida.
 * É exatamente a regra que o front já aplicava para bloquear o acesso (useUserSubscription.isBlocked).
 */
export function assinaturaAtiva(
  linha: LinhaAssinatura | null,
  assinante?: LinhaAssinante | null,
  agora: Date = new Date(),
): boolean {
  if (ehDesenvolvedor(linha, assinante)) return true;
  if (!linha || linha.status !== 'active' || !linha.subscription_type) return false;
  if (!linha.expires_at) return true;
  return new Date(linha.expires_at).getTime() > agora.getTime();
}

export function situacaoAssinatura(
  linha: LinhaAssinatura | null,
  assinante?: LinhaAssinante | null,
  agora: Date = new Date(),
): SituacaoAssinatura {
  if (ehDesenvolvedor(linha, assinante)) return 'desenvolvedor';
  if (!linha) return 'sem_assinatura';
  if (assinaturaAtiva(linha, assinante, agora)) return 'ativa';
  switch (linha.status) {
    case 'pending_payment':
      return 'pagamento_pendente';
    case 'past_due':
      return 'pagamento_atrasado';
    case 'cancelled':
    case 'canceled':
    case 'refunded':
      return 'cancelada';
    case 'active':
    case 'expired':
      return 'expirada';
    default:
      return linha.subscription_type === 'pending' ? 'pagamento_pendente' : 'sem_assinatura';
  }
}

/**
 * Plano do catálogo pelo plan_id; registros antigos sem plan_id caem para o plan_name exato e, por fim,
 * para as palavras do plan_name (o front antigo liberava recursos por "pro"/"plus"/"empresarial" no nome).
 */
export function planoDaAssinatura(linha: LinhaAssinatura | null): Plano | null {
  if (!linha) return null;
  return planoPorId(linha.plan_id) ?? planoPorNomeCompleto(linha.plan_name) ?? planoPorNomeAproximado(linha.plan_name);
}

function numero(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

/**
 * Limite de dashboards (perfis/empresas). Ordem: o que o webhook gravou em `features`,
 * depois o catálogo; desenvolvedor é ilimitado (-1); sem assinatura ativa, 0.
 */
export function limiteDeDashboards(
  linha: LinhaAssinatura | null,
  assinante?: LinhaAssinante | null,
  agora: Date = new Date(),
): number {
  if (ehDesenvolvedor(linha, assinante)) return -1;
  if (!assinaturaAtiva(linha, assinante, agora)) return 0;
  const gravado = numero((linha?.features as Partial<LimitesPlano> | null)?.max_dashboards);
  if (gravado !== null && gravado !== 0) return gravado;
  return planoDaAssinatura(linha)?.limites.max_dashboards ?? 1;
}

export function temRecurso(
  recurso: Recurso,
  linha: LinhaAssinatura | null,
  assinante?: LinhaAssinante | null,
  agora: Date = new Date(),
): boolean {
  if (ehDesenvolvedor(linha, assinante)) return true;
  if (!assinaturaAtiva(linha, assinante, agora)) return false;
  const plano = planoDaAssinatura(linha);
  if (plano) return plano.recursos.includes(recurso);
  // Assinatura ativa sem plano do catálogo (registro antigo): recursos básicos.
  return recurso === 'inteligencia_basica';
}

/** true se ainda cabe outro dashboard (-1 = ilimitado). */
export function podeCriarDashboard(quantidadeAtual: number, limite: number): boolean {
  return limite === -1 || quantidadeAtual < limite;
}
