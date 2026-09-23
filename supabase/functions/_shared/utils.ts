// Utilitários compartilhados para Supabase Functions

/**
 * Função para validar variáveis de ambiente obrigatórias
 */
export function checkEnv(requiredVars: string[]): Record<string, string> {
  const missingVars: string[] = [];
  const envVars: Record<string, string> = {};

  for (const varName of requiredVars) {
    const value = Deno.env.get(varName);
    if (!value) {
      missingVars.push(varName);
    } else {
      envVars[varName] = value;
    }
  }

  if (missingVars.length > 0) {
    console.error(`❌ Variáveis de ambiente obrigatórias não encontradas: ${missingVars.join(', ')}`);
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  console.log(`✅ Todas as variáveis de ambiente obrigatórias foram encontradas`);
  return envVars;
}

/**
 * Comparação em tempo constante para verificação de assinatura
 */
export function constantTimeCompare(a: string, b: string): boolean {
  // Preencher ambas as strings ao mesmo comprimento para evitar timing attack por tamanho
  const maxLen = Math.max(a.length, b.length);
  const paddedA = a.padEnd(maxLen, '\0');
  const paddedB = b.padEnd(maxLen, '\0');

  let result = a.length === b.length ? 0 : 1; // diferença de tamanho já marca como diferente
  for (let i = 0; i < maxLen; i++) {
    result |= paddedA.charCodeAt(i) ^ paddedB.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Gera HMAC-SHA256 para verificação de webhook
 */
export async function generateHmacSha256(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Origens autorizadas a chamar as edge functions a partir do navegador.
 * Fonte única — nenhuma function deve declarar `Access-Control-Allow-Origin: '*'`,
 * porque isso permite que qualquer site aberto pelo usuário logado leia respostas
 * que contêm dados financeiros.
 */
const ALLOWED_ORIGINS_SHARED = [
  'https://app.financy.site',
  'https://financy.site',
  'https://www.financy.site',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getAllowedOrigin(req: Request): string {
  const origin = req.headers.get('Origin') || '';
  return ALLOWED_ORIGINS_SHARED.includes(origin)
    ? origin
    : 'https://app.financy.site';
}

/**
 * Headers CORS com allowlist de origem. Use em toda function que responda ao
 * navegador, no lugar de um objeto `corsHeaders` fixo por arquivo.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(req),
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-webhook-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

/**
 * Autentica chamadas de rotina (cron) comparando o Authorization com
 * CRON_SECRET_TOKEN em tempo constante.
 *
 * `verify_jwt` sozinho NÃO protege estas functions: ele apenas exige um JWT
 * válido, e todo usuário logado da plataforma possui um. Rotinas que rodam com
 * service role (ignorando RLS) e disparam mensagens em massa precisam deste
 * segundo fator.
 */
export function isAuthorizedCron(req: Request, cronSecret: string): boolean {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return false;
  return constantTimeCompare(authHeader.slice('Bearer '.length), cronSecret);
}

export function safeHandler(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const corsHeaders = getCorsHeaders(req);

    try {
      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }
      return await handler(req);
    } catch (error) {
      console.error('Erro capturado pelo safeHandler:', error);
      let status = 500;
      let message = 'Erro interno do servidor';
      if (error instanceof Error) {
        if (error.message.includes('Missing required environment variables')) {
          status = 500; message = 'Configuração do servidor inválida';
        } else if (error.message.includes('Unauthorized') || error.message.includes('Invalid JWT')) {
          status = 401; message = 'Não autorizado';
        } else if (error.message.includes('Forbidden')) {
          status = 403; message = 'Acesso negado';
        } else if (error.message.includes('Invalid input') || error.message.includes('Bad request')) {
          status = 400; message = 'Dados inválidos';
        }
      }
      return new Response(
        JSON.stringify({ error: message, timestamp: new Date().toISOString() }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  };
}

/**
 * Rate limiting persistente via banco de dados (Postgres).
 * Usa a função SQL `check_and_increment_rate_limit`.
 */
export async function checkRateLimit(
  supabase: any,
  userId: string,
  action: string = 'ai_message',
  maxRequests: number = 50,
  windowMinutes: number = 1440 // 24 horas
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
    p_user_id: userId,
    p_action: action,
    p_max_requests: maxRequests,
    p_window_minutes: windowMinutes,
  });
  if (error) {
    console.error('Rate limit check error:', error);
    return true; // Fail open em caso de erro de banco
  }
  return data === true;
}
