import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkEnv, safeHandler } from '../_shared/utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  user_id: string;
  tipo: 'pagamento' | 'meta' | 'imposto' | 'equipe' | 'sistema' | 'transacao_recorrente';
  titulo: string;
  mensagem: string;
  data_vencimento?: string;
  metadata?: Record<string, any>;
}

serve(safeHandler(async (req) => {
  // Validar variáveis de ambiente obrigatórias
  const envVars = checkEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const supabaseClient = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

  if (req.method === 'POST') {
    try {
      const { notifications }: { notifications: NotificationRequest[] } = await req.json();

      if (!notifications || !Array.isArray(notifications)) {
        return new Response(
          JSON.stringify({ error: 'Formato de notificações inválido' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Inserir notificações no banco
      const { data, error } = await supabaseClient
        .from('notificacoes')
        .insert(notifications.map(n => ({
          ...n,
          lida: false,
          created_at: new Date().toISOString()
        })))
        .select();

      if (error) throw error;

      console.log(`${notifications.length} notificações criadas com sucesso`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          notifications_created: data?.length || 0,
          message: `${notifications.length} notificações enviadas com sucesso`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } catch (error) {
      console.error('Erro ao enviar notificações:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  }

  // Processamento automático de notificações (chamado por cron)
  if (req.method === 'GET') {
    try {
      console.log('Iniciando processamento automático de notificações...');

      // Buscar impostos próximos do vencimento (próximos 7 dias)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const { data: upcomingTaxes, error: taxError } = await supabaseClient
        .from('impostos')
        .select('*')
        .eq('pago', false)
        .gte('vencimento', new Date().toISOString().split('T')[0])
        .lte('vencimento', sevenDaysFromNow.toISOString().split('T')[0]);

      if (taxError) throw taxError;

      // Buscar metas próximas do prazo (próximos 7 dias)
      const { data: upcomingGoals, error: goalError } = await supabaseClient
        .from('metas')
        .select('*')
        .eq('status', 'em_andamento')
        .gte('prazo', new Date().toISOString().split('T')[0])
        .lte('prazo', sevenDaysFromNow.toISOString().split('T')[0]);

      if (goalError) throw goalError;

      // Criar notificações para impostos
      const taxNotifications = upcomingTaxes?.map(tax => ({
        user_id: tax.user_id,
        tipo: 'imposto' as const,
        titulo: '📋 Lembrete de Imposto',
        mensagem: `Lembre-se: ${tax.tipo} de R$ ${Number(tax.valor).toFixed(2)} vence em ${new Date(tax.vencimento).toLocaleDateString('pt-BR')}.`,
        data_vencimento: tax.vencimento,
        metadata: { 
          tax_id: tax.id,
          tax_type: tax.tipo,
          amount: Number(tax.valor),
          due_date: tax.vencimento
        }
      })) || [];

      // Criar notificações para metas
      const goalNotifications = upcomingGoals?.map(goal => ({
        user_id: goal.user_id,
        tipo: 'meta' as const,
        titulo: '🎯 Meta Próxima do Prazo',
        mensagem: `Sua meta "${goal.titulo}" tem prazo até ${new Date(goal.prazo).toLocaleDateString('pt-BR')}. Atual: ${goal.progresso}%`,
        data_vencimento: goal.prazo,
        metadata: { 
          goal_id: goal.id,
          goal_title: goal.titulo,
          progress: goal.progresso,
          due_date: goal.prazo
        }
      })) || [];

      // Combinar todas as notificações
      const allNotifications = [...taxNotifications, ...goalNotifications];

      if (allNotifications.length > 0) {
        // Verificar se já existem notificações similares para evitar duplicatas
        const existingNotifications = await supabaseClient
          .from('notificacoes')
          .select('*')
          .in('tipo', ['imposto', 'meta'])
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Últimas 24 horas

        // Filtrar notificações que já foram enviadas recentemente
        const newNotifications = allNotifications.filter(notification => {
          return !existingNotifications.data?.some(existing => 
            existing.user_id === notification.user_id &&
            existing.tipo === notification.tipo &&
            JSON.stringify(existing.metadata) === JSON.stringify(notification.metadata)
          );
        });

        if (newNotifications.length > 0) {
          const { error: insertError } = await supabaseClient
            .from('notificacoes')
            .insert(newNotifications);

          if (insertError) throw insertError;

          console.log(`${newNotifications.length} novas notificações automáticas criadas`);
        } else {
          console.log('Nenhuma nova notificação necessária');
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          processed: {
            taxes: taxNotifications.length,
            goals: goalNotifications.length,
            total_created: allNotifications.length
          },
          message: 'Processamento automático de notificações concluído'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } catch (error) {
      console.error('Erro no processamento automático:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Método não permitido' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
  );
}));