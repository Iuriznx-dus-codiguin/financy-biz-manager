import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎉 [WEBHOOK BOAS-VINDAS] Iniciando processamento...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Parse do body com validação
    let userId;
    try {
      const body = await req.json();
      userId = body.userId;
      console.log('📋 [WEBHOOK BOAS-VINDAS] Body recebido:', JSON.stringify(body));
    } catch (parseError) {
      console.error('❌ [WEBHOOK BOAS-VINDAS] Erro ao parsear JSON:', parseError);
      throw new Error('Invalid JSON body');
    }

    if (!userId) {
      console.error('❌ [WEBHOOK BOAS-VINDAS] userId não fornecido');
      throw new Error('userId is required');
    }

    console.log('🔍 [WEBHOOK BOAS-VINDAS] Buscando dados do usuário:', userId);

    // Buscar dados do perfil do usuário
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('nome_completo, email, telefone')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ [WEBHOOK BOAS-VINDAS] Erro ao buscar perfil:', {
        error: profileError,
        userId,
        code: profileError.code,
        message: profileError.message
      });
      throw profileError;
    }

    if (!profile) {
      console.error('❌ [WEBHOOK BOAS-VINDAS] Perfil não encontrado para userId:', userId);
      throw new Error('Profile not found');
    }

    console.log('✅ [WEBHOOK BOAS-VINDAS] Perfil encontrado:', {
      nome: profile.nome_completo,
      email: profile.email,
      telefone: profile.telefone ? 'Sim' : 'Não'
    });

    // Preparar dados para enviar ao webhook n8n
    const webhookUrl = 'https://central-financy-n8n.y8enlt.easypanel.host/webhook/Novo-Usúario';
    
    const webhookPayload = {
      nome: profile.nome_completo || 'Usuário',
      email: profile.email,
      telefone: profile.telefone || null,
      data_cadastro: new Date().toISOString(),
      user_id: userId
    };

    console.log('📤 [WEBHOOK BOAS-VINDAS] Enviando dados para n8n:', {
      url: webhookUrl,
      payload: webhookPayload
    });

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
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
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
