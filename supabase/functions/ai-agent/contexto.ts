// Contexto financeiro enviado ao modelo (cache de 10 min em ai_context_cache).
import { lancamentosDoPeriodo } from '../_shared/consultas.ts';
import { hojeISO, inicioDoMes } from '../_shared/datas.ts';
import { somarReais } from '../_shared/dinheiro.ts';
import type { SupabaseClient } from '../_shared/supabase.ts';

type Linha = Record<string, unknown> & { valor?: number; categoria?: string };

export interface ContextoFinanceiro {
  nomePreferido: string;
  userType: string;
  hoje: string;
  mes: string;
  totalReceitasMes: number;
  totalDespesasMes: number;
  lucroMes: number;
  totalReceitasAno: number;
  totalDespesasAno: number;
  lucroAno: number;
  numReceitasMes: number;
  numDespesasMes: number;
  numReceitasAno: number;
  numDespesasAno: number;
  categoriasDespesas: Record<string, number>;
  categoriasReceitas: Record<string, number>;
  metas: Linha[];
  impostos: Linha[];
  ultimasReceitas: Linha[];
  ultimasDespesas: Linha[];
  gastosEquipe: number;
  membrosEquipe: number;
}

function porCategoria(linhas: Linha[]): Record<string, number> {
  const grupos: Record<string, number[]> = {};
  for (const l of linhas) (grupos[String(l.categoria ?? 'outros')] ??= []).push(Number(l.valor ?? 0));
  return Object.fromEntries(Object.entries(grupos).map(([c, v]) => [c, somarReais(v)]));
}

async function montarContexto(supabase: SupabaseClient, userId: string, dashboardId?: string | null): Promise<ContextoFinanceiro> {
  const hoje = hojeISO();
  const filtroMes = { userId, dashboardId, inicio: inicioDoMes(hoje), fim: hoje };
  const filtroAno = { userId, dashboardId, inicio: `${hoje.slice(0, 4)}-01-01`, fim: hoje };
  let metas = supabase.from('metas').select('titulo, valor_meta, valor_atual, progresso, prazo, status').eq('user_id', userId);
  // '*': valor_tipo só existe depois da migração 20260927120200 (functions sobem antes dela no Lovable).
  let impostos = supabase.from('impostos').select('*').eq('user_id', userId);
  let equipe = supabase.from('equipe_membros').select('salario, status, periodicidade').eq('user_id', userId);
  if (dashboardId) {
    metas = metas.eq('dashboard_id', dashboardId);
    impostos = impostos.eq('dashboard_id', dashboardId);
    equipe = equipe.eq('dashboard_id', dashboardId);
  }

  const [receitasMes, despesasMes, receitasAno, despesasAno, metasRes, impostosRes, onboarding, equipeRes] = await Promise.all([
    lancamentosDoPeriodo<Linha>(supabase, 'receitas', 'id, data, descricao, categoria, valor, cliente, forma_pagamento, status', filtroMes),
    lancamentosDoPeriodo<Linha>(supabase, 'despesas', 'id, data, descricao, categoria, valor, fornecedor, forma_pagamento, status', filtroMes),
    lancamentosDoPeriodo<Linha>(supabase, 'receitas', 'id, valor', filtroAno),
    lancamentosDoPeriodo<Linha>(supabase, 'despesas', 'id, valor', filtroAno),
    metas.limit(20),
    impostos.order('vencimento', { ascending: true }).limit(50),
    supabase.from('onboarding_data').select('user_type, nome_preferido').eq('user_id', userId).maybeSingle(),
    equipe.limit(200),
  ]);

  const totalReceitasMes = somarReais(receitasMes.map((r) => r.valor));
  const totalDespesasMes = somarReais(despesasMes.map((d) => d.valor));
  const totalReceitasAno = somarReais(receitasAno.map((r) => r.valor));
  const totalDespesasAno = somarReais(despesasAno.map((d) => d.valor));
  const ativos = ((equipeRes.data ?? []) as Linha[]).filter((m) => m.status === 'ativo');
  // Folha como custo mensal (semanal ×4, quinzenal ×2), como nos painéis (modelo em revisão: D-01).
  const gastosEquipe = somarReais(ativos.map((m) => {
    const salario = Number(m.salario ?? 0);
    return m.periodicidade === 'semanal' ? salario * 4 : m.periodicidade === 'quinzenal' ? salario * 2 : salario;
  }));

  return {
    nomePreferido: (onboarding.data?.nome_preferido as string) || '',
    userType: (onboarding.data?.user_type as string) || 'pessoal',
    hoje,
    mes: new Date(`${hoje}T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    totalReceitasMes,
    totalDespesasMes,
    lucroMes: totalReceitasMes - totalDespesasMes,
    totalReceitasAno,
    totalDespesasAno,
    lucroAno: totalReceitasAno - totalDespesasAno,
    numReceitasMes: receitasMes.length,
    numDespesasMes: despesasMes.length,
    numReceitasAno: receitasAno.length,
    numDespesasAno: despesasAno.length,
    categoriasDespesas: porCategoria(despesasMes),
    categoriasReceitas: porCategoria(receitasMes),
    metas: ((metasRes.data ?? []) as Linha[]).slice(0, 5),
    impostos: ((impostosRes.data ?? []) as Linha[]).slice(0, 10),
    ultimasReceitas: receitasMes.slice(0, 5),
    ultimasDespesas: despesasMes.slice(0, 5),
    gastosEquipe,
    membrosEquipe: ativos.length,
  };
}

function chaveDoCache(dashboardId?: string | null): string {
  return dashboardId || 'default';
}

export async function contextoComCache(supabase: SupabaseClient, userId: string, dashboardId?: string | null) {
  const chave = chaveDoCache(dashboardId);
  const { data: cache } = await supabase
    .from('ai_context_cache')
    .select('context_data')
    .eq('user_id', userId)
    .eq('dashboard_id', chave)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (cache?.context_data && (cache.context_data as ContextoFinanceiro).hoje === hojeISO()) {
    return cache.context_data as ContextoFinanceiro;
  }

  const contexto = await montarContexto(supabase, userId, dashboardId);
  await supabase.from('ai_context_cache').upsert(
    { user_id: userId, dashboard_id: chave, context_data: contexto, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() },
    { onConflict: 'user_id,dashboard_id' },
  );
  return contexto;
}

export async function invalidarContexto(supabase: SupabaseClient, userId: string, dashboardId?: string | null) {
  await supabase.from('ai_context_cache').delete().eq('user_id', userId).eq('dashboard_id', chaveDoCache(dashboardId));
}
