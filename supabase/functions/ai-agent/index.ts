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

    // Authenticate user
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

    const body = await req.json();
    const { messages, dashboardId, dashboardType, userType, action, actionData } = body;

    // Handle direct CRUD actions
    if (action) {
      const result = await handleAction(supabase, user.id, dashboardId, action, actionData);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Mensagens são obrigatórias' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user financial context
    const context = await getUserFinancialContext(supabase, user.id, dashboardId);

    const isPersonal = dashboardType === 'personal';
    const accountLabel = isPersonal ? 'pessoal' : 'empresarial';

    const systemPrompt = buildSystemPrompt(context, accountLabel, userType, isPersonal);

    // Define tools for structured actions
    const tools = [
      {
        type: "function",
        function: {
          name: "register_expense",
          description: "Registrar uma nova despesa/gasto no sistema financeiro do usuário",
          parameters: {
            type: "object",
            properties: {
              descricao: { type: "string", description: "Descrição da despesa" },
              valor: { type: "number", description: "Valor da despesa em reais" },
              categoria: { type: "string", description: "Categoria da despesa" },
              data: { type: "string", description: "Data no formato YYYY-MM-DD. Use a data atual se não especificada." },
              forma_pagamento: { type: "string", description: "Forma de pagamento: Dinheiro, Cartão de Crédito, Cartão de Débito, Pix, Boleto, Transferência" },
              fornecedor: { type: "string", description: "Fornecedor ou estabelecimento (opcional)" }
            },
            required: ["descricao", "valor", "categoria"],
            additionalProperties: false
          }
        }
      },
      {
        type: "function",
        function: {
          name: "register_revenue",
          description: "Registrar uma nova receita/ganho no sistema financeiro do usuário",
          parameters: {
            type: "object",
            properties: {
              descricao: { type: "string", description: "Descrição da receita" },
              valor: { type: "number", description: "Valor da receita em reais" },
              categoria: { type: "string", description: "Categoria da receita" },
              data: { type: "string", description: "Data no formato YYYY-MM-DD. Use a data atual se não especificada." },
              forma_pagamento: { type: "string", description: "Forma de pagamento: Dinheiro, Cartão de Crédito, Cartão de Débito, Pix, Boleto, Transferência" },
              cliente: { type: "string", description: "Nome do cliente (opcional)" }
            },
            required: ["descricao", "valor", "categoria"],
            additionalProperties: false
          }
        }
      },
      {
        type: "function",
        function: {
          name: "query_financial_data",
          description: "Consultar dados financeiros do usuário como receitas, despesas, lucro, etc. Use para responder perguntas como 'quanto faturei', 'quanto gastei', 'qual meu lucro'",
          parameters: {
            type: "object",
            properties: {
              query_type: { type: "string", enum: ["receitas", "despesas", "lucro", "saldo", "por_categoria", "por_periodo", "impostos", "metas"], description: "Tipo de consulta" },
              periodo: { type: "string", enum: ["hoje", "ontem", "esta_semana", "este_mes", "mes_passado", "ultimos_30_dias", "ultimos_90_dias", "este_ano", "ano_passado", "tudo"], description: "Período da consulta" },
              categoria: { type: "string", description: "Filtrar por categoria específica (opcional)" }
            },
            required: ["query_type"],
            additionalProperties: false
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_transaction",
          description: "Excluir uma transação (receita ou despesa) pelo ID",
          parameters: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["receita", "despesa"], description: "Tipo da transação" },
              id: { type: "number", description: "ID da transação a ser excluída" }
            },
            required: ["type", "id"],
            additionalProperties: false
          }
        }
      }
    ];

    // Call Lovable AI Gateway
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
          ...messages,
        ],
        tools,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com o suporte." }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: "Erro ao processar IA" }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];

    if (!choice) {
      return new Response(JSON.stringify({ error: "Resposta vazia da IA" }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle tool calls
    if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolResults = [];
      for (const toolCall of choice.message.tool_calls) {
        const fnName = toolCall.function.name;
        let args;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          args = {};
        }

        let result;
        try {
          result = await executeToolCall(supabase, user.id, dashboardId, fnName, args);
        } catch (e) {
          result = { success: false, error: e.message };
        }

        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result),
        });
      }

      // Send tool results back to AI for final response
      const followUp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            choice.message,
            ...toolResults,
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!followUp.ok) {
        // Still return tool results as context
        const toolSummary = toolResults.map(r => JSON.parse(r.content));
        const successOps = toolSummary.filter(r => r.success);
        const failedOps = toolSummary.filter(r => !r.success);
        let responseText = '';
        if (successOps.length > 0) responseText += successOps.map(r => r.message || 'Operação realizada').join('\n');
        if (failedOps.length > 0) responseText += '\n' + failedOps.map(r => `❌ ${r.error}`).join('\n');

        return new Response(JSON.stringify({
          response: responseText || 'Operação concluída.',
          tool_results: toolSummary,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const followUpData = await followUp.json();
      const finalContent = followUpData.choices?.[0]?.message?.content || 'Operação concluída.';

      // Save conversation
      await saveConversation(supabase, user.id, messages[messages.length - 1]?.content || '', finalContent);

      return new Response(JSON.stringify({
        response: finalContent,
        tool_results: toolResults.map(r => JSON.parse(r.content)),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No tool calls, just text response
    const responseContent = choice.message?.content || 'Desculpe, não consegui gerar uma resposta.';

    // Save conversation
    await saveConversation(supabase, user.id, messages[messages.length - 1]?.content || '', responseContent);

    return new Response(JSON.stringify({
      response: responseContent,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error("ai-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ================= Helper Functions =================

async function saveConversation(supabase: any, userId: string, message: string, response: string) {
  try {
    await supabase.from('ai_conversations').insert({
      user_id: userId,
      agent_type: 'financy_assistant',
      message: message.slice(0, 5000),
      response: response.slice(0, 10000),
      metadata: { timestamp: new Date().toISOString() },
    });
  } catch (e) {
    console.error('Error saving conversation:', e);
  }
}

async function getUserFinancialContext(supabase: any, userId: string, dashboardId?: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  // Parallel queries
  const dashFilter = dashboardId
    ? (q: any) => q.eq('user_id', userId).eq('dashboard_id', dashboardId)
    : (q: any) => q.eq('user_id', userId);

  const [receitasRes, despesasRes, metasRes, impostosRes, onboardingRes] = await Promise.all([
    dashFilter(supabase.from('receitas').select('id, data, descricao, categoria, valor, cliente, forma_pagamento, status')).gte('data', startOfMonth).order('data', { ascending: false }).limit(50),
    dashFilter(supabase.from('despesas').select('id, data, descricao, categoria, valor, fornecedor, forma_pagamento, status')).gte('data', startOfMonth).order('data', { ascending: false }).limit(50),
    dashFilter(supabase.from('metas').select('titulo, valor_meta, valor_atual, progresso, prazo, status')).limit(20),
    dashFilter(supabase.from('impostos').select('descricao, tipo, valor, vencimento, pago')).limit(20),
    supabase.from('onboarding_data').select('user_type, nome_preferido').eq('user_id', userId).maybeSingle(),
  ]);

  const receitas = receitasRes.data || [];
  const despesas = despesasRes.data || [];
  const metas = metasRes.data || [];
  const impostos = impostosRes.data || [];
  const onboarding = onboardingRes.data;

  const totalReceitas = receitas.reduce((s: number, r: any) => s + Number(r.valor || 0), 0);
  const totalDespesas = despesas.reduce((s: number, d: any) => s + Number(d.valor || 0), 0);
  const lucro = totalReceitas - totalDespesas;

  // Categories breakdown
  const catDespesas: Record<string, number> = {};
  despesas.forEach((d: any) => { catDespesas[d.categoria] = (catDespesas[d.categoria] || 0) + Number(d.valor || 0); });
  const catReceitas: Record<string, number> = {};
  receitas.forEach((r: any) => { catReceitas[r.categoria] = (catReceitas[r.categoria] || 0) + Number(r.valor || 0); });

  return {
    nomePreferido: onboarding?.nome_preferido || '',
    userType: onboarding?.user_type || 'pessoal',
    mes: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    totalReceitas,
    totalDespesas,
    lucro,
    numReceitas: receitas.length,
    numDespesas: despesas.length,
    categoriasDespesas: catDespesas,
    categoriasReceitas: catReceitas,
    metas: metas.slice(0, 5),
    impostos: impostos.slice(0, 5),
    ultimasReceitas: receitas.slice(0, 5),
    ultimasDespesas: despesas.slice(0, 5),
  };
}

function buildSystemPrompt(ctx: any, accountLabel: string, userType: string, isPersonal: boolean): string {
  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return `Você é o assistente financeiro inteligente da Financy, uma plataforma de gestão financeira brasileira.

CONTEXTO DO USUÁRIO:
- Nome: ${ctx.nomePreferido || 'Usuário'}
- Tipo de conta: ${accountLabel} (${userType})
- Dashboard: ${isPersonal ? 'Pessoal' : 'Empresarial'}

DADOS FINANCEIROS DO MÊS (${ctx.mes}):
- Total de Receitas: ${formatBRL(ctx.totalReceitas)} (${ctx.numReceitas} registros)
- Total de Despesas: ${formatBRL(ctx.totalDespesas)} (${ctx.numDespesas} registros)
- ${isPersonal ? 'Saldo' : 'Lucro Líquido'}: ${formatBRL(ctx.lucro)}

DESPESAS POR CATEGORIA:
${Object.entries(ctx.categoriasDespesas).map(([cat, val]) => `- ${cat}: ${formatBRL(val as number)}`).join('\n') || '- Nenhuma despesa registrada'}

RECEITAS POR CATEGORIA:
${Object.entries(ctx.categoriasReceitas).map(([cat, val]) => `- ${cat}: ${formatBRL(val as number)}`).join('\n') || '- Nenhuma receita registrada'}

${ctx.metas.length > 0 ? `METAS ATIVAS:\n${ctx.metas.map((m: any) => `- ${m.titulo}: ${m.progresso}% (${formatBRL(m.valor_atual)}/${formatBRL(m.valor_meta)})`).join('\n')}` : ''}

${ctx.impostos.length > 0 ? `IMPOSTOS:\n${ctx.impostos.map((i: any) => `- ${i.descricao}: ${formatBRL(i.valor)} (venc: ${i.vencimento}) ${i.pago ? '✅' : '⚠️ Pendente'}`).join('\n')}` : ''}

ÚLTIMAS TRANSAÇÕES:
${ctx.ultimasReceitas.slice(0, 3).map((r: any) => `📈 ${r.data}: ${r.descricao} - ${formatBRL(r.valor)}`).join('\n') || ''}
${ctx.ultimasDespesas.slice(0, 3).map((d: any) => `📉 ${d.data}: ${d.descricao} - ${formatBRL(d.valor)}`).join('\n') || ''}

INSTRUÇÕES:
1. Responda SEMPRE em português brasileiro, de forma natural e amigável como um chat
2. Adapte sua linguagem ao tipo de conta: ${isPersonal ? 'use termos como "saldo", "gastos pessoais", "economia"' : 'use termos como "faturamento", "custos operacionais", "margem de lucro", "fluxo de caixa"'}
3. Quando o usuário mencionar gastos ou receitas, USE AS FERRAMENTAS para registrar automaticamente
4. Para consultas financeiras, USE as ferramentas de query para dados precisos
5. Seja proativo: sugira insights, alertas e melhorias baseados nos dados
6. Se o saldo/lucro estiver negativo, alerte com cuidado e sugira ações
7. Classifique transações automaticamente nas categorias existentes
8. ${isPersonal ? 'Categorias pessoais: alimentacao, transporte, saude, educacao, lazer, vestuario, casa, contas, outros' : 'Categorias empresariais: vendas, servicos, marketing, tecnologia, escritorio, pessoal, impostos, estoque, logistica, outros'}
9. Para valores, use sempre R$ com formatação brasileira
10. Mantenha contexto da conversa - se o usuário perguntar "e ontem?" depois de "quanto faturei hoje?", entenda o contexto
11. Quando registrar transações, informe o que foi registrado e o impacto no saldo/lucro
12. Use emojis com moderação para tornar respostas mais visuais
13. Se não souber algo específico, seja honesto e sugira alternativas
14. Formate respostas com markdown quando útil (listas, negrito, etc.)`;
}

async function executeToolCall(supabase: any, userId: string, dashboardId: string, fnName: string, args: any) {
  const today = new Date().toISOString().split('T')[0];

  switch (fnName) {
    case 'register_expense': {
      const { data, error } = await supabase.from('despesas').insert({
        user_id: userId,
        dashboard_id: dashboardId,
        descricao: args.descricao,
        valor: args.valor,
        categoria: args.categoria,
        data: args.data || today,
        forma_pagamento: args.forma_pagamento || 'Pix',
        fornecedor: args.fornecedor || '',
        status: 'paga',
      }).select().single();

      if (error) throw new Error(`Erro ao registrar despesa: ${error.message}`);
      return { success: true, message: `Despesa "${args.descricao}" de R$ ${args.valor.toFixed(2)} registrada com sucesso!`, id: data.id };
    }

    case 'register_revenue': {
      const { data, error } = await supabase.from('receitas').insert({
        user_id: userId,
        dashboard_id: dashboardId,
        descricao: args.descricao,
        valor: args.valor,
        categoria: args.categoria,
        data: args.data || today,
        forma_pagamento: args.forma_pagamento || 'Pix',
        cliente: args.cliente || '',
        status: 'paga',
      }).select().single();

      if (error) throw new Error(`Erro ao registrar receita: ${error.message}`);
      return { success: true, message: `Receita "${args.descricao}" de R$ ${args.valor.toFixed(2)} registrada com sucesso!`, id: data.id };
    }

    case 'query_financial_data': {
      return await queryFinancialData(supabase, userId, dashboardId, args);
    }

    case 'delete_transaction': {
      const table = args.type === 'receita' ? 'receitas' : 'despesas';
      const { error } = await supabase.from(table).delete().eq('id', args.id).eq('user_id', userId);
      if (error) throw new Error(`Erro ao excluir: ${error.message}`);
      return { success: true, message: `${args.type === 'receita' ? 'Receita' : 'Despesa'} #${args.id} excluída com sucesso!` };
    }

    default:
      return { success: false, error: `Ferramenta desconhecida: ${fnName}` };
  }
}

async function queryFinancialData(supabase: any, userId: string, dashboardId: string, args: any) {
  const now = new Date();
  let startDate: string;
  let endDate = now.toISOString().split('T')[0];

  switch (args.periodo || 'este_mes') {
    case 'hoje': startDate = endDate; break;
    case 'ontem': {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      startDate = endDate = y.toISOString().split('T')[0];
      break;
    }
    case 'esta_semana': {
      const w = new Date(now); w.setDate(w.getDate() - w.getDay());
      startDate = w.toISOString().split('T')[0]; break;
    }
    case 'este_mes': startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; break;
    case 'mes_passado': {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      break;
    }
    case 'ultimos_30_dias': { const d = new Date(now); d.setDate(d.getDate() - 30); startDate = d.toISOString().split('T')[0]; break; }
    case 'ultimos_90_dias': { const d = new Date(now); d.setDate(d.getDate() - 90); startDate = d.toISOString().split('T')[0]; break; }
    case 'este_ano': startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]; break;
    case 'ano_passado': {
      startDate = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
      endDate = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
      break;
    }
    case 'tudo': startDate = '2020-01-01'; break;
    default: startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }

  const buildQuery = (table: string) => {
    let q = supabase.from(table).select('*').eq('user_id', userId).gte('data', startDate).lte('data', endDate);
    if (dashboardId) q = q.eq('dashboard_id', dashboardId);
    if (args.categoria) q = q.eq('categoria', args.categoria);
    return q.order('data', { ascending: false }).limit(200);
  };

  if (args.query_type === 'receitas' || args.query_type === 'lucro' || args.query_type === 'saldo' || args.query_type === 'por_categoria' || args.query_type === 'por_periodo') {
    const [recRes, despRes] = await Promise.all([buildQuery('receitas'), buildQuery('despesas')]);
    const receitas = recRes.data || [];
    const despesas = despRes.data || [];
    const totalRec = receitas.reduce((s: number, r: any) => s + Number(r.valor), 0);
    const totalDesp = despesas.reduce((s: number, d: any) => s + Number(d.valor), 0);

    if (args.query_type === 'por_categoria') {
      const catRec: Record<string, number> = {};
      const catDesp: Record<string, number> = {};
      receitas.forEach((r: any) => { catRec[r.categoria] = (catRec[r.categoria] || 0) + Number(r.valor); });
      despesas.forEach((d: any) => { catDesp[d.categoria] = (catDesp[d.categoria] || 0) + Number(d.valor); });
      return { success: true, data: { receitas_por_categoria: catRec, despesas_por_categoria: catDesp, total_receitas: totalRec, total_despesas: totalDesp, lucro: totalRec - totalDesp } };
    }

    return { success: true, data: { total_receitas: totalRec, total_despesas: totalDesp, lucro: totalRec - totalDesp, num_receitas: receitas.length, num_despesas: despesas.length, periodo: `${startDate} a ${endDate}` } };
  }

  if (args.query_type === 'despesas') {
    const { data } = await buildQuery('despesas');
    const despesas = data || [];
    const total = despesas.reduce((s: number, d: any) => s + Number(d.valor), 0);
    const cats: Record<string, number> = {};
    despesas.forEach((d: any) => { cats[d.categoria] = (cats[d.categoria] || 0) + Number(d.valor); });
    return { success: true, data: { total, count: despesas.length, por_categoria: cats, periodo: `${startDate} a ${endDate}` } };
  }

  if (args.query_type === 'impostos') {
    let q = supabase.from('impostos').select('*').eq('user_id', userId);
    if (dashboardId) q = q.eq('dashboard_id', dashboardId);
    const { data } = await q.limit(50);
    const impostos = data || [];
    const totalPago = impostos.filter((i: any) => i.pago).reduce((s: number, i: any) => s + Number(i.valor), 0);
    const totalPendente = impostos.filter((i: any) => !i.pago).reduce((s: number, i: any) => s + Number(i.valor), 0);
    return { success: true, data: { total_pago: totalPago, total_pendente: totalPendente, count: impostos.length, proximos_vencimentos: impostos.filter((i: any) => !i.pago).slice(0, 5) } };
  }

  if (args.query_type === 'metas') {
    let q = supabase.from('metas').select('*').eq('user_id', userId);
    if (dashboardId) q = q.eq('dashboard_id', dashboardId);
    const { data } = await q.limit(20);
    return { success: true, data: { metas: data || [] } };
  }

  return { success: false, error: 'Tipo de consulta não suportado' };
}

async function handleAction(supabase: any, userId: string, dashboardId: string, action: string, data: any) {
  return await executeToolCall(supabase, userId, dashboardId, action, data);
}
