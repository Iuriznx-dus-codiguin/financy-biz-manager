import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import { checkEnv, getCorsHeaders, isAuthorizedCron } from '../_shared/utils.ts';

interface UserWithoutTransaction {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rotina de cron: roda com service role, lê o cadastro de TODOS os usuários
    // e dispara notificações em massa. Exige CRON_SECRET_TOKEN — `verify_jwt`
    // sozinho deixaria qualquer usuário logado disparar a rotina.
    //
    // A autorização vem ANTES de validar o resto do ambiente: assim um chamador
    // não autenticado recebe sempre 401, sem conseguir distinguir "token errado"
    // de "servidor mal configurado" pela diferença entre 401 e 500.
    const { CRON_SECRET_TOKEN } = checkEnv(['CRON_SECRET_TOKEN']);

    if (!isAuthorizedCron(req, CRON_SECRET_TOKEN)) {
      console.error('[SECURITY] daily-transaction-reminder: token de cron ausente ou inválido');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const envVars = checkEnv([
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'N8N_DAILY_REMINDER_URL',
    ]);

    console.log('🔔 Iniciando verificação de lembretes diários...');

    const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

    // Data atual (sem horário para comparação)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    console.log(`📅 Verificando transações do dia: ${todayStr}`);

    // Buscar todos os usuários ativos
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, nome_completo, email, telefone')
      .not('email', 'is', null);

    if (usersError) {
      console.error('❌ Erro ao buscar usuários:', usersError);
      throw usersError;
    }

    console.log(`👥 Total de usuários encontrados: ${allUsers?.length || 0}`);

    if (!allUsers || allUsers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum usuário encontrado',
          usersNotified: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Para cada usuário, verificar se tem transações hoje
    const usersWithoutTransactions: UserWithoutTransaction[] = [];

    for (const user of allUsers) {
      // Verificar receitas do dia
      const { data: receitas } = await supabase
        .from('receitas')
        .select('id')
        .eq('user_id', user.id)
        .gte('data', todayStr)
        .lt('data', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .limit(1);

      // Verificar despesas do dia
      const { data: despesas } = await supabase
        .from('despesas')
        .select('id')
        .eq('user_id', user.id)
        .gte('data', todayStr)
        .lt('data', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .limit(1);

      // Se não tem nenhuma transação hoje, adicionar à lista
      if ((!receitas || receitas.length === 0) && (!despesas || despesas.length === 0)) {
        usersWithoutTransactions.push({
          id: user.id,
          nome_completo: user.nome_completo || 'Usuário',
          email: user.email,
          telefone: user.telefone,
        });
      }
    }

    console.log(`📊 Usuários sem transações hoje: ${usersWithoutTransactions.length}`);

    // Se não há usuários para notificar, retornar sucesso
    if (usersWithoutTransactions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Todos os usuários registraram transações hoje!',
          usersNotified: 0,
          totalUsers: allUsers.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Endpoint do n8n vem de env — manter a URL no código a expõe no repositório
    // público e obriga um deploy a cada troca de ambiente.
    const n8nWebhookUrl = envVars.N8N_DAILY_REMINDER_URL;

    console.log(`🚀 Enviando ${usersWithoutTransactions.length} usuários para o webhook n8n...`);

    // Enviar todos os usuários de uma vez em um array
    const webhookResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: todayStr,
        hora_verificacao: new Date().toISOString(),
        total_usuarios: usersWithoutTransactions.length,
        usuarios: usersWithoutTransactions.map(user => ({
          nome: user.nome_completo,
          email: user.email,
          telefone: user.telefone,
          user_id: user.id,
        })),
      }),
    });

    if (!webhookResponse.ok) {
      console.error('❌ Erro ao enviar para webhook n8n:', await webhookResponse.text());
      throw new Error(`Webhook retornou status ${webhookResponse.status}`);
    }

    console.log('✅ Webhook n8n chamado com sucesso!');

    // Registrar log no banco para auditoria
    await supabase.from('security_audit_logs').insert({
      user_id: null,
      action: 'DAILY_REMINDER_SENT',
      table_name: 'system',
      risk_level: 'low',
      metadata: {
        users_notified: usersWithoutTransactions.length,
        date: todayStr,
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Lembretes enviados com sucesso para ${usersWithoutTransactions.length} usuários`,
        usersNotified: usersWithoutTransactions.length,
        totalUsers: allUsers.length,
        date: todayStr,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    // Detalhe do erro fica só no log: a mensagem crua revela nomes de tabela,
    // colunas e variáveis de ambiente ausentes para quem chamou.
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno ao processar lembretes',
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
