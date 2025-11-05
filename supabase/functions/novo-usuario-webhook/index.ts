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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { userId } = await req.json();

    console.log('Buscando dados do usuário:', userId);

    // Buscar dados do perfil do usuário
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('nome_completo, email, telefone')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Erro ao buscar perfil:', profileError);
      throw profileError;
    }

    console.log('Perfil encontrado:', profile);

    // Preparar dados para enviar ao webhook n8n
    const webhookUrl = 'https://central-financy-n8n.y8enlt.easypanel.host/webhook/Novo-Usúario';
    
    const webhookPayload = {
      nome: profile.nome_completo || 'Usuário',
      email: profile.email,
      telefone: profile.telefone || null,
      data_cadastro: new Date().toISOString(),
      user_id: userId
    };

    console.log('Enviando dados para webhook n8n:', webhookPayload);

    // Enviar para webhook n8n
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Erro ao enviar webhook:', errorText);
      throw new Error(`Webhook failed with status ${webhookResponse.status}`);
    }

    console.log('Webhook enviado com sucesso');

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
    console.error('Erro no webhook de novo usuário:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
