// Erros do Supabase (PostgREST, RLS, triggers) e das edge functions traduzidos para o usuário.

interface ErroPostgrest {
  code?: string;
  message?: string;
  hint?: string | null;
  details?: string | null;
}

const comoErro = (erro: unknown): ErroPostgrest => (erro && typeof erro === 'object' ? (erro as ErroPostgrest) : {});

/** RPC ainda não criada no banco (front publicado antes da migração). */
export function ehFuncaoAusente(erro: unknown): boolean {
  const e = comoErro(erro);
  return e.code === 'PGRST202' || /could not find the function/i.test(e.message ?? '');
}

/** Coluna ainda não criada no banco (front publicado antes da migração). */
export function ehColunaAusente(erro: unknown): boolean {
  const e = comoErro(erro);
  return e.code === 'PGRST204' || /could not find the '.+' column/i.test(e.message ?? '');
}

/** Escrita recusada pelo paywall do banco (policies restritivas de assinatura ativa). */
export function ehBloqueioDeAssinatura(erro: unknown): boolean {
  const e = comoErro(erro);
  return e.code === '42501' && /row-level security/i.test(e.message ?? '');
}

/** Limite de perfis/empresas do plano (trigger validar_limite_de_dashboards). */
export function ehLimiteDeDashboards(erro: unknown): boolean {
  return comoErro(erro).hint === 'LIMITE_DASHBOARDS';
}

/** Mensagem para o usuário; `padrao` quando o erro não tem tradução conhecida. */
export function mensagemDeErro(erro: unknown, padrao = 'Não foi possível concluir a operação. Tente novamente.'): string {
  const e = comoErro(erro);
  if (ehLimiteDeDashboards(erro)) return `${e.message} Faça upgrade para criar mais.`;
  if (ehBloqueioDeAssinatura(erro)) return 'Sua assinatura não está ativa. Assine um plano para continuar registrando.';
  if (e.code === '23505') return e.message?.includes('telefone') ? e.message : 'Este registro já existe.';
  if (e.code === 'P0001' && e.message) return e.message;
  return padrao;
}

export interface ErroDeFunction {
  mensagem: string;
  codigo: string | null;
  status: number | null;
}

/**
 * Lê o corpo { error, code } devolvido por uma edge function. O supabase-js só informa
 * "Edge Function returned a non-2xx status code"; o motivo real fica no Response em `context`.
 */
export async function erroDaFunction(erro: unknown, padrao = 'Não foi possível concluir a operação.'): Promise<ErroDeFunction> {
  const resposta = (erro as { context?: unknown })?.context;
  if (resposta instanceof Response) {
    try {
      const corpo = await resposta.clone().json();
      return { mensagem: String(corpo?.error || padrao), codigo: corpo?.code ?? null, status: resposta.status };
    } catch {
      return { mensagem: padrao, codigo: null, status: resposta.status };
    }
  }
  return { mensagem: padrao, codigo: null, status: null };
}

/** Texto de um erro qualquer (Error, erro do PostgREST ou desconhecido). */
export function textoDoErro(erro: unknown, padrao = 'Erro inesperado.'): string {
  if (erro instanceof Error && erro.message) return erro.message;
  const mensagem = comoErro(erro).message;
  return typeof mensagem === 'string' && mensagem ? mensagem : padrao;
}
