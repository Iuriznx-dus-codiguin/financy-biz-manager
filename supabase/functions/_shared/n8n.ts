// Cliente do n8n. Toda chamada leva o header `x-financy-secret` (N8N_WEBHOOK_SECRET), que o n8n deve
// validar. Sem o segredo configurado a chamada falha fechada. A base da URL é configurável
// (N8N_WEBHOOK_BASE_URL); o padrão é o endereço que já estava em produção.
import { variavel } from './supabase.ts';

const BASE_PADRAO = 'https://central-financy-n8n.y8enlt.easypanel.host/webhook';

export function baseN8n(): string {
  return (Deno.env.get('N8N_WEBHOOK_BASE_URL') ?? BASE_PADRAO).replace(/\/+$/, '');
}

export function urlN8n(caminho: string): string {
  return `${baseN8n()}/${caminho.replace(/^\/+/, '')}`;
}

/** true se a URL aponta para o n8n configurado (URLs vindas do banco não viram SSRF). */
export function ehUrlDoN8n(url: string): boolean {
  return url === baseN8n() || url.startsWith(`${baseN8n()}/`);
}

export async function enviarParaN8n(url: string, corpo: unknown, timeoutMs = 10_000): Promise<Response> {
  if (!ehUrlDoN8n(url)) throw new Error(`URL fora do n8n configurado: ${url}`);
  const segredo = variavel('N8N_WEBHOOK_SECRET');
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), timeoutMs);
  try {
    const resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-financy-secret': segredo },
      body: JSON.stringify(corpo),
      signal: controle.signal,
    });
    if (!resposta.ok) throw new Error(`n8n respondeu ${resposta.status}`);
    return resposta;
  } finally {
    clearTimeout(timer);
  }
}
