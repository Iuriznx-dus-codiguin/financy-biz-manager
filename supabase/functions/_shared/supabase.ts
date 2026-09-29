// Cliente Supabase das functions, com versão fixa (antes: esm.sh/@supabase/supabase-js@2, que
// pegava qualquer 2.x a cada deploy).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.50.2';

export type { SupabaseClient };

/** Variável de ambiente obrigatória; a function falha fechada se faltar. */
export function variavel(nome: string): string {
  const valor = Deno.env.get(nome);
  if (!valor) throw new ConfiguracaoAusente(nome);
  return valor;
}

export class ConfiguracaoAusente extends Error {
  constructor(public readonly nome: string) {
    super(`Variável de ambiente ausente: ${nome}`);
  }
}

let servico: SupabaseClient | null = null;

/** Cliente com a service role (ignora RLS). Use só depois de autenticar e autorizar o chamador. */
export function clienteServico(): SupabaseClient {
  servico ??= createClient(variavel('SUPABASE_URL'), variavel('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return servico;
}
