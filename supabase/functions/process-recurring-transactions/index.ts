import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkEnv, safeHandler } from '../_shared/utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // TODO: Restringir para domínios confiáveis em produção
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(safeHandler(async (req) => {
  // Validar variáveis de ambiente obrigatórias
  const envVars = checkEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const supabaseClient = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

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
}));