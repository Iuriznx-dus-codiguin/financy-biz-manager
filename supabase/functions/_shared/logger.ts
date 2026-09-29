// Log estruturado (uma linha JSON por evento) sem dados pessoais: e-mails são mascarados e campos
// como telefone, nome, documento e tokens nunca são gravados.

const OCULTAR = /^(telefone|phone|whatsapp|nome|name|nome_completo|cpf|cnpj|document|token|secret|authorization|password|senha)$/i;

function mascararEmail(email: string): string {
  const [nome, dominio] = email.split('@');
  return nome && dominio ? `${nome.slice(0, 2)}***@${dominio}` : '***';
}

function limpar(valor: unknown, chave = '', profundidade = 0): unknown {
  if (profundidade > 5) return '[profundo]';
  if (OCULTAR.test(chave)) return valor == null ? valor : '***';
  if (typeof valor === 'string') {
    if (/email/i.test(chave)) return mascararEmail(valor);
    return valor.length > 500 ? `${valor.slice(0, 500)}…` : valor;
  }
  if (Array.isArray(valor)) return valor.slice(0, 20).map((v) => limpar(v, chave, profundidade + 1));
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, limpar(v, k, profundidade + 1)]));
  }
  return valor;
}

export function log(nivel: 'info' | 'warn' | 'error', evento: string, dados: Record<string, unknown> = {}): void {
  const linha = JSON.stringify({ nivel, evento, ...(limpar(dados) as Record<string, unknown>) });
  if (nivel === 'error') console.error(linha);
  else if (nivel === 'warn') console.warn(linha);
  else console.log(linha);
}

export { mascararEmail };
