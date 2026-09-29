// Lembrete diário (cron 23:00 UTC = 20:00 de Brasília, com x-cron-secret): envia ao n8n quem não
// registrou nenhuma receita ou despesa hoje. Payload igual ao anterior (contrato com o n8n).
// Antes: qualquer pessoa com a chave pública disparava; 2 consultas por usuário; limitado a 1000 perfis.
import { exigirChamadorInterno } from '../_shared/auth.ts';
import { hojeISO } from '../_shared/datas.ts';
import { json, servir } from '../_shared/http.ts';
import { log } from '../_shared/logger.ts';
import { enviarParaN8n, urlN8n } from '../_shared/n8n.ts';
import { clienteServico, type SupabaseClient } from '../_shared/supabase.ts';

const PAGINA = 1000;

async function todasAsLinhas<T>(
  buscar: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const linhas: T[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await buscar(de, de + PAGINA - 1);
    if (error) throw new Error(error.message);
    linhas.push(...(data ?? []));
    if (!data || data.length < PAGINA) return linhas;
  }
}

async function quemLancouHoje(supabase: SupabaseClient, tabela: 'receitas' | 'despesas', hoje: string) {
  const linhas = await todasAsLinhas<{ user_id: string }>((de, ate) =>
    supabase.from(tabela).select('user_id').eq('data', hoje).order('user_id').range(de, ate)
  );
  return linhas.map((l) => l.user_id);
}

servir('daily-transaction-reminder', async (req) => {
  exigirChamadorInterno(req);
  const supabase = clienteServico();
  const hoje = hojeISO();

  const [perfis, comReceita, comDespesa] = await Promise.all([
    todasAsLinhas<{ id: string; nome_completo: string | null; email: string; telefone: string | null }>((de, ate) =>
      supabase.from('profiles').select('id, nome_completo, email, telefone').not('email', 'is', null).order('id').range(de, ate)
    ),
    quemLancouHoje(supabase, 'receitas', hoje),
    quemLancouHoje(supabase, 'despesas', hoje),
  ]);

  const lancaram = new Set([...comReceita, ...comDespesa]);
  const semLancamento = perfis.filter((p) => !lancaram.has(p.id));

  if (semLancamento.length === 0) {
    return json(req, {
      success: true,
      message: perfis.length ? 'Todos os usuários registraram transações hoje!' : 'Nenhum usuário encontrado',
      usersNotified: 0,
      totalUsers: perfis.length,
    });
  }

  await enviarParaN8n(urlN8n('verificar-transacoes'), {
    data: hoje,
    hora_verificacao: new Date().toISOString(),
    total_usuarios: semLancamento.length,
    usuarios: semLancamento.map((u) => ({
      nome: u.nome_completo || 'Usuário',
      email: u.email,
      telefone: u.telefone,
      user_id: u.id,
    })),
  }, 30_000);

  log('info', 'lembrete_diario.enviado', { data: hoje, notificados: semLancamento.length, total: perfis.length });
  return json(req, {
    success: true,
    message: `Lembretes enviados com sucesso para ${semLancamento.length} usuários`,
    usersNotified: semLancamento.length,
    totalUsers: perfis.length,
    date: hoje,
  });
});
