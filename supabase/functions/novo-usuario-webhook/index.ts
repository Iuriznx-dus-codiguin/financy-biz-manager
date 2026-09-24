import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkEnv, constantTimeCompare, getCorsHeaders } from '../_shared/utils.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const unauthorized = () =>
    new Response(JSON.stringify({ error: 'Unauthorized', success: false }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    console.log('🎉 [WEBHOOK BOAS-VINDAS] Iniciando processamento...');

    const envVars = checkEnv([
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_ANON_KEY',
      'N8N_NEW_USER_URL',
    ]);

    // O perfil é lido com service role: a chave anon anterior esbarrava na RLS
    // de `profiles` e a function falhava silenciosamente para todo usuário novo.
    const supabaseClient = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

    // Parse do body com validação. Nunca logar o body cru — ele carrega PII.
    let userId: string | undefined;
    try {
      const body = await req.json();
      userId = body?.userId;
    } catch (parseError) {
      console.error('❌ [WEBHOOK BOAS-VINDAS] Erro ao parsear JSON:', parseError);
      throw new Error('Invalid JSON body');
    }

    if (!userId || typeof userId !== 'string' || !UUID_RE.test(userId)) {
      console.error('❌ [WEBHOOK BOAS-VINDAS] userId ausente ou inválido');
      return new Response(JSON.stringify({ error: 'userId inválido', success: false }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Autorização: sem isto o endpoint é público (verify_jwt = false) e qualquer
    // um dispara mensagens de boas-vindas para contas de terceiros.
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return unauthorized();
    const token = authHeader.slice('Bearer '.length);

    const isInternalCall = constantTimeCompare(token, envVars.SUPABASE_SERVICE_ROLE_KEY);
    if (!isInternalCall) {
      const authClient = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
      const callerId = claimsData?.claims?.sub as string | undefined;
      if (claimsError || !callerId) return unauthorized();
      if (callerId !== userId) {
        console.error('[SECURITY] novo-usuario-webhook: userId diferente do usuário autenticado');
        return new Response(JSON.stringify({ error: 'Forbidden', success: false }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('🔍 [WEBHOOK BOAS-VINDAS] Buscando dados do usuário');

    // Buscar dados do perfil do usuário
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('nome_completo, email, telefone')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ [WEBHOOK BOAS-VINDAS] Erro ao buscar perfil:', {
        code: profileError.code,
        message: profileError.message,
      });
      throw profileError;
    }

    if (!profile) {
      console.error('❌ [WEBHOOK BOAS-VINDAS] Perfil não encontrado');
      throw new Error('Profile not found');
    }

    console.log('✅ [WEBHOOK BOAS-VINDAS] Perfil encontrado', {
      tem_telefone: Boolean(profile.telefone),
    });

    // Preparar dados para enviar ao webhook n8n
    const webhookUrl = envVars.N8N_NEW_USER_URL;

    const webhookPayload = {
      nome: profile.nome_completo || 'Usuário',
      email: profile.email,
      telefone: profile.telefone || null,
      data_cadastro: new Date().toISOString(),
      user_id: userId
    };

    console.log('📤 [WEBHOOK BOAS-VINDAS] Enviando dados para n8n');

    // Enviar para webhook n8n com timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('📨 [WEBHOOK BOAS-VINDAS] Resposta do n8n:', {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error('❌ [WEBHOOK BOAS-VINDAS] n8n retornou erro:', {
          status: webhookResponse.status,
          error: errorText
        });
        throw new Error(`Webhook failed with status ${webhookResponse.status}: ${errorText}`);
      }

      console.log('✅ [WEBHOOK BOAS-VINDAS] Webhook enviado com sucesso!');
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('⏱️ [WEBHOOK BOAS-VINDAS] Timeout ao enviar webhook');
        throw new Error('Webhook request timeout after 10s');
      }
      throw fetchError;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Dados de boas-vindas enviados com sucesso'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ [WEBHOOK BOAS-VINDAS] Erro geral:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Mensagem genérica para o cliente: a original expõe detalhes internos.
    return new Response(
      JSON.stringify({
        error: 'Erro ao processar boas-vindas',
        success: false,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
