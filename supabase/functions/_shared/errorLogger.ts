/**
 * Backend error logger — grava em error_occurrences com service role.
 * Sanitiza campos sensíveis antes de persistir.
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SENSITIVE_KEYS = /pass(word)?|token|secret|apikey|api_key|authorization|cpf|cnpj|card|cvv|cvc/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[deep]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.length > 500) return value.slice(0, 500) + '…';
    if (/^eyJ[A-Za-z0-9_-]+\./.test(value)) return '[jwt]';
    return value;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => sanitize(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.test(k)) {
      out[k] = '[redacted]';
      continue;
    }
    out[k] = sanitize(v, depth + 1);
  }
  return out;
}

export interface LogBackendErrorInput {
  errorCode?: string;
  userId?: string | null;
  route?: string;
  error?: unknown;
  context?: Record<string, unknown>;
}

let cachedClient: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  cachedClient = createClient(url, key);
  return cachedClient;
}

/**
 * Grava uma ocorrência de erro. Nunca lança.
 */
export async function logBackendError(input: LogBackendErrorInput): Promise<string | null> {
  try {
    const supabase = getServiceClient();
    if (!supabase) return null;

    const err = input.error;
    const errObj =
      err instanceof Error
        ? { name: err.name, message: err.message, stack: err.stack }
        : err && typeof err === 'object'
        ? (err as Record<string, unknown>)
        : { message: String(err ?? '') };

    const context = sanitize({
      ...input.context,
      error: { name: (errObj as { name?: string }).name, message: (errObj as { message?: string }).message },
    }) as Record<string, unknown>;

    const { data, error } = await supabase
      .from('error_occurrences')
      .insert({
        user_id: input.userId ?? null,
        error_code: input.errorCode ?? null,
        route: input.route ?? null,
        context,
        uncatalogued: !input.errorCode,
      })
      .select('id')
      .single();

    if (error) {
      console.error('logBackendError insert failed', error);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.error('logBackendError unexpected failure', e);
    return null;
  }
}
