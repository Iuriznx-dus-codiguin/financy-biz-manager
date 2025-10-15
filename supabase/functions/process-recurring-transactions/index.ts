import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkEnv, safeHandler } from '../_shared/utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Edge Function: process-recurring-transactions
 * 
 * Processa transações recorrentes (receitas e despesas) que estão vencidas.
 * Esta função deve ser chamada periodicamente (ex: diariamente via cron)
 * 
 * Segurança: Requer token CRON_SECRET_TOKEN no header Authorization
 * 
 * Endpoints:
 * - POST / : Processa transações recorrentes
 * - GET /health : Health check
 */

Deno.serve(safeHandler(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  const url = new URL(req.url);
  if (url.pathname.endsWith('/health')) {
    console.log('[HEALTH] Health check requested');
    return new Response(
      JSON.stringify({ 
        status: 'healthy', 
        service: 'process-recurring-transactions',
        timestamp: new Date().toISOString() 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }

  // Validar variáveis de ambiente obrigatórias
  const envVars = checkEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET_TOKEN']);
  const supabaseClient = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

  // Validar autenticação via token CRON
  const authHeader = req.headers.get('Authorization');
  const expectedToken = `Bearer ${envVars.CRON_SECRET_TOKEN}`;
  
  if (!authHeader || authHeader !== expectedToken) {
    console.error('[SECURITY] Unauthorized access attempt - Invalid or missing cron token');
    return new Response(
      JSON.stringify({ 
        error: 'Unauthorized - Invalid cron token',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401 
      }
    );
  }

  console.log('[CRON] Iniciando processamento de transações recorrentes:', {
    timestamp: new Date().toISOString(),
    triggerSource: req.headers.get('user-agent') || 'unknown',
  });

  // Processar receitas e despesas com retry logic
  let receitasError = null;
  let despesasError = null;
  let receitasCount = 0;
  let despesasCount = 0;

  // Processar receitas recorrentes
  try {
    console.log('[CRON] Processando receitas recorrentes...');
    const { data: receitasData, error } = await supabaseClient.rpc('processar_receitas_recorrentes');
    receitasError = error;
    receitasCount = receitasData || 0;
    
    if (error) {
      console.error('[CRON] Erro ao processar receitas recorrentes:', {
        message: error.message,
        details: error.details,
        hint: error.hint
      });
    } else {
      console.log('[CRON] Receitas processadas com sucesso:', {
        count: receitasCount,
        timestamp: new Date().toISOString()
      });
    }
  } catch (e) {
    console.error('[CRON] Erro crítico ao processar receitas:', e);
    receitasError = e;
  }

  // Processar despesas recorrentes
  try {
    console.log('[CRON] Processando despesas recorrentes...');
    const { data: despesasData, error } = await supabaseClient.rpc('processar_despesas_recorrentes');
    despesasError = error;
    despesasCount = despesasData || 0;
    
    if (error) {
      console.error('[CRON] Erro ao processar despesas recorrentes:', {
        message: error.message,
        details: error.details,
        hint: error.hint
      });
    } else {
      console.log('[CRON] Despesas processadas com sucesso:', {
        count: despesasCount,
        timestamp: new Date().toISOString()
      });
    }
  } catch (e) {
    console.error('[CRON] Erro crítico ao processar despesas:', e);
    despesasError = e;
  }

  // Determinar status da resposta
  const hasErrors = receitasError || despesasError;
  const partialSuccess = (receitasError && !despesasError) || (!receitasError && despesasError);

  if (hasErrors) {
    const statusCode = partialSuccess ? 207 : 500; // 207 Multi-Status para sucesso parcial
    
    console.warn('[CRON] Processamento finalizado com erros:', {
      partialSuccess,
      receitasCount,
      despesasCount,
      errors: {
        receitas: receitasError?.message,
        despesas: despesasError?.message
      }
    });

    return new Response(
      JSON.stringify({
        success: false,
        partialSuccess,
        message: partialSuccess 
          ? 'Processamento parcial - algumas transações falharam'
          : 'Erro ao processar transações recorrentes',
        statistics: {
          receitasProcessadas: receitasCount,
          despesasProcessadas: despesasCount,
          totalProcessadas: receitasCount + despesasCount
        },
        errors: {
          receitas: receitasError?.message || null,
          despesas: despesasError?.message || null
        },
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );
  }

  // Sucesso total
  console.log('[CRON] Processamento concluído com sucesso:', {
    receitasCount,
    despesasCount,
    totalProcessadas: receitasCount + despesasCount,
    timestamp: new Date().toISOString()
  });

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Transações recorrentes processadas com sucesso',
      statistics: {
        receitasProcessadas: receitasCount,
        despesasProcessadas: despesasCount,
        totalProcessadas: receitasCount + despesasCount
      },
      timestamp: new Date().toISOString()
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}));