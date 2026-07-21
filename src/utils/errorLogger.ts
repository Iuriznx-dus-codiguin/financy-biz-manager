/**
 * Centralized error capture — grava ocorrências em error_occurrences
 * com sanitização de dados sensíveis.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

const SENSITIVE_KEYS = /pass(word)?|token|secret|apikey|api_key|authorization|cpf|cnpj|card|cvv|cvc/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[deep]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.length > 500) return value.slice(0, 500) + '…';
    // Redact common token-like patterns
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

async function hashStack(stack?: string): Promise<string | null> {
  if (!stack) return null;
  try {
    const enc = new TextEncoder().encode(stack);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf))
      .slice(0, 16)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = sessionStorage.getItem('financy_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('financy_session_id', id);
  }
  return id;
}

export interface LogErrorInput {
  errorCode?: string;
  error?: unknown;
  context?: Record<string, unknown>;
  route?: string;
}

/**
 * Registra uma ocorrência de erro. Nunca lança — nunca deve derrubar a UI.
 */
export async function logError(input: LogErrorInput): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const err = input.error;
    const errObj =
      err instanceof Error
        ? { name: err.name, message: err.message, stack: err.stack }
        : err && typeof err === 'object'
        ? (err as Record<string, unknown>)
        : { message: String(err ?? '') };

    const context = sanitize({
      ...input.context,
      error: { name: errObj.name, message: errObj.message },
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    }) as Record<string, unknown>;

    const stackHash = await hashStack(typeof errObj.stack === 'string' ? errObj.stack : undefined);
    const route =
      input.route ??
      (typeof window !== 'undefined' ? window.location.pathname : undefined);

    const { data, error } = await supabase
      .from('error_occurrences')
      .insert({
        user_id: user?.id ?? undefined,
        session_id: getSessionId(),
        error_code: input.errorCode ?? undefined,
        route: route ?? undefined,
        context: context as never,
        stack_hash: stackHash ?? undefined,
        uncatalogued: !input.errorCode,
      })
      .select('id')
      .single();

    if (error) {
      logger.warn('errorLogger insert failed', error);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    logger.warn('errorLogger unexpected failure', e);
    return null;
  }
}

/**
 * Heurística leve para associar mensagens comuns a códigos do catálogo.
 * O chat de suporte fará o casamento completo; isso ajuda na captura automática.
 */
export function guessErrorCode(err: unknown): string | undefined {
  const msg =
    err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const m = msg.toLowerCase();
  if (m.includes('refresh_token_not_found') || m.includes('refresh token')) return 'AUTH-001';
  if (m.includes('invalid_login_credentials') || m.includes('invalid login')) return 'AUTH-002';
  if (m.includes('email not confirmed') || m.includes('email_not_confirmed')) return 'AUTH-003';
  if (m.includes('row-level security') || m.includes('row level security')) return 'DB-001';
  if (m.includes('duplicate key') || m.includes('unique constraint')) return 'DB-003';
  if (m.includes('failed to fetch') || m.includes('networkerror')) return 'NET-001';
  if (m.includes('timeout') || m.includes('aborted')) return 'NET-002';
  if (m.includes('rate limit') || m.includes('429')) return 'AI-003';
  if (m.includes('402')) return 'AI-002';
  return undefined;
}
