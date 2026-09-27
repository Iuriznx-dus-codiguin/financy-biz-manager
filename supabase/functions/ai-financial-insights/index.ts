// Insights financeiros do painel (InteligenciaFinanceiraIA).
// Contrato mantido: corpo { dashboardId, dashboardType, timeFilter, forceRefresh } → { insights, metrics, fromCache }.
// Exige assinatura ativa e posse do dashboard; as chamadas à IA (não as respostas do cache) contam no
// limite diário 'ai_insights'. Datas do período em Brasília; totais paginados.
import { consumirLimite, exigirAssinaturaAtiva, exigirDonoDoDashboard } from '../_shared/acesso.ts';
import { usuarioDaRequisicao } from '../_shared/auth.ts';
import { lancamentosDoPeriodo } from '../_shared/consultas.ts';
import { hojeISO, intervaloDoFiltro } from '../_shared/datas.ts';
import { formatarBRL, percentual, somarReais } from '../_shared/dinheiro.ts';
import { json, lerJson, requisicaoInvalida, servir } from '../_shared/http.ts';
import { chamarIA } from '../_shared/ia.ts';
import { totalDeImpostos } from '../_shared/impostos.ts';
import { clienteServico } from '../_shared/supabase.ts';

const FILTROS = ['hoje', 'esta-semana', 'este-mes', 'mes-passado', 'ultimos-30-dias', 'ultimos-90-dias', 'este-ano'];
const LIMITE_DIARIO_IA = 40;
const TIPOS_INSIGHT = ['alerta', 'sucesso', 'dica', 'info'] as const;

interface Insight {
  tipo: (typeof TIPOS_INSIGHT)[number];
  titulo: string;
  descricao: string;
  acao: string;
}

interface Corpo {
  dashboardId?: unknown;
  dashboardType?: unknown;
  timeFilter?: unknown;
  forceRefresh?: unknown;
}

type Linha = Record<string, unknown> & { valor: number; categoria: string };

// Hash simples para detectar mudança nos dados (o mesmo de antes: mantém as chaves de cache válidas).
function hashSimples(texto: string): string {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash << 5) - hash + texto.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

function porCategoria(linhas: Linha[]): Record<string, number> {
  const grupos: Record<string, number[]> = {};
  for (const l of linhas) (grupos[l.categoria ?? 'outros'] ??= []).push(Number(l.valor));
  return Object.fromEntries(Object.entries(grupos).map(([c, v]) => [c, somarReais(v)]));
}

function insightsValidos(bruto: unknown): Insight[] {
  const lista = (bruto as { insights?: unknown })?.insights;
  if (!Array.isArray(lista)) return [];
  return lista
    .filter((i) => i && typeof i === 'object')
    .map((i) => ({
      tipo: (TIPOS_INSIGHT as readonly string[]).includes(i.tipo) ? i.tipo : 'info',
      titulo: String(i.titulo ?? '').slice(0, 80),
      descricao: String(i.descricao ?? '').slice(0, 400),
      acao: String(i.acao ?? '').slice(0, 200),
    }))
    .filter((i) => i.titulo && i.descricao)
    .slice(0, 6);
}

const FERRAMENTA = {
  type: 'function',
  function: {
    name: 'generate_insights',
    description: 'Gerar insights financeiros',
    parameters: {
      type: 'object',
      properties: {
        insights: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tipo: { type: 'string', enum: [...TIPOS_INSIGHT] },
              titulo: { type: 'string' },
              descricao: { type: 'string' },
              acao: { type: 'string' },
            },
            required: ['tipo', 'titulo', 'descricao', 'acao'],
            additionalProperties: false,
          },
        },
      },
      required: ['insights'],
      additionalProperties: false,
    },
  },
};

servir('ai-financial-insights', async (req) => {
  if (req.method !== 'POST') throw requisicaoInvalida('Método não suportado');
  const usuario = await usuarioDaRequisicao(req);
  const corpo = await lerJson<Corpo>(req);
  const supabase = clienteServico();
  const dashboardId = typeof corpo.dashboardId === 'string' && corpo.dashboardId ? corpo.dashboardId : null;
  const filtro = typeof corpo.timeFilter === 'string' && FILTROS.includes(corpo.timeFilter) ? corpo.timeFilter : 'este-mes';
  const pessoal = corpo.dashboardType === 'personal';

  await exigirAssinaturaAtiva(supabase, usuario.id);
  await exigirDonoDoDashboard(supabase, usuario.id, dashboardId);

  const { inicio, fim } = intervaloDoFiltro(filtro, hojeISO());
  const filtroLancamentos = { userId: usuario.id, dashboardId, inicio, fim };
  let impostosQ = supabase.from('impostos').select('*').eq('user_id', usuario.id).gte('vencimento', inicio).lte('vencimento', fim);
  let metasQ = supabase.from('metas').select('titulo, progresso, status').eq('user_id', usuario.id);
  let equipeQ = supabase.from('equipe_membros').select('salario, status, periodicidade').eq('user_id', usuario.id);
  if (dashboardId) {
    impostosQ = impostosQ.eq('dashboard_id', dashboardId);
    metasQ = metasQ.eq('dashboard_id', dashboardId);
    equipeQ = equipeQ.eq('dashboard_id', dashboardId);
  }

  const [receitas, despesas, impostosRes, metasRes, equipeRes] = await Promise.all([
    lancamentosDoPeriodo<Linha>(supabase, 'receitas', 'id, data, categoria, valor', filtroLancamentos),
    lancamentosDoPeriodo<Linha>(supabase, 'despesas', 'id, data, categoria, valor', filtroLancamentos),
    impostosQ.limit(500),
    metasQ.limit(20),
    equipeQ.limit(200),
  ]);
  const impostos = (impostosRes.data ?? []) as (Record<string, unknown> & { valor: number; pago: boolean })[];
  const metas = (metasRes.data ?? []) as { titulo: string; progresso: number }[];
  const equipe = (equipeRes.data ?? []) as { salario: number; status: string; periodicidade: string }[];

  const totalRec = somarReais(receitas.map((r) => r.valor));
  const totalDesp = somarReais(despesas.map((d) => d.valor));
  const totalImpPago = totalDeImpostos(impostos.filter((i) => i.pago), totalRec);
  const totalImpPendente = totalDeImpostos(impostos.filter((i) => !i.pago), totalRec);
  const gastosEquipe = somarReais(
    equipe.filter((m) => m.status === 'ativo').map((m) => {
      const salario = Number(m.salario ?? 0);
      return m.periodicidade === 'semanal' ? salario * 4 : m.periodicidade === 'quinzenal' ? salario * 2 : salario;
    }),
  );
  // Mesma fórmula de antes (modelo de resultado em revisão: ARQUITETURA-ALVO D-01).
  const lucro = somarReais([totalRec, -totalDesp, -totalImpPago, -gastosEquipe]);
  const margem = percentual(lucro, totalRec);
  const catDesp = porCategoria(despesas);
  const catRec = porCategoria(receitas);

  const metrics = {
    totalReceitas: totalRec,
    totalDespesas: totalDesp,
    lucro,
    margem,
    totalImpostosPendente: totalImpPendente,
    gastosEquipe,
    periodo: `${inicio} a ${fim}`,
  };

  const impressao = hashSimples(JSON.stringify({
    recs: receitas.length, desps: despesas.length,
    totalRec: Math.round(totalRec), totalDesp: Math.round(totalDesp),
    imps: impostos.length, totalImpPend: Math.round(totalImpPendente),
    metas: metas.length, eq: equipe.length, gastosEq: Math.round(gastosEquipe),
    fim,
  }));
  const chave = `insights_${dashboardId || 'default'}_${filtro}_${impressao}`;

  if (corpo.forceRefresh !== true) {
    const { data: cache } = await supabase
      .from('query_cache')
      .select('cached_data')
      .eq('user_id', usuario.id)
      .eq('query_key', chave)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    const emCache = insightsValidos(cache?.cached_data);
    if (emCache.length) return json(req, { insights: emCache, metrics, fromCache: true });
  }

  await consumirLimite(supabase, usuario.id, 'ai_insights', LIMITE_DIARIO_IA, 1440);

  const contexto =
    `${inicio} a ${fim}: Rec ${formatarBRL(totalRec)}(${receitas.length}), Desp ${formatarBRL(totalDesp)}(${despesas.length}), ` +
    `Imp pagos ${formatarBRL(totalImpPago)}, pend ${formatarBRL(totalImpPendente)}` +
    `${gastosEquipe > 0 ? `, Equipe ${formatarBRL(gastosEquipe)}` : ''}, ${pessoal ? 'Saldo' : 'Lucro'} ${formatarBRL(lucro)}, ` +
    `Margem ${margem.toFixed(1)}%. CatDesp: ${JSON.stringify(catDesp)}. CatRec: ${JSON.stringify(catRec)}.` +
    (metas.length ? ` Metas: ${metas.map((m) => `${m.titulo}:${m.progresso}%`).join(',')}` : '');

  const formato = '{"insights":[{"tipo":"alerta|sucesso|dica|info","titulo":"max 5 palavras","descricao":"max 2 frases","acao":"max 1 frase"}]}';
  const sistema = pessoal
    ? `Consultor financeiro pessoal da Financy. Gere 3-4 insights curtos em português do Brasil (máx. 2 frases cada). JSON: ${formato}. Com poucos dados, dê dicas práticas para começar.`
    : `Consultor empresarial da Financy. Gere 3-4 insights estratégicos curtos em português do Brasil (máx. 2 frases cada). JSON: ${formato}. Foque em margem, fluxo de caixa e custos.`;

  const escolha = await chamarIA({
    messages: [{ role: 'system', content: sistema }, { role: 'user', content: contexto }],
    tools: [FERRAMENTA],
    tool_choice: { type: 'function', function: { name: 'generate_insights' } },
    temperature: 0.5,
    max_tokens: 800,
  });

  let insights: Insight[] = [];
  const chamada = escolha.message?.tool_calls?.[0];
  if (chamada) {
    try {
      insights = insightsValidos(JSON.parse(chamada.function.arguments));
    } catch {
      insights = [];
    }
  }
  if (!insights.length) {
    insights = [{
      tipo: 'info',
      titulo: pessoal ? 'Comece a registrar' : 'Configure suas finanças',
      descricao: pessoal
        ? 'Registre entradas e gastos para receber análises personalizadas.'
        : 'Adicione receitas e despesas para analisar o desempenho da empresa.',
      acao: pessoal ? 'Registre sua primeira transação' : 'Cadastre seu faturamento',
    }];
  } else {
    await supabase.from('query_cache').upsert(
      { user_id: usuario.id, query_key: chave, cached_data: { insights }, expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() },
      { onConflict: 'user_id,query_key' },
    );
  }

  return json(req, { insights, metrics, fromCache: false });
});
