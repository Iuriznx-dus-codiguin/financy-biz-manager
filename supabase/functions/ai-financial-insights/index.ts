import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/utils.ts';

// Simple hash for change detection
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString(36);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { dashboardId, dashboardType, timeFilter, forceRefresh } = await req.json();
    const isPersonal = dashboardType === 'personal';

    // Build date range
    const now = new Date();
    let startDate: string;
    let endDate = now.toISOString().split('T')[0];

    switch (timeFilter) {
      case 'hoje': startDate = endDate; break;
      case 'esta-semana': {
        const w = new Date(now); w.setDate(w.getDate() - w.getDay());
        startDate = w.toISOString().split('T')[0]; break;
      }
      case 'este-mes': startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; break;
      case 'mes-passado': {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        break;
      }
      case 'ultimos-30-dias': { const d = new Date(now); d.setDate(d.getDate() - 30); startDate = d.toISOString().split('T')[0]; break; }
      case 'ultimos-90-dias': { const d = new Date(now); d.setDate(d.getDate() - 90); startDate = d.toISOString().split('T')[0]; break; }
      case 'este-ano': startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]; break;
      default: startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }

    // Fetch financial data
    const buildFilter = (query: any) => {
      let q = query.eq('user_id', user.id);
      if (dashboardId) q = q.eq('dashboard_id', dashboardId);
      return q;
    };

    const [recRes, despRes, impRes, metRes, eqRes] = await Promise.all([
      buildFilter(supabase.from('receitas').select('data, categoria, valor, status'))
        .gte('data', startDate).lte('data', endDate).order('data', { ascending: false }).limit(500),
      buildFilter(supabase.from('despesas').select('data, categoria, valor, status'))
        .gte('data', startDate).lte('data', endDate).order('data', { ascending: false }).limit(500),
      buildFilter(supabase.from('impostos').select('tipo, valor, vencimento, pago'))
        .gte('vencimento', startDate).lte('vencimento', endDate).limit(100),
      buildFilter(supabase.from('metas').select('titulo, progresso, status')).limit(20),
      buildFilter(supabase.from('equipe_membros').select('salario, status, periodicidade')).limit(50),
    ]);

    const receitas = recRes.data || [];
    const despesas = despRes.data || [];
    const impostos = impRes.data || [];
    const metas = metRes.data || [];
    const equipe = eqRes.data || [];

    const totalRec = receitas.reduce((s: number, r: any) => s + Number(r.valor), 0);
    const totalDesp = despesas.reduce((s: number, d: any) => s + Number(d.valor), 0);
    const totalImpPago = impostos.filter((i: any) => i.pago).reduce((s: number, i: any) => s + Number(i.valor), 0);
    const totalImpPendente = impostos.filter((i: any) => !i.pago).reduce((s: number, i: any) => s + Number(i.valor), 0);

    const gastosEquipe = equipe.filter((m: any) => m.status === 'ativo').reduce((t: number, m: any) => {
      const s = Number(m.salario || 0);
      switch (m.periodicidade) { case 'semanal': return t + s * 4; case 'quinzenal': return t + s * 2; default: return t + s; }
    }, 0);

    const catDesp: Record<string, number> = {};
    despesas.forEach((d: any) => { catDesp[d.categoria] = (catDesp[d.categoria] || 0) + Number(d.valor); });
    const catRec: Record<string, number> = {};
    receitas.forEach((r: any) => { catRec[r.categoria] = (catRec[r.categoria] || 0) + Number(r.valor); });

    const lucro = totalRec - totalDesp - totalImpPago - gastosEquipe;
    const margem = totalRec > 0 ? (lucro / totalRec) * 100 : 0;

    // Metrics to return
    const metrics = {
      totalReceitas: totalRec,
      totalDespesas: totalDesp,
      lucro,
      margem,
      totalImpostosPendente: totalImpPendente,
      gastosEquipe,
      periodo: `${startDate} a ${endDate}`,
    };

    // Create data fingerprint for cache invalidation
    const dataFingerprint = simpleHash(JSON.stringify({
      recs: receitas.length, desps: despesas.length,
      totalRec: Math.round(totalRec), totalDesp: Math.round(totalDesp),
      imps: impostos.length, totalImpPend: Math.round(totalImpPendente),
      metas: metas.length, eq: equipe.length, gastosEq: Math.round(gastosEquipe),
    }));

    const cacheKey = `insights_${dashboardId || 'default'}_${timeFilter || 'default'}_${dataFingerprint}`;

    // Check cache (skip if forceRefresh)
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('query_cache')
        .select('cached_data')
        .eq('user_id', user.id)
        .eq('query_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (cached?.cached_data) {
        return new Response(JSON.stringify({ ...cached.cached_data as any, metrics, fromCache: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const formatBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    // Compact data context
    const dataContext = `${startDate} a ${endDate}: Rec ${formatBRL(totalRec)}(${receitas.length}), Desp ${formatBRL(totalDesp)}(${despesas.length}), Imp pagos ${formatBRL(totalImpPago)}, pend ${formatBRL(totalImpPendente)}${gastosEquipe > 0 ? `, Equipe ${formatBRL(gastosEquipe)}` : ''}, ${isPersonal ? 'Saldo' : 'Lucro'} ${formatBRL(lucro)}, Margem ${margem.toFixed(1)}%. CatDesp: ${JSON.stringify(catDesp)}. CatRec: ${JSON.stringify(catRec)}.${metas.length > 0 ? ` Metas: ${metas.map((m: any) => `${m.titulo}:${m.progresso}%`).join(',')}` : ''}`;

    const systemPrompt = isPersonal
      ? `Consultor financeiro pessoal Financy. Gere 3-4 insights curtos (max 2 frases cada). JSON: {"insights":[{"tipo":"alerta|sucesso|dica|info","titulo":"max 5 palavras","descricao":"max 2 frases","acao":"max 1 frase"}]}. Sem dados insuficientes, dê dicas motivacionais.`
      : `Consultor empresarial Financy. Gere 3-4 insights estratégicos curtos (max 2 frases cada). JSON: {"insights":[{"tipo":"alerta|sucesso|dica|info","titulo":"max 5 palavras","descricao":"max 2 frases","acao":"max 1 frase"}]}. Foque em KPIs, margem, fluxo de caixa.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: dataContext },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_insights",
            description: "Gerar insights financeiros",
            parameters: {
              type: "object",
              properties: {
                insights: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      tipo: { type: "string", enum: ["alerta", "sucesso", "dica", "info"] },
                      titulo: { type: "string" },
                      descricao: { type: "string" },
                      acao: { type: "string" }
                    },
                    required: ["tipo", "titulo", "descricao", "acao"],
                    additionalProperties: false
                  }
                }
              },
              required: ["insights"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_insights" } },
        temperature: 0.5,
        max_tokens: 800,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let insights = [];
    if (toolCall) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        insights = parsed.insights || [];
      } catch {
        insights = [];
      }
    }

    if (insights.length === 0) {
      insights = [{
        tipo: "info",
        titulo: isPersonal ? "Comece a registrar" : "Configure suas finanças",
        descricao: isPersonal
          ? "Registre receitas e despesas para insights personalizados."
          : "Adicione dados para análise de performance.",
        acao: isPersonal ? "Registre sua primeira transação" : "Cadastre seu faturamento"
      }];
    }

    // Save to cache (expires in 6 hours)
    const cacheData = { insights };
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    
    await supabase.from('query_cache').upsert({
      user_id: user.id,
      query_key: cacheKey,
      cached_data: cacheData,
      expires_at: expiresAt,
    }, { onConflict: 'user_id,query_key' });

    return new Response(JSON.stringify({ insights, metrics, fromCache: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error("ai-financial-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
