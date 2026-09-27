// Autenticação do chamador.
import { naoAutorizado } from './http.ts';
import { clienteServico, variavel } from './supabase.ts';
import { constantTimeCompare } from './utils.ts';

export interface Usuario {
  id: string;
  email: string | null;
}

function bearer(req: Request): string | null {
  const cabecalho = req.headers.get('Authorization') ?? '';
  return cabecalho.startsWith('Bearer ') ? cabecalho.slice(7).trim() : null;
}

/** Usuário dono do JWT da requisição; 401 se ausente ou inválido. */
export async function usuarioDaRequisicao(req: Request): Promise<Usuario> {
  const token = bearer(req);
  if (!token) throw naoAutorizado();
  const { data, error } = await clienteServico().auth.getUser(token);
  if (error || !data?.user) throw naoAutorizado();
  return { id: data.user.id, email: data.user.email ?? null };
}

/**
 * true se a requisição veio do próprio backend: header `x-cron-secret` igual a CRON_SECRET_TOKEN
 * (pg_cron, com o segredo lido do Vault), `Authorization: Bearer <CRON_SECRET_TOKEN>` (formato antigo
 * do process-recurring-transactions) ou `Authorization: Bearer <service role>` (outra function).
 */
export function ehChamadorInterno(req: Request): boolean {
  const token = bearer(req);
  const segredoCron = Deno.env.get('CRON_SECRET_TOKEN');
  if (segredoCron) {
    const enviado = req.headers.get('x-cron-secret');
    if (enviado && constantTimeCompare(enviado, segredoCron)) return true;
    if (token && constantTimeCompare(token, segredoCron)) return true;
  }
  return !!token && constantTimeCompare(token, variavel('SUPABASE_SERVICE_ROLE_KEY'));
}

/** Falha fechada: sem segredo configurado e sem service role, ninguém passa. */
export function exigirChamadorInterno(req: Request): void {
  if (!ehChamadorInterno(req)) throw naoAutorizado();
}
