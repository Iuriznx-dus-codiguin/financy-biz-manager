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
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
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
  // TODO: Substituir por domínios de produção confiáveis
  // Exemplo: 'https://app.financy.site, https://financy.site'
  const isProduction = Deno.env.get('DENO_DEPLOYMENT_ID');
  
  if (isProduction) {
    // TODO: Definir domínios de produção
    return 'https://app.financy.site';
  }
  
  // Em desenvolvimento, permitir qualquer origem
  return '*';
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