// Cliente único do Lovable AI Gateway (compatível com a API de chat da OpenAI).
import { ErroHttp } from './http.ts';
import { log } from './logger.ts';
import { variavel } from './supabase.ts';

export const MODELO_PADRAO = 'google/gemini-2.5-flash';
const URL_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

export interface MensagemIA {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

export interface PedidoIA {
  model?: string;
  messages: MensagemIA[];
  tools?: unknown[];
  tool_choice?: unknown;
  temperature?: number;
  max_tokens?: number;
}

export interface EscolhaIA {
  message?: {
    content?: string | null;
    tool_calls?: { id: string; function: { name: string; arguments: string } }[];
  };
}

export async function chamarIA(pedido: PedidoIA): Promise<EscolhaIA> {
  const resposta = await fetch(URL_GATEWAY, {
    method: 'POST',
    headers: { Authorization: `Bearer ${variavel('LOVABLE_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODELO_PADRAO, ...pedido }),
  });
  if (resposta.status === 429) {
    throw new ErroHttp(429, 'IA_SOBRECARREGADA', 'Muitas solicitações agora. Tente novamente em alguns segundos.');
  }
  if (resposta.status === 402) {
    throw new ErroHttp(402, 'IA_SEM_CREDITOS', 'O assistente está temporariamente indisponível.');
  }
  if (!resposta.ok) {
    log('error', 'ia.gateway_erro', { status: resposta.status, corpo: (await resposta.text()).slice(0, 300) });
    throw new ErroHttp(502, 'IA_INDISPONIVEL', 'Não foi possível processar sua mensagem agora.');
  }
  const dados = await resposta.json();
  const escolha = dados?.choices?.[0] as EscolhaIA | undefined;
  if (!escolha) throw new ErroHttp(502, 'IA_RESPOSTA_VAZIA', 'Resposta vazia do assistente.');
  return escolha;
}
