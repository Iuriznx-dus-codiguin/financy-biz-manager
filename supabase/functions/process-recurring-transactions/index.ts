// Processa as recorrências de todos os usuários. O cron agora chama o SQL direto
// (migração 20260927120200); esta function continua disponível para o backend/n8n
// (x-cron-secret, Bearer CRON_SECRET_TOKEN ou service role). GET /health responde sem autenticação.
import { exigirChamadorInterno } from '../_shared/auth.ts';
import { json, servir } from '../_shared/http.ts';
import { log } from '../_shared/logger.ts';
import { clienteServico } from '../_shared/supabase.ts';

servir('process-recurring-transactions', async (req) => {
  if (new URL(req.url).pathname.endsWith('/health')) {
    return json(req, { status: 'healthy', service: 'process-recurring-transactions', timestamp: new Date().toISOString() });
  }
  exigirChamadorInterno(req);

  const supabase = clienteServico();
  const [receitas, despesas, impostos] = await Promise.all([
    supabase.rpc('processar_receitas_recorrentes'),
    supabase.rpc('processar_despesas_recorrentes'),
    supabase.rpc('processar_impostos_recorrentes'),
  ]);
  const erros = { receitas: receitas.error?.message ?? null, despesas: despesas.error?.message ?? null, impostos: impostos.error?.message ?? null };
  const statistics = {
    receitasProcessadas: receitas.data ?? 0,
    despesasProcessadas: despesas.data ?? 0,
    impostosProcessados: impostos.data ?? 0,
    totalProcessadas: (receitas.data ?? 0) + (despesas.data ?? 0) + (impostos.data ?? 0),
  };
  const falhas = Object.values(erros).filter(Boolean).length;
  log(falhas ? 'warn' : 'info', 'recorrencias.processadas', { ...statistics, erros });

  if (falhas === 3) {
    return json(req, { success: false, partialSuccess: false, message: 'Erro ao processar transações recorrentes', statistics, errors: erros, timestamp: new Date().toISOString() }, 500);
  }
  if (falhas > 0) {
    return json(req, { success: false, partialSuccess: true, message: 'Processamento parcial - algumas transações falharam', statistics, errors: erros, timestamp: new Date().toISOString() }, 207);
  }
  return json(req, { success: true, message: 'Transações recorrentes processadas com sucesso', statistics, timestamp: new Date().toISOString() });
});
