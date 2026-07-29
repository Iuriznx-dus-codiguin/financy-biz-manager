import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_CHARS = 1500;
const MAX_DAILY_MESSAGES = 60;

interface CatalogEntry {
  code: string;
  title: string;
  user_description: string;
  tech_description: string;
  severity: string;
  module: string;
  flow: string | null;
  probable_causes: unknown;
  resolution_steps: unknown;
  ai_resolvable: boolean;
  related_codes: string[] | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function makeTicketId() {
  const n = Math.floor(Math.random() * 900000 + 100000);
  return `FY-${new Date().getFullYear()}-${n}`;
}

const PLATFORM_OVERVIEW = `
Financy é uma plataforma brasileira de gestão financeira (web, React + Supabase).
Funcionalidades reais:
- Painel (dashboard) com métricas de receitas, despesas, saldo e gráficos.
- Receitas e Despesas: cadastro manual, categorias, formas de pagamento, status (pago/pendente) e recorrência (com botão "Processar agora").
- Categorias personalizadas por dashboard (não é possível excluir categoria com transações ativas).
- Impostos e Taxas: controle de vencimentos e pagamentos.
- Objetivos (Metas) com progresso.
- Relatórios com filtros de período.
- Fechamento de Caixa e Equipe: apenas em dashboards empresariais.
- Multi-dashboard: contas pessoais e empresariais isoladas, com seletor de dashboard no topo.
- Importação/exportação de planilhas (Google Sheets / Excel).
- Agentes de IA financeiros.
- Assinatura via Cakto (planos Plus e Pro). NÃO existe teste grátis: sem assinatura ativa o usuário fica limitado às páginas de Assinatura, Configurações e Ajuda.
- Configurações: perfil, telefone (formato +55), tema claro/escuro.
Não invente funcionalidades que não estejam nesta lista.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!SUPABASE_URL || !SERVICE_KEY || !LOVABLE_API_KEY) {
    return json({ error: "Serviço de suporte indisponível no momento." }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado." }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Não autenticado." }, 401);

    const body = await req.json();
    const message: string = (body?.message ?? "").toString().trim();
    let conversationId: string | null = body?.conversationId ?? null;

    if (!message) return json({ error: "Mensagem vazia." }, 400);
    if (message.length > MAX_CHARS) {
      return json({ error: `Mensagem muito longa (máx. ${MAX_CHARS} caracteres).` }, 400);
    }

    // Rate limit diário
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: dailyCount } = await supabase
      .from("support_messages")
      .select("id, support_conversations!inner(user_id)", { count: "exact", head: true })
      .eq("role", "user")
      .gte("created_at", since)
      .eq("support_conversations.user_id", user.id);

    if ((dailyCount ?? 0) >= MAX_DAILY_MESSAGES) {
      return json({ error: "Limite diário de mensagens de suporte atingido. Tente novamente amanhã." }, 429);
    }

    // Conversa (cria ou valida propriedade)
    if (conversationId) {
      const { data: conv } = await supabase
        .from("support_conversations")
        .select("id, user_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (!conv || conv.user_id !== user.id) conversationId = null;
    }

    if (!conversationId) {
      const { data: created, error: createErr } = await supabase
        .from("support_conversations")
        .insert({
          user_id: user.id,
          subject: message.slice(0, 80),
          state: "open",
        })
        .select("id")
        .single();
      if (createErr || !created) {
        console.error("create conversation failed", createErr);
        return json({ error: "Não foi possível abrir o atendimento." }, 500);
      }
      conversationId = created.id;
    }

    // Histórico da conversa
    const { data: history } = await supabase
      .from("support_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(30);

    // Persistir mensagem do usuário
    await supabase.from("support_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
    });

    // Catálogo de erros
    const { data: catalog } = await supabase
      .from("error_catalog")
      .select("code,title,user_description,tech_description,severity,module,flow,probable_causes,resolution_steps,ai_resolvable,related_codes")
      .order("code");

    const entries = (catalog ?? []) as CatalogEntry[];

    // Ocorrências recentes do usuário (contexto de diagnóstico)
    const { data: occurrences } = await supabase
      .from("error_occurrences")
      .select("error_code, route, created_at, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const catalogText = entries
      .map((e) =>
        [
          `CÓDIGO ${e.code} — ${e.title}`,
          `Módulo: ${e.module}${e.flow ? ` / ${e.flow}` : ""} | Severidade: ${e.severity} | Resolúvel pela IA: ${e.ai_resolvable ? "sim" : "não"}`,
          `Explicação ao usuário: ${e.user_description}`,
          `Causas prováveis: ${JSON.stringify(e.probable_causes)}`,
          `Passos de correção: ${JSON.stringify(e.resolution_steps)}`,
          e.related_codes?.length ? `Relacionados: ${e.related_codes.join(", ")}` : "",
        ].filter(Boolean).join("\n")
      )
      .join("\n---\n");

    const occurrencesText = (occurrences ?? []).length
      ? (occurrences ?? [])
          .map((o) => `- ${o.created_at} | código: ${o.error_code ?? "sem código"} | rota: ${o.route ?? "-"} | status: ${o.status}`)
          .join("\n")
      : "Nenhuma ocorrência recente registrada para este usuário.";

    const systemPrompt = `Você é o Assistente de Suporte da Financy. Responda SEMPRE em português do Brasil, tom profissional, acolhedor e objetivo.

${PLATFORM_OVERVIEW}

REGRAS DE ATENDIMENTO
1. Se o usuário informar um código de erro (ex.: AUTH-001), localize-o no catálogo e apresente a explicação e os passos EXATAMENTE como estão no catálogo, reescritos em linguagem simples, numerados e sequenciais.
2. Se o usuário descrever apenas um sintoma, cruze com o catálogo e com as ocorrências recentes dele. Proponha a hipótese mais provável. Se houver ambiguidade real entre duas ou mais possibilidades, faça UMA única pergunta objetiva antes de dar a solução.
3. Se não houver correspondência no catálogo, admita honestamente que não identificou o problema, informe que o caso foi registrado para a equipe e não invente causas nem soluções.
4. Nunca invente funcionalidades, planos, códigos de erro ou passos que não existam.
5. Ao final de uma solução, confirme se o problema foi resolvido.
6. Nunca peça senha, token, cartão ou dados sensíveis.

FORMATO DA RESPOSTA
Responda em markdown curto. Na ÚLTIMA linha, inclua obrigatoriamente uma linha de metadados exatamente neste formato:
META: {"matched_code":"CÓDIGO ou null","escalate":true|false,"resolved_hint":true|false}
Defina "escalate": true quando o erro for de severidade crítica, quando o catálogo indicar que não é resolúvel pela IA, ou quando envolver segurança, perda de dados ou divergência financeira/cobrança.

CATÁLOGO DE ERROS
${catalogText || "Catálogo vazio."}

OCORRÊNCIAS RECENTES DESTE USUÁRIO
${occurrencesText}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history ?? []).map((h) => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content })),
      { role: "user", content: message },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages,
        temperature: 0.4,
      }),
    });

    if (aiRes.status === 429) {
      return json({ error: "Muitas solicitações agora. Aguarde alguns instantes e tente novamente.", conversationId }, 429);
    }
    if (aiRes.status === 402) {
      return json({ error: "Créditos de IA esgotados. Fale com a equipe pelo suporte humano.", conversationId }, 402);
    }
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error", aiRes.status, errText);
      return json({ error: "Não foi possível processar sua mensagem agora.", conversationId }, 500);
    }

    const aiData = await aiRes.json();
    let content: string = aiData?.choices?.[0]?.message?.content ?? "";

    // Extrair metadados
    let matchedCode: string | null = null;
    let escalate = false;
    const metaMatch = content.match(/META:\s*(\{[\s\S]*\})\s*$/);
    if (metaMatch) {
      try {
        const meta = JSON.parse(metaMatch[1]);
        const mc = meta?.matched_code;
        matchedCode = mc && mc !== "null" ? String(mc) : null;
        escalate = meta?.escalate === true;
      } catch (_) { /* ignora meta inválida */ }
      content = content.replace(metaMatch[0], "").trim();
    }

    const catalogEntry = matchedCode ? entries.find((e) => e.code === matchedCode) ?? null : null;
    if (catalogEntry && (catalogEntry.severity === "critical" || catalogEntry.ai_resolvable === false)) {
      escalate = true;
    }

    // Ocorrência não catalogada → triagem humana
    if (!catalogEntry) {
      await supabase.from("error_occurrences").insert({
        user_id: user.id,
        conversation_id: conversationId,
        error_code: null,
        route: "/suporte",
        context: { relato: message.slice(0, 500) },
        uncatalogued: true,
        status: "open",
      });
    }

    // Persistir resposta
    await supabase.from("support_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content,
      matched_code: matchedCode,
    });

    // Estado da conversa / escalonamento
    let ticketId: string | null = null;
    let state = "diagnosing";

    if (escalate) {
      state = "escalated";
      const { data: conv } = await supabase
        .from("support_conversations")
        .select("ticket_id")
        .eq("id", conversationId)
        .maybeSingle();

      ticketId = conv?.ticket_id ?? makeTicketId();

      await supabase.from("support_escalations").insert({
        conversation_id: conversationId,
        user_id: user.id,
        ticket_id: ticketId,
        reason: catalogEntry
          ? `Erro ${catalogEntry.code} (${catalogEntry.severity}) exige atendimento humano`
          : "Problema sem correspondência no catálogo",
        error_code: catalogEntry?.code ?? null,
        severity: catalogEntry?.severity ?? null,
        context: { relato: message.slice(0, 500), rota: "/suporte" },
      });

      content += `\n\n---\n**Encaminhado para nossa equipe.** Chamado **${ticketId}**. Você pode retomar este atendimento a qualquer momento.`;
    }

    await supabase
      .from("support_conversations")
      .update({ state, ...(ticketId ? { ticket_id: ticketId } : {}) })
      .eq("id", conversationId);

    return json({
      conversationId,
      response: content,
      matchedCode,
      state,
      ticketId,
      escalated: escalate,
    });
  } catch (e) {
    console.error("support-agent unexpected error", e);
    return json({ error: "Erro interno no suporte. Tente novamente." }, 500);
  }
});
