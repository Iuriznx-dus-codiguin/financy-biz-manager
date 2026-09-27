// Assistente financeiro in-app (FinancyAIChat).
// Contrato mantido: corpo { messages, dashboardId, dashboardType, userType, action?, actionData? } →
// { response, tool_results? } | { error, code }.
// Exige assinatura ativa e posse do dashboard; 50 mensagens por dia por usuário.
import { consumirLimite, exigirAssinaturaAtiva, exigirDonoDoDashboard } from '../_shared/acesso.ts';
import { usuarioDaRequisicao } from '../_shared/auth.ts';
import { json, lerJson, requisicaoInvalida, servir } from '../_shared/http.ts';
import { chamarIA, type EscolhaIA, type MensagemIA } from '../_shared/ia.ts';
import { log } from '../_shared/logger.ts';
import { clienteServico, type SupabaseClient } from '../_shared/supabase.ts';
import { contextoComCache } from './contexto.ts';
import { executarFerramenta, FERRAMENTAS, NOMES_FERRAMENTAS, type ResultadoFerramenta } from './ferramentas.ts';
import { montarPrompt } from './prompt.ts';

const MAXIMO_MENSAGENS = 20;
const MAXIMO_CARACTERES = 4000;

interface Corpo {
  messages?: unknown;
  dashboardId?: unknown;
  dashboardType?: unknown;
  userType?: unknown;
  action?: unknown;
  actionData?: unknown;
}

/** Só user/assistant com texto, as últimas N, cada uma truncada: o cliente não injeta system nem tool. */
function historicoSeguro(mensagens: unknown): MensagemIA[] {
  if (!Array.isArray(mensagens)) throw requisicaoInvalida('Mensagens são obrigatórias');
  const validas = mensagens
    .filter((m): m is { role: 'user' | 'assistant'; content: string } =>
      !!m && typeof m === 'object' && ['user', 'assistant'].includes((m as { role?: string }).role ?? '') &&
      typeof (m as { content?: unknown }).content === 'string' && (m as { content: string }).content.trim() !== '')
    .slice(-MAXIMO_MENSAGENS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAXIMO_CARACTERES) }));
  if (!validas.length || validas[validas.length - 1].role !== 'user') throw requisicaoInvalida('Mensagens são obrigatórias');
  return validas;
}

async function salvarConversa(supabase: SupabaseClient, userId: string, mensagem: string, resposta: string, dashboardId: string | null) {
  const { error } = await supabase.from('ai_conversations').insert({
    user_id: userId,
    // O CHECK da tabela só aceita support | financial_intelligence | tax_specialist (antes: 'financy_assistant', sempre recusado).
    agent_type: 'financial_intelligence',
    message: mensagem.slice(0, 5000),
    response: resposta.slice(0, 10000),
    metadata: { origem: 'ai-agent', dashboard_id: dashboardId },
  });
  if (error) log('warn', 'ai-agent.conversa_nao_salva', { erro: error.message });
}

function argumentos(bruto: string): Record<string, unknown> {
  try {
    const valor = JSON.parse(bruto || '{}');
    return valor && typeof valor === 'object' ? valor : {};
  } catch {
    return {};
  }
}

servir('ai-agent', async (req) => {
  if (req.method !== 'POST') throw requisicaoInvalida('Método não suportado');
  const usuario = await usuarioDaRequisicao(req);
  const corpo = await lerJson<Corpo>(req);
  const supabase = clienteServico();
  const dashboardId = typeof corpo.dashboardId === 'string' && corpo.dashboardId ? corpo.dashboardId : null;

  await exigirAssinaturaAtiva(supabase, usuario.id);
  await exigirDonoDoDashboard(supabase, usuario.id, dashboardId);
  const escopo = { supabase, userId: usuario.id, dashboardId };

  // Ação direta (sem IA): não consome o limite de mensagens.
  if (corpo.action !== undefined && corpo.action !== null && corpo.action !== '') {
    const acao = String(corpo.action);
    if (!NOMES_FERRAMENTAS.has(acao)) return json(req, { success: false, error: `Ação não permitida: ${acao}` });
    const dados = corpo.actionData && typeof corpo.actionData === 'object' ? (corpo.actionData as Record<string, unknown>) : {};
    return json(req, await executarFerramenta(escopo, acao, dados));
  }

  const historico = historicoSeguro(corpo.messages);
  await consumirLimite(supabase, usuario.id, 'ai_message', 50, 1440);

  const contexto = await contextoComCache(supabase, usuario.id, dashboardId);
  const pessoal = corpo.dashboardType === 'personal';
  const tipoUsuario = typeof corpo.userType === 'string' ? corpo.userType.slice(0, 30) : contexto.userType;
  const sistema: MensagemIA = { role: 'system', content: montarPrompt(contexto, pessoal, tipoUsuario) };
  const ultimaMensagem = historico[historico.length - 1].content ?? '';

  const escolha: EscolhaIA = await chamarIA({
    messages: [sistema, ...historico],
    tools: FERRAMENTAS,
    temperature: 0.5,
    max_tokens: 800,
  });

  const chamadas = escolha.message?.tool_calls ?? [];
  if (!chamadas.length) {
    const resposta = escolha.message?.content || 'Desculpe, não consegui gerar uma resposta.';
    await salvarConversa(supabase, usuario.id, ultimaMensagem, resposta, dashboardId);
    return json(req, { response: resposta });
  }

  // No máximo 5 ferramentas por mensagem, em sequência (a ordem importa: registrar e depois consultar).
  const resultados: ResultadoFerramenta[] = [];
  const mensagensFerramenta: MensagemIA[] = [];
  for (const chamada of chamadas.slice(0, 5)) {
    const resultado = await executarFerramenta(escopo, chamada.function.name, argumentos(chamada.function.arguments));
    resultados.push(resultado);
    mensagensFerramenta.push({ role: 'tool', tool_call_id: chamada.id, content: JSON.stringify(resultado) });
  }

  let resposta: string;
  try {
    const final = await chamarIA({
      messages: [sistema, ...historico, { role: 'assistant', content: escolha.message?.content ?? null, tool_calls: chamadas.slice(0, 5) }, ...mensagensFerramenta],
      temperature: 0.5,
      max_tokens: 600,
    });
    resposta = final.message?.content || 'Operação concluída.';
  } catch (erro) {
    // As operações já foram feitas: responde com o resumo delas em vez de erro.
    log('warn', 'ai-agent.resposta_final_falhou', { erro: erro instanceof Error ? erro.message : String(erro) });
    resposta = resultados.map((r) => (r.success ? r.message ?? 'Operação realizada' : `❌ ${r.error}`)).join('\n') || 'Operação concluída.';
  }

  await salvarConversa(supabase, usuario.id, ultimaMensagem, resposta, dashboardId);
  return json(req, { response: resposta, tool_results: resultados });
});
