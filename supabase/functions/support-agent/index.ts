// Assistente de suporte (página Suporte). Não exige assinatura: suporte é uma das páginas liberadas sem ela.
// Contrato mantido: corpo { message, conversationId } →
// { conversationId, response, matchedCode, state, ticketId, escalated } | { error, code, conversationId? }.
import { usuarioDaRequisicao } from '../_shared/auth.ts';
import { ErroHttp, json, lerJson, requisicaoInvalida, servir } from '../_shared/http.ts';
import { chamarIA } from '../_shared/ia.ts';
import { log } from '../_shared/logger.ts';
import { resumoDosPlanos } from '../_shared/planos.ts';
import { formatarBRL } from '../_shared/dinheiro.ts';
import { clienteServico, type SupabaseClient } from '../_shared/supabase.ts';

const MAX_CHARS = 1500;
const MAX_DAILY_MESSAGES = 60;
const MODELO = 'google/gemini-3.6-flash';

interface CatalogEntry {
  code: string;
  title: string;
  user_description: string;
  severity: string;
  module: string;
  flow: string | null;
  probable_causes: unknown;
  resolution_steps: unknown;
  ai_resolvable: boolean;
  related_codes: string[] | null;
}

function novoTicket(): string {
  const n = (crypto.getRandomValues(new Uint32Array(1))[0] % 900000) + 100000;
  return `FY-${new Date().getFullYear()}-${n}`;
}

const VISAO_GERAL = `
Financy é uma plataforma brasileira de gestão financeira pessoal e empresarial.
Funcionalidades reais:
- Painel com métricas de receitas, despesas, saldo e gráficos.
- Receitas e Despesas: cadastro manual, categorias, formas de pagamento, status (pago/pendente) e recorrência (as próximas ocorrências são geradas automaticamente todo dia ou pelo botão "Processar agora").
- Categorias personalizadas por perfil/empresa (não é possível excluir categoria com lançamentos).
- Impostos e Taxas: valores fixos ou percentuais, vencimentos e pagamentos.
- Metas com progresso.
- Relatórios com filtros de período.
- Fechamento de Caixa e Equipe: apenas em perfis empresariais.
- Vários perfis/empresas por conta, conforme o plano, com seletor no topo.
- Importação e exportação de planilhas.
- Assistente de IA no aplicativo e no WhatsApp.
- Configurações: perfil, telefone (formato +55), tema claro/escuro.

ASSINATURA (Cakto)
Não existe plano gratuito nem teste grátis. Sem assinatura ativa o usuário acessa apenas Assinatura, Configurações, Ajuda e Suporte.
Planos:
${resumoDosPlanos(formatarBRL)}
A assinatura é feita pela página Assinatura (checkout seguro da Cakto); o acesso é liberado assim que o pagamento é confirmado.
Atendimento humano: pelo WhatsApp, das 8h às 18h, ou pelo encaminhamento deste chat.
Não invente funcionalidades, preços ou prazos que não estejam neste texto.
`;

async function mensagensUltimas24h(supabase: SupabaseClient, userId: string): Promise<number> {
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('support_messages')
    .select('id, support_conversations!inner(user_id)', { count: 'exact', head: true })
    .eq('role', 'user')
    .gte('created_at', desde)
    .eq('support_conversations.user_id', userId);
  if (error) throw new ErroHttp(503, 'LIMITE_INDISPONIVEL', 'Não foi possível verificar o limite de uso. Tente novamente.');
  return count ?? 0;
}

servir('support-agent', async (req) => {
  if (req.method !== 'POST') throw requisicaoInvalida('Método não suportado');
  const usuario = await usuarioDaRequisicao(req);
  const corpo = await lerJson<{ message?: unknown; conversationId?: unknown }>(req);
  const supabase = clienteServico();

  const message = String(corpo.message ?? '').trim();
  if (!message) throw requisicaoInvalida('Mensagem vazia.');
  if (message.length > MAX_CHARS) throw requisicaoInvalida(`Mensagem muito longa (máx. ${MAX_CHARS} caracteres).`);
  if ((await mensagensUltimas24h(supabase, usuario.id)) >= MAX_DAILY_MESSAGES) {
    throw new ErroHttp(429, 'LIMITE_ATINGIDO', 'Limite diário de mensagens de suporte atingido. Tente novamente amanhã.');
  }

  // Conversa: só reaproveita a do próprio usuário.
  let conversationId = typeof corpo.conversationId === 'string' ? corpo.conversationId : null;
  if (conversationId) {
    const { data: conversa } = await supabase.from('support_conversations').select('id')
      .eq('id', conversationId).eq('user_id', usuario.id).maybeSingle();
    if (!conversa) conversationId = null;
  }
  if (!conversationId) {
    const { data: criada, error } = await supabase.from('support_conversations')
      .insert({ user_id: usuario.id, subject: message.slice(0, 80), state: 'open' }).select('id').single();
    if (error || !criada) {
      log('error', 'support-agent.conversa_nao_criada', { erro: error?.message });
      throw new ErroHttp(500, 'ERRO_CONVERSA', 'Não foi possível abrir o atendimento.');
    }
    conversationId = criada.id as string;
  }

  // Últimas 30 mensagens (antes vinham as 30 primeiras).
  const [historico, catalogo, ocorrencias] = await Promise.all([
    supabase.from('support_messages').select('role, content').eq('conversation_id', conversationId)
      .order('created_at', { ascending: false }).limit(30),
    supabase.from('error_catalog')
      .select('code,title,user_description,severity,module,flow,probable_causes,resolution_steps,ai_resolvable,related_codes')
      .order('code'),
    supabase.from('error_occurrences').select('error_code, route, created_at, status')
      .eq('user_id', usuario.id).order('created_at', { ascending: false }).limit(10),
  ]);

  await supabase.from('support_messages').insert({ conversation_id: conversationId, role: 'user', content: message });

  const entradas = (catalogo.data ?? []) as CatalogEntry[];
  const textoCatalogo = entradas.map((e) => [
    `CÓDIGO ${e.code} — ${e.title}`,
    `Módulo: ${e.module}${e.flow ? ` / ${e.flow}` : ''} | Severidade: ${e.severity} | Resolúvel pela IA: ${e.ai_resolvable ? 'sim' : 'não'}`,
    `Explicação ao usuário: ${e.user_description}`,
    `Causas prováveis: ${JSON.stringify(e.probable_causes)}`,
    `Passos de correção: ${JSON.stringify(e.resolution_steps)}`,
    e.related_codes?.length ? `Relacionados: ${e.related_codes.join(', ')}` : '',
  ].filter(Boolean).join('\n')).join('\n---\n');
  const textoOcorrencias = (ocorrencias.data ?? []).length
    ? (ocorrencias.data ?? []).map((o) => `- ${o.created_at} | código: ${o.error_code ?? 'sem código'} | rota: ${o.route ?? '-'} | status: ${o.status}`).join('\n')
    : 'Nenhuma ocorrência recente registrada para este usuário.';

  const sistema = `Você é o Assistente de Suporte da Financy. Responda SEMPRE em português do Brasil, tom profissional, acolhedor e objetivo.
${VISAO_GERAL}
REGRAS DE ATENDIMENTO
1. Se o usuário informar um código de erro (ex.: AUTH-001), localize-o no catálogo e apresente a explicação e os passos EXATAMENTE como estão no catálogo, reescritos em linguagem simples, numerados e sequenciais.
2. Se o usuário descrever apenas um sintoma, cruze com o catálogo e com as ocorrências recentes dele. Proponha a hipótese mais provável. Se houver ambiguidade real, faça UMA única pergunta objetiva antes de dar a solução.
3. Se não houver correspondência no catálogo, admita que não identificou o problema, informe que o caso foi registrado para a equipe e não invente causas nem soluções.
4. Nunca invente funcionalidades, planos, preços, códigos de erro ou passos.
5. Ao final de uma solução, confirme se o problema foi resolvido.
6. Nunca peça senha, token, cartão ou dados sensíveis.

FORMATO DA RESPOSTA
Markdown curto. Na ÚLTIMA linha, obrigatoriamente, os metadados exatamente neste formato:
META: {"matched_code":"CÓDIGO ou null","escalate":true|false,"resolved_hint":true|false}
"escalate": true quando o erro for crítico, quando o catálogo indicar que não é resolúvel pela IA, ou quando envolver segurança, perda de dados, divergência financeira ou cobrança.

CATÁLOGO DE ERROS
${textoCatalogo || 'Catálogo vazio.'}

OCORRÊNCIAS RECENTES DESTE USUÁRIO
${textoOcorrencias}`;

  let content: string;
  try {
    const escolha = await chamarIA({
      model: MODELO,
      messages: [
        { role: 'system', content: sistema },
        ...(historico.data ?? []).reverse().map((h) => ({ role: h.role === 'assistant' ? 'assistant' as const : 'user' as const, content: String(h.content) })),
        { role: 'user', content: message },
      ],
      temperature: 0.4,
    });
    content = escolha.message?.content ?? '';
  } catch (erro) {
    // Devolve o conversationId para o chat continuar na mesma conversa.
    if (erro instanceof ErroHttp) return json(req, { error: erro.message, code: erro.codigo, conversationId }, erro.status);
    throw erro;
  }

  let matchedCode: string | null = null;
  let escalate = false;
  const meta = content.match(/META:\s*(\{[\s\S]*\})\s*$/);
  if (meta) {
    try {
      const dados = JSON.parse(meta[1]);
      matchedCode = dados?.matched_code && dados.matched_code !== 'null' ? String(dados.matched_code) : null;
      escalate = dados?.escalate === true;
    } catch { /* metadados inválidos: ignora */ }
    content = content.replace(meta[0], '').trim();
  }
  if (!content) content = 'Não consegui gerar uma resposta agora. Pode reformular sua dúvida?';

  if (/(falar|conversar).{0,20}(atendente|humano|pessoa|equipe|suporte humano)|atendimento humano|quero um humano|suporte humano/i.test(message)) {
    escalate = true;
  }
  const entrada = matchedCode ? entradas.find((e) => e.code === matchedCode) ?? null : null;
  if (!entrada) matchedCode = null;
  if (entrada && (entrada.severity === 'critical' || entrada.ai_resolvable === false)) escalate = true;

  // Relato sem correspondência no catálogo: uma ocorrência por conversa para triagem.
  if (!entrada) {
    const { count } = await supabase.from('error_occurrences').select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId).eq('uncatalogued', true);
    if (!count) {
      await supabase.from('error_occurrences').insert({
        user_id: usuario.id, conversation_id: conversationId, error_code: null, route: '/suporte',
        context: { relato: message.slice(0, 500) }, uncatalogued: true, status: 'open',
      });
    }
  }

  let ticketId: string | null = null;
  let state = 'diagnosing';
  if (escalate) {
    state = 'escalated';
    const { data: conversa } = await supabase.from('support_conversations').select('ticket_id').eq('id', conversationId).maybeSingle();
    ticketId = (conversa?.ticket_id as string | null) ?? novoTicket();
    // Um chamado aberto por conversa (mesma regra do request_human_support).
    const { count } = await supabase.from('support_escalations').select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId).eq('status', 'open');
    if (!count) {
      await supabase.from('support_escalations').insert({
        conversation_id: conversationId,
        user_id: usuario.id,
        ticket_id: ticketId,
        reason: entrada
          ? `Erro ${entrada.code} (${entrada.severity}) exige atendimento humano`
          : 'Atendimento humano solicitado ou problema sem correspondência no catálogo',
        error_code: entrada?.code ?? null,
        severity: entrada?.severity ?? null,
        context: { relato: message.slice(0, 500), rota: '/suporte' },
      });
    }
    content += `\n\n---\n**Encaminhado para nossa equipe.** Chamado **${ticketId}**. Você pode retomar este atendimento a qualquer momento.`;
  }

  await supabase.from('support_messages').insert({ conversation_id: conversationId, role: 'assistant', content, matched_code: matchedCode });
  await supabase.from('support_conversations').update({ state, ...(ticketId ? { ticket_id: ticketId } : {}) }).eq('id', conversationId);

  return json(req, { conversationId, response: content, matchedCode, state, ticketId, escalated: escalate });
});
