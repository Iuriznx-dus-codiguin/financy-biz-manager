import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
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

    const { dashboardId, dashboardType, timeFilter } = await req.json();
    const isPersonal = dashboardType === 'personal';

    // Build date range from timeFilter
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

    const [recRes, despRes, impRes, metRes, eqRes, onbRes] = await Promise.all([
      buildFilter(supabase.from('receitas').select('data, descricao, categoria, valor, status'))
        .gte('data', startDate).lte('data', endDate).order('data', { ascending: false }).limit(500),
      buildFilter(supabase.from('despesas').select('data, descricao, categoria, valor, status'))
        .gte('data', startDate).lte('data', endDate).order('data', { ascending: false }).limit(500),
      buildFilter(supabase.from('impostos').select('descricao, tipo, valor, vencimento, pago'))
        .gte('vencimento', startDate).lte('vencimento', endDate).limit(100),
      buildFilter(supabase.from('metas').select('titulo, valor_meta, valor_atual, progresso, prazo, status')).limit(20),
      buildFilter(supabase.from('equipe_membros').select('nome, cargo, salario, status, periodicidade')).limit(50),
      supabase.from('onboarding_data').select('user_type, nome_preferido').eq('user_id', user.id).maybeSingle(),
    ]);

    const receitas = recRes.data || [];
    const despesas = despRes.data || [];
    const impostos = impRes.data || [];
    const metas = metRes.data || [];
    const equipe = eqRes.data || [];
    const onboarding = onbRes.data;

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
    const formatBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    // Build context for AI
    const dataContext = `
DADOS FINANCEIROS (${startDate} a ${endDate}):
- Receitas: ${formatBRL(totalRec)} (${receitas.length} registros)
- Despesas: ${formatBRL(totalDesp)} (${despesas.length} registros)
- Impostos pagos: ${formatBRL(totalImpPago)} | Pendentes: ${formatBRL(totalImpPendente)}
${gastosEquipe > 0 ? `- Custos com equipe: ${formatBRL(gastosEquipe)} (${equipe.filter((e: any) => e.status === 'ativo').length} membros ativos)` : ''}
- ${isPersonal ? 'Saldo' : 'Lucro líquido'}: ${formatBRL(lucro)}
- Margem: ${margem.toFixed(1)}%

Despesas por categoria: ${JSON.stringify(catDesp)}
Receitas por categoria: ${JSON.stringify(catRec)}
${metas.length > 0 ? `Metas: ${metas.map((m: any) => `${m.titulo}: ${m.progresso}%`).join(', ')}` : ''}
${impostos.filter((i: any) => !i.pago).length > 0 ? `Impostos pendentes: ${impostos.filter((i: any) => !i.pago).map((i: any) => `${i.descricao} ${formatBRL(Number(i.valor))} venc ${i.vencimento}`).join('; ')}` : ''}
Tem dados: receitas=${receitas.length > 0}, despesas=${despesas.length > 0}
`;

    const systemPrompt = isPersonal
      ? `Você é um consultor financeiro pessoal da plataforma Financy. Analise os dados financeiros pessoais e gere EXATAMENTE 3-5 insights práticos e acionáveis.

Foque em:
- Padrões de gastos e economia
- Saúde financeira pessoal (saldo positivo/negativo)
- Oportunidades de economia (categorias com gastos altos)
- Alertas sobre contas/impostos pendentes
- Progresso em metas pessoais
- Dicas práticas de economia

Responda em JSON com a estrutura:
{"insights": [{"tipo": "alerta|sucesso|dica|info", "titulo": "...", "descricao": "...", "acao": "..."}, ...]}

Se não houver dados suficientes, retorne insights motivacionais para começar a registrar transações.
Tipo "alerta" = vermelho (problemas), "sucesso" = verde (positivo), "dica" = amarelo (sugestões), "info" = azul (informativo).
Não repita dados brutos. Seja analítico e perspicaz. Use linguagem simples e direta.`
      : `Você é um consultor financeiro empresarial da plataforma Financy. Analise os dados financeiros da empresa e gere EXATAMENTE 3-5 insights estratégicos.

Foque em:
- Margem de lucro e eficiência operacional
- Fluxo de caixa e runway (sobrevivência)
- ROI por categoria de investimento
- Carga tributária e planejamento fiscal
- Custos com equipe vs receita
- Tendências de faturamento
- Riscos financeiros e oportunidades

Responda em JSON com a estrutura:
{"insights": [{"tipo": "alerta|sucesso|dica|info", "titulo": "...", "descricao": "...", "acao": "..."}, ...]}

Se não houver dados suficientes, retorne insights sobre como começar a organizar as finanças empresariais.
Tipo "alerta" = vermelho (riscos), "sucesso" = verde (indicadores positivos), "dica" = amarelo (oportunidades), "info" = azul (métricas).
Foque em KPIs empresariais. Seja estratégico e data-driven.`;

    // Use tool calling for structured output
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
            description: "Gerar insights financeiros estruturados",
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
        temperature: 0.7,
        max_tokens: 1500,
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

    // Fallback if no insights generated
    if (insights.length === 0) {
      insights = [
        {
          tipo: "info",
          titulo: isPersonal ? "Comece a registrar" : "Configure suas finanças",
          descricao: isPersonal
            ? "Registre suas receitas e despesas para receber insights personalizados sobre sua saúde financeira."
            : "Adicione receitas e despesas para que a IA analise a performance do seu negócio.",
          acao: isPersonal ? "Registre seu primeiro gasto ou recebimento" : "Cadastre seu faturamento mensal"
        }
      ];
    }

    // Include summary metrics
    const metrics = {
      totalReceitas: totalRec,
      totalDespesas: totalDesp,
      lucro,
      margem,
      totalImpostosPendente: totalImpPendente,
      gastosEquipe,
      periodo: `${startDate} a ${endDate}`,
    };

    return new Response(JSON.stringify({ insights, metrics }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error("ai-financial-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
