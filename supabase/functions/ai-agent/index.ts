import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit } from '../_shared/utils.ts';

const ALLOWED_ORIGINS = [
  'https://app.financy.site',
  'https://financy.site',
  'https://www.financy.site',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : 'https://app.financy.site';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
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

    // Rate limit: 50 mensagens de IA por dia por usuário
    const withinLimit = await checkRateLimit(supabase, user.id, 'ai_message', 50, 1440);
    if (!withinLimit) {
      return new Response(
        JSON.stringify({ error: 'Limite diário de mensagens atingido. Tente novamente amanhã.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // Fetch user financial context (cached for 10 min)
    const context = await getCachedOrFreshContext(supabase, user.id, dashboardId);

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
          description: "Consultar dados financeiros do usuário como receitas, despesas, lucro, impostos, metas. Use SEMPRE que o usuário perguntar sobre valores, faturamento, gastos, lucro, saldo, etc. Isso inclui transações registradas manualmente na plataforma E via chat.",
          parameters: {
            type: "object",
            properties: {
              query_type: { type: "string", enum: ["receitas", "despesas", "lucro", "saldo", "por_categoria", "por_periodo", "impostos", "metas", "todas_transacoes"], description: "Tipo de consulta. Use 'todas_transacoes' para ver receitas e despesas juntas." },
              periodo: { type: "string", enum: ["hoje", "ontem", "esta_semana", "este_mes", "mes_passado", "ultimos_30_dias", "ultimos_90_dias", "este_ano", "ano_passado", "tudo"], description: "Período da consulta. Use 'tudo' para ver todo o histórico." },
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
      },
      {
        type: "function",
        function: {
          name: "update_transaction",
          description: "Atualizar uma transação existente (receita ou despesa)",
          parameters: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["receita", "despesa"], description: "Tipo da transação" },
              id: { type: "number", description: "ID da transação" },
              descricao: { type: "string", description: "Nova descrição (opcional)" },
              valor: { type: "number", description: "Novo valor (opcional)" },
              categoria: { type: "string", description: "Nova categoria (opcional)" },
              data: { type: "string", description: "Nova data YYYY-MM-DD (opcional)" }
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
        temperature: 0.5,
        max_tokens: 800,
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
          temperature: 0.5,
          max_tokens: 600,
        }),
      });

      if (!followUp.ok) {
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
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const buildFilter = (query: any) => {
    let q = query.eq('user_id', userId);
    if (dashboardId) q = q.eq('dashboard_id', dashboardId);
    return q;
  };

  // Fetch current month AND all-time totals in parallel
  const [
    receitasMesRes,
    despesasMesRes,
    receitasAnoRes,
    despesasAnoRes,
    metasRes,
    impostosRes,
    onboardingRes,
    equipeRes,
  ] = await Promise.all([
    buildFilter(supabase.from('receitas').select('id, data, descricao, categoria, valor, cliente, forma_pagamento, status'))
      .gte('data', startOfMonth).order('data', { ascending: false }).limit(100),
    buildFilter(supabase.from('despesas').select('id, data, descricao, categoria, valor, fornecedor, forma_pagamento, status'))
      .gte('data', startOfMonth).order('data', { ascending: false }).limit(100),
    buildFilter(supabase.from('receitas').select('id, data, descricao, categoria, valor, status'))
      .gte('data', startOfYear).order('data', { ascending: false }).limit(500),
    buildFilter(supabase.from('despesas').select('id, data, descricao, categoria, valor, status'))
      .gte('data', startOfYear).order('data', { ascending: false }).limit(500),
    buildFilter(supabase.from('metas').select('titulo, valor_meta, valor_atual, progresso, prazo, status')).limit(20),
    buildFilter(supabase.from('impostos').select('descricao, tipo, valor, vencimento, pago')).limit(50),
    supabase.from('onboarding_data').select('user_type, nome_preferido').eq('user_id', userId).maybeSingle(),
    buildFilter(supabase.from('equipe_membros').select('nome, cargo, salario, status, periodicidade')).limit(50),
  ]);

  const receitasMes = receitasMesRes.data || [];
  const despesasMes = despesasMesRes.data || [];
  const receitasAno = receitasAnoRes.data || [];
  const despesasAno = despesasAnoRes.data || [];
  const metas = metasRes.data || [];
  const impostos = impostosRes.data || [];
  const onboarding = onboardingRes.data;
  const equipe = equipeRes.data || [];

  const totalReceitasMes = receitasMes.reduce((s: number, r: any) => s + Number(r.valor || 0), 0);
  const totalDespesasMes = despesasMes.reduce((s: number, d: any) => s + Number(d.valor || 0), 0);
  const totalReceitasAno = receitasAno.reduce((s: number, r: any) => s + Number(r.valor || 0), 0);
  const totalDespesasAno = despesasAno.reduce((s: number, d: any) => s + Number(d.valor || 0), 0);

  // Categories breakdown for month
  const catDespesas: Record<string, number> = {};
  despesasMes.forEach((d: any) => { catDespesas[d.categoria] = (catDespesas[d.categoria] || 0) + Number(d.valor || 0); });
  const catReceitas: Record<string, number> = {};
  receitasMes.forEach((r: any) => { catReceitas[r.categoria] = (catReceitas[r.categoria] || 0) + Number(r.valor || 0); });

  // Team costs
  const gastosEquipe = equipe.filter((m: any) => m.status === 'ativo').reduce((total: number, m: any) => {
    const sal = Number(m.salario || 0);
    switch (m.periodicidade) {
      case 'semanal': return total + sal * 4;
      case 'quinzenal': return total + sal * 2;
      default: return total + sal;
    }
  }, 0);

  return {
    nomePreferido: onboarding?.nome_preferido || '',
    userType: onboarding?.user_type || 'pessoal',
    mes: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
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
    categoriasDespesas: catDespesas,
    categoriasReceitas: catReceitas,
    metas: metas.slice(0, 5),
    impostos: impostos.slice(0, 10),
    ultimasReceitas: receitasMes.slice(0, 5),
    ultimasDespesas: despesasMes.slice(0, 5),
    gastosEquipe,
    membrosEquipe: equipe.length,
  };
}

function buildSystemPrompt(ctx: any, accountLabel: string, userType: string, isPersonal: boolean): string {
  const formatBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return `Você é o assistente financeiro inteligente da Financy, uma plataforma de gestão financeira brasileira.

CONTEXTO DO USUÁRIO:
- Nome: ${ctx.nomePreferido || 'Usuário'}
- Tipo de conta: ${accountLabel} (${userType})
- Dashboard: ${isPersonal ? 'Pessoal' : 'Empresarial'}

DADOS FINANCEIROS DO MÊS ATUAL (${ctx.mes}):
- Total de Receitas: ${formatBRL(ctx.totalReceitasMes)} (${ctx.numReceitasMes} registros)
- Total de Despesas: ${formatBRL(ctx.totalDespesasMes)} (${ctx.numDespesasMes} registros)
- ${isPersonal ? 'Saldo' : 'Lucro Líquido'}: ${formatBRL(ctx.lucroMes)}
${ctx.gastosEquipe > 0 ? `- Custos com Equipe: ${formatBRL(ctx.gastosEquipe)} (${ctx.membrosEquipe} membros)` : ''}

DADOS DO ANO:
- Receitas do Ano: ${formatBRL(ctx.totalReceitasAno)} (${ctx.numReceitasAno} registros)
- Despesas do Ano: ${formatBRL(ctx.totalDespesasAno)} (${ctx.numDespesasAno} registros)
- ${isPersonal ? 'Saldo Anual' : 'Lucro Anual'}: ${formatBRL(ctx.lucroAno)}

DESPESAS POR CATEGORIA (este mês):
${Object.entries(ctx.categoriasDespesas).map(([cat, val]) => `- ${cat}: ${formatBRL(val as number)}`).join('\n') || '- Nenhuma despesa registrada'}

RECEITAS POR CATEGORIA (este mês):
${Object.entries(ctx.categoriasReceitas).map(([cat, val]) => `- ${cat}: ${formatBRL(val as number)}`).join('\n') || '- Nenhuma receita registrada'}

${ctx.metas.length > 0 ? `METAS ATIVAS:\n${ctx.metas.map((m: any) => `- ${m.titulo}: ${m.progresso}% (${formatBRL(m.valor_atual)}/${formatBRL(m.valor_meta)})`).join('\n')}` : ''}

${ctx.impostos.length > 0 ? `IMPOSTOS E TAXAS:\n${ctx.impostos.map((i: any) => `- ${i.descricao} (${i.tipo}): ${formatBRL(i.valor)} - venc: ${i.vencimento} ${i.pago ? '✅ Pago' : '⚠️ Pendente'}`).join('\n')}` : ''}

ÚLTIMAS TRANSAÇÕES DO MÊS:
${ctx.ultimasReceitas.slice(0, 5).map((r: any) => `📈 [ID:${r.id}] ${r.data}: ${r.descricao} - ${formatBRL(Number(r.valor))} (${r.categoria})`).join('\n') || 'Sem receitas'}
${ctx.ultimasDespesas.slice(0, 5).map((d: any) => `📉 [ID:${d.id}] ${d.data}: ${d.descricao} - ${formatBRL(Number(d.valor))} (${d.categoria})`).join('\n') || 'Sem despesas'}

INSTRUÇÕES IMPORTANTES:
1. Responda SEMPRE em português brasileiro, de forma CONCISA e direta (máximo 3-4 frases por resposta, exceto relatórios)
2. Adapte linguagem: ${isPersonal ? 'use "saldo", "gastos pessoais", "economia", "renda"' : 'use "faturamento", "custos operacionais", "margem de lucro", "fluxo de caixa"'}
3. Quando o usuário mencionar gastos ou receitas, USE AS FERRAMENTAS para registrar
4. Para consultas sobre valores: use query_financial_data
5. Classifique transações automaticamente
6. ${isPersonal ? 'Categorias: alimentacao, transporte, saude, educacao, lazer, vestuario, casa, contas, outros' : 'Categorias: vendas, servicos, marketing, tecnologia, escritorio, pessoal, impostos, estoque, logistica, outros'}
7. Use R$ para valores. Inclua ID ao listar transações
8. Seja breve. Evite repetir dados que o usuário já sabe. Vá direto ao ponto
9. Após registrar transação, confirme em 1 frase com o impacto no saldo`;
}

async function executeToolCall(supabase: any, userId: string, dashboardId: string, fnName: string, args: any) {
  const today = new Date().toISOString().split('T')[0];

  switch (fnName) {
    case 'register_expense': {
      const insertData: any = {
        user_id: userId,
        descricao: args.descricao,
        valor: args.valor,
        categoria: args.categoria,
        data: args.data || today,
        forma_pagamento: args.forma_pagamento || 'Pix',
        status: 'paga',
      };
      if (dashboardId) insertData.dashboard_id = dashboardId;
      if (args.fornecedor) insertData.fornecedor = args.fornecedor;

      const { data, error } = await supabase.from('despesas').insert(insertData).select().single();

      if (error) {
        console.error('Error inserting expense:', error);
        throw new Error(`Erro ao registrar despesa: ${error.message}`);
      }
      await invalidateContextCache(supabase, userId, dashboardId);
      return { success: true, type: 'expense_created', message: `✅ Despesa "${args.descricao}" de R$ ${args.valor.toFixed(2)} registrada com sucesso!`, id: data.id };
    }

    case 'register_revenue': {
      const insertData: any = {
        user_id: userId,
        descricao: args.descricao,
        valor: args.valor,
        categoria: args.categoria,
        data: args.data || today,
        forma_pagamento: args.forma_pagamento || 'Pix',
        status: 'paga',
      };
      if (dashboardId) insertData.dashboard_id = dashboardId;
      if (args.cliente) insertData.cliente = args.cliente;

      const { data, error } = await supabase.from('receitas').insert(insertData).select().single();

      if (error) {
        console.error('Error inserting revenue:', error);
        throw new Error(`Erro ao registrar receita: ${error.message}`);
      }
      await invalidateContextCache(supabase, userId, dashboardId);
      return { success: true, type: 'revenue_created', message: `✅ Receita "${args.descricao}" de R$ ${args.valor.toFixed(2)} registrada com sucesso!`, id: data.id };
    }

    case 'query_financial_data': {
      return await queryFinancialData(supabase, userId, dashboardId, args);
    }

    case 'delete_transaction': {
      const table = args.type === 'receita' ? 'receitas' : 'despesas';
      const { error } = await supabase.from(table).delete().eq('id', args.id).eq('user_id', userId);
      if (error) throw new Error(`Erro ao excluir: ${error.message}`);
      await invalidateContextCache(supabase, userId, dashboardId);
      return { success: true, type: 'transaction_deleted', message: `✅ ${args.type === 'receita' ? 'Receita' : 'Despesa'} #${args.id} excluída com sucesso!` };
    }

    case 'update_transaction': {
      const table = args.type === 'receita' ? 'receitas' : 'despesas';
      const updateData: any = {};
      if (args.descricao) updateData.descricao = args.descricao;
      if (args.valor) updateData.valor = args.valor;
      if (args.categoria) updateData.categoria = args.categoria;
      if (args.data) updateData.data = args.data;

      if (Object.keys(updateData).length === 0) {
        return { success: false, error: 'Nenhum campo para atualizar' };
      }

      const { error } = await supabase.from(table).update(updateData).eq('id', args.id).eq('user_id', userId);
      if (error) throw new Error(`Erro ao atualizar: ${error.message}`);
      await invalidateContextCache(supabase, userId, dashboardId);
      return { success: true, type: 'transaction_updated', message: `✅ ${args.type === 'receita' ? 'Receita' : 'Despesa'} #${args.id} atualizada!` };
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

  const buildReceitaQuery = () => {
    let q = supabase.from('receitas').select('id, data, descricao, categoria, valor, cliente, forma_pagamento, status')
      .eq('user_id', userId).gte('data', startDate).lte('data', endDate);
    if (dashboardId) q = q.eq('dashboard_id', dashboardId);
    if (args.categoria) q = q.eq('categoria', args.categoria);
    return q.order('data', { ascending: false }).limit(500);
  };

  const buildDespesaQuery = () => {
    let q = supabase.from('despesas').select('id, data, descricao, categoria, valor, fornecedor, forma_pagamento, status')
      .eq('user_id', userId).gte('data', startDate).lte('data', endDate);
    if (dashboardId) q = q.eq('dashboard_id', dashboardId);
    if (args.categoria) q = q.eq('categoria', args.categoria);
    return q.order('data', { ascending: false }).limit(500);
  };

  // Lightweight aggregation for totals-only queries (no need to fetch rows)
  if (['receitas', 'despesas', 'lucro', 'saldo'].includes(args.query_type)) {
    const totals = await getAggregatedTotals(supabase, userId, dashboardId, startDate, endDate, args.categoria);
    return {
      success: true,
      data: {
        total_receitas: totals.totalReceitas,
        total_despesas: totals.totalDespesas,
        lucro: totals.totalReceitas - totals.totalDespesas,
        periodo: `${startDate} a ${endDate}`,
      }
    };
  }

  // For richer query types, fetch both
  if (['por_categoria', 'por_periodo', 'todas_transacoes'].includes(args.query_type)) {
    const [recRes, despRes] = await Promise.all([buildReceitaQuery(), buildDespesaQuery()]);
    const receitas = recRes.data || [];
    const despesas = despRes.data || [];
    const totalRec = receitas.reduce((s: number, r: any) => s + Number(r.valor), 0);
    const totalDesp = despesas.reduce((s: number, d: any) => s + Number(d.valor), 0);

    if (args.query_type === 'por_categoria') {
      const catRec: Record<string, number> = {};
      const catDesp: Record<string, number> = {};
      receitas.forEach((r: any) => { catRec[r.categoria] = (catRec[r.categoria] || 0) + Number(r.valor); });
      despesas.forEach((d: any) => { catDesp[d.categoria] = (catDesp[d.categoria] || 0) + Number(d.valor); });
      return { success: true, data: { receitas_por_categoria: catRec, despesas_por_categoria: catDesp, total_receitas: totalRec, total_despesas: totalDesp, lucro: totalRec - totalDesp, periodo: `${startDate} a ${endDate}` } };
    }

    if (args.query_type === 'todas_transacoes') {
      return {
        success: true,
        data: {
          receitas: receitas.slice(0, 20).map((r: any) => ({ id: r.id, data: r.data, descricao: r.descricao, categoria: r.categoria, valor: Number(r.valor), tipo: 'receita' })),
          despesas: despesas.slice(0, 20).map((d: any) => ({ id: d.id, data: d.data, descricao: d.descricao, categoria: d.categoria, valor: Number(d.valor), tipo: 'despesa' })),
          total_receitas: totalRec,
          total_despesas: totalDesp,
          lucro: totalRec - totalDesp,
          num_receitas: receitas.length,
          num_despesas: despesas.length,
          periodo: `${startDate} a ${endDate}`,
        }
      };
    }

    return {
      success: true,
      data: {
        total_receitas: totalRec,
        total_despesas: totalDesp,
        lucro: totalRec - totalDesp,
        num_receitas: receitas.length,
        num_despesas: despesas.length,
        periodo: `${startDate} a ${endDate}`,
        ultimas_receitas: receitas.slice(0, 10).map((r: any) => ({ id: r.id, data: r.data, descricao: r.descricao, valor: Number(r.valor), categoria: r.categoria })),
        ultimas_despesas: despesas.slice(0, 10).map((d: any) => ({ id: d.id, data: d.data, descricao: d.descricao, valor: Number(d.valor), categoria: d.categoria })),
      }
    };
  }

  if (args.query_type === 'impostos') {
    let q = supabase.from('impostos').select('*').eq('user_id', userId);
    if (dashboardId) q = q.eq('dashboard_id', dashboardId);
    // Use 'vencimento' for date filtering on impostos table
    q = q.gte('vencimento', startDate).lte('vencimento', endDate);
    const { data } = await q.order('vencimento', { ascending: true }).limit(100);
    const impostos = data || [];
    const totalPago = impostos.filter((i: any) => i.pago).reduce((s: number, i: any) => s + Number(i.valor), 0);
    const totalPendente = impostos.filter((i: any) => !i.pago).reduce((s: number, i: any) => s + Number(i.valor), 0);
    return {
      success: true,
      data: {
        total_pago: totalPago,
        total_pendente: totalPendente,
        count: impostos.length,
        impostos: impostos.map((i: any) => ({ descricao: i.descricao, tipo: i.tipo, valor: Number(i.valor), vencimento: i.vencimento, pago: i.pago })),
      }
    };
  }

  if (args.query_type === 'metas') {
    let q = supabase.from('metas').select('*').eq('user_id', userId);
    if (dashboardId) q = q.eq('dashboard_id', dashboardId);
    const { data } = await q.limit(20);
    return { success: true, data: { metas: (data || []).map((m: any) => ({ titulo: m.titulo, valor_meta: Number(m.valor_meta), valor_atual: Number(m.valor_atual), progresso: m.progresso, prazo: m.prazo, status: m.status })) } };
  }

  return { success: false, error: 'Tipo de consulta não suportado' };
}

const ALLOWED_DIRECT_ACTIONS = new Set([
  'register_expense',
  'register_revenue',
  'delete_transaction',
  'update_transaction',
  'query_financial_data',
]);

async function handleAction(supabase: any, userId: string, dashboardId: string, action: string, data: any) {
  if (!ALLOWED_DIRECT_ACTIONS.has(action)) {
    return { success: false, error: `Ação não permitida: ${action}` };
  }
  return await executeToolCall(supabase, userId, dashboardId, action, data);
}

// ===== Cache & aggregation helpers =====

async function getCachedOrFreshContext(supabase: any, userId: string, dashboardId?: string) {
  const cacheKey = dashboardId || 'default';

  const { data: cached } = await supabase
    .from('ai_context_cache')
    .select('context_data, expires_at')
    .eq('user_id', userId)
    .eq('dashboard_id', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (cached) return cached.context_data;

  const freshContext = await getUserFinancialContext(supabase, userId, dashboardId);

  await supabase
    .from('ai_context_cache')
    .upsert(
      {
        user_id: userId,
        dashboard_id: cacheKey,
        context_data: freshContext,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
      { onConflict: 'user_id,dashboard_id' }
    );

  return freshContext;
}

async function invalidateContextCache(supabase: any, userId: string, dashboardId?: string) {
  const cacheKey = dashboardId || 'default';
  await supabase
    .from('ai_context_cache')
    .delete()
    .eq('user_id', userId)
    .eq('dashboard_id', cacheKey);
}

async function getAggregatedTotals(
  supabase: any,
  userId: string,
  dashboardId: string | undefined,
  startDate: string,
  endDate: string,
  categoria?: string
) {
  const buildAggQuery = (table: string) => {
    let q = supabase
      .from(table)
      .select('valor.sum()')
      .eq('user_id', userId)
      .gte('data', startDate)
      .lte('data', endDate);
    if (dashboardId) q = q.eq('dashboard_id', dashboardId);
    if (categoria) q = q.eq('categoria', categoria);
    return q.single();
  };

  const [recRes, despRes] = await Promise.all([
    buildAggQuery('receitas'),
    buildAggQuery('despesas'),
  ]);

  return {
    totalReceitas: Number(recRes.data?.sum || 0),
    totalDespesas: Number(despRes.data?.sum || 0),
  };
}
