import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Iniciando processamento de transações recorrentes...')

    // Processar receitas recorrentes
    const { error: receitasError } = await supabaseClient.rpc('processar_receitas_recorrentes')
    
    if (receitasError) {
      console.error('Erro ao processar receitas recorrentes:', receitasError)
      throw receitasError
    }

    // Processar despesas recorrentes
    const { error: despesasError } = await supabaseClient.rpc('processar_despesas_recorrentes')
    
    if (despesasError) {
      console.error('Erro ao processar despesas recorrentes:', despesasError)
      throw despesasError
    }

    console.log('Transações recorrentes processadas com sucesso!')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Transações recorrentes processadas com sucesso',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Erro no processamento:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})