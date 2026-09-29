// Respostas HTTP padronizadas: { error, code } nos erros, sem vazar detalhes internos.
import { cabecalhosCors } from './cors.ts';
import { log } from './logger.ts';
import { ConfiguracaoAusente } from './supabase.ts';

export class ErroHttp extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

export const naoAutorizado = () => new ErroHttp(401, 'NAO_AUTORIZADO', 'Não autorizado');
export const proibido = (mensagem = 'Acesso negado') => new ErroHttp(403, 'ACESSO_NEGADO', mensagem);
export const requisicaoInvalida = (mensagem = 'Dados inválidos') => new ErroHttp(400, 'DADOS_INVALIDOS', mensagem);

export function json(req: Request, corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cabecalhosCors(req), 'Content-Type': 'application/json' },
  });
}

export async function lerJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    const corpo = await req.json();
    if (!corpo || typeof corpo !== 'object') throw new Error('corpo vazio');
    return corpo as T;
  } catch {
    throw requisicaoInvalida('JSON inválido');
  }
}

/**
 * Envolve o handler: responde ao preflight, converte ErroHttp na resposta certa e qualquer outro erro
 * em 500 genérico (o detalhe vai só para o log).
 */
export function servir(nome: string, handler: (req: Request) => Promise<Response>): void {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cabecalhosCors(req) });
    try {
      return await handler(req);
    } catch (erro) {
      if (erro instanceof ErroHttp) {
        if (erro.status >= 500) log('error', `${nome}.erro`, { codigo: erro.codigo, mensagem: erro.message });
        return json(req, { error: erro.message, code: erro.codigo }, erro.status);
      }
      if (erro instanceof ConfiguracaoAusente) {
        log('error', `${nome}.configuracao_ausente`, { variavel: erro.nome });
        return json(req, { error: 'Serviço indisponível: configuração ausente', code: 'CONFIGURACAO_AUSENTE' }, 503);
      }
      log('error', `${nome}.erro_inesperado`, { erro: erro instanceof Error ? erro.message : String(erro) });
      return json(req, { error: 'Erro interno', code: 'ERRO_INTERNO' }, 500);
    }
  });
}
