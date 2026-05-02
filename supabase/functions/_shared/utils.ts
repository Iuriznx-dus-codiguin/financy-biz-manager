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
 * Wrapper seguro para tratamento de erros em edge functions
 */
export function safeHandler(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const corsHeaders = {
      'Access-Control-Allow-Origin': getDevelopmentCorsOrigin(),
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
    };

    try {
      // Handle CORS preflight requests
      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      return await handler(req);
    } catch (error) {
      console.error('Erro capturado pelo safeHandler:', error);

      let status = 500;
      let message = 'Erro interno do servidor';

      if (error instanceof Error) {
        // Mapear tipos específicos de erro
        if (error.message.includes('Missing required environment variables')) {
          status = 500;
          message = 'Configuração do servidor inválida';
        } else if (error.message.includes('Unauthorized') || error.message.includes('Invalid JWT')) {
          status = 401;
          message = 'Não autorizado';
        } else if (error.message.includes('Forbidden')) {
          status = 403;
          message = 'Acesso negado';
        } else if (error.message.includes('Invalid input') || error.message.includes('Bad request')) {
          status = 400;
          message = 'Dados inválidos';
        }
      }

      return new Response(
        JSON.stringify({ 
          error: message,
          timestamp: new Date().toISOString()
        }),
        {
          status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  };
}

/**
 * Obtém origem CORS baseada no ambiente
 */
function getDevelopmentCorsOrigin(): string {
  const isProduction = Deno.env.get('DENO_DEPLOYMENT_ID');
  
  if (isProduction) {
    // Domínios de produção confiáveis
    const allowedOrigins = [
      'https://app.financy.site',
      'https://financy.site',
      'https://www.financy.site'
    ];
    
    // Verificar se o origin está na lista permitida
    const origin = Deno.env.get('REQUEST_ORIGIN') || 'https://app.financy.site';
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  }
  
  // Em desenvolvimento, permitir origins específicos
  return 'http://localhost:3000, http://127.0.0.1:3000, https://localhost:3000';
}

/**
 * Rate limiting simples por usuário
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(userId: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset ou primeira vez
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= maxRequests) {
    return false; // Rate limit atingido
  }
  
  userLimit.count++;
  return true;
}