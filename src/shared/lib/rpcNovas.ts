// RPCs criadas pelas migrações de 2026-09-27. Ainda não aparecem em integrations/supabase/types.ts
// (gerado pelo Lovable a partir do banco); quando aparecerem, este arquivo pode ser removido.
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface RpcsNovas {
  excluir_dashboard: { args: { p_dashboard_id: string }; retorno: null };
  apagar_meus_dados: { args: Record<string, never>; retorno: null };
  concluir_onboarding: { args: { p_dados: Json }; retorno: { dashboard_id: string | null; ja_concluido: boolean } };
}

type Chamada = (nome: string, args?: object) => PromiseLike<{ data: unknown; error: PostgrestError | null }>;

export async function rpcNova<N extends keyof RpcsNovas>(
  nome: N,
  args: RpcsNovas[N]['args'],
): Promise<{ data: RpcsNovas[N]['retorno'] | null; error: PostgrestError | null }> {
  const { data, error } = await (supabase.rpc as unknown as Chamada)(nome, args);
  return { data: (data as RpcsNovas[N]['retorno']) ?? null, error };
}
