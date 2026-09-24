/**
 * Utilitários de sanitização e validação de entrada.
 *
 * ATENÇÃO — leia antes de usar `sanitizeInput`:
 * o React já escapa tudo que é renderizado como texto em JSX, e o Supabase usa
 * consultas parametrizadas. Escapar HTML **antes de gravar** faz o usuário ver
 * `&#x27;` no lugar de `'` na própria descrição que digitou. Sanitize na
 * renderização (ou nem sanitize, e confie no JSX), nunca na persistência.
 */

/** Conjunto de escapes aplicado por `sanitizeInput`, na ordem. */
const HTML_ESCAPES: ReadonlyArray<[RegExp, string]> = [
  [/&/g, '&amp;'], // precisa vir primeiro, senão re-escapa os próximos
  [/</g, '&lt;'],
  [/>/g, '&gt;'],
  [/"/g, '&quot;'],
  [/'/g, '&#x27;'],
];

/** Escapes na ordem inversa, para `unescapeInput`. */
const HTML_UNESCAPES: ReadonlyArray<[RegExp, string]> = [
  [/&#x27;/g, "'"],
  [/&quot;/g, '"'],
  [/&gt;/g, '>'],
  [/&lt;/g, '<'],
  [/&amp;/g, '&'], // por último, espelhando a ordem de escape
];

/**
 * Escapa caracteres significativos em HTML.
 *
 * `/` NÃO é escapado: não tem significado em HTML fora de uma tag, e escapá-lo
 * corrompia todo valor que o contém — URLs, datas no formato DD/MM/AAAA e
 * qualquer string base64 (incluindo tokens JWT).
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  return HTML_ESCAPES.reduce((acc, [re, to]) => acc.replace(re, to), input).trim();
};

/** Inverso de `sanitizeInput` — para ler de volta um valor que foi escapado. */
export const unescapeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  return HTML_UNESCAPES.reduce((acc, [re, to]) => acc.replace(re, to), input);
};

/**
 * Valida formato de e-mail
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Rejeita apenas caracteres de controle (exceto tabulação e quebra de linha).
 *
 * A lista de permitidos anterior era `[a-zA-Z0-9...]`, que **rejeitava letras
 * acentuadas e cedilha** — numa plataforma em português, "Alimentação" ou
 * "Serviços" eram recusados como "caracteres inválidos". Além disso, o trecho
 * `_+-=` dentro da classe de caracteres formava a faixa `+` a `=`, incluindo
 * por acidente dígitos, `/` e `<`, o que tornava a regra difícil de raciocinar.
 *
 * Bloquear caracteres por allowlist não é defesa de XSS de todo modo — o escape
 * na renderização é. Aqui só barramos o que nunca é entrada legítima.
 */
/**
 * Verificação por code point em vez de regex: uma classe de caracteres com
 * escapes de controle é frágil — basta uma ferramenta normalizar o arquivo e os
 * escapes viram bytes de controle literais, ilegíveis e difíceis de revisar.
 */
const isControlChar = (code: number): boolean =>
  code <= 0x08 ||                    // NUL até BACKSPACE
  code === 0x0b ||                   // VT
  code === 0x0c ||                   // FF
  (code >= 0x0e && code <= 0x1f) ||  // SO até US
  code === 0x7f;                     // DEL
// TAB (0x09), LF (0x0a) e CR (0x0d) ficam de fora — são entrada legítima.

export const isValidTextInput = (input: string): boolean => {
  if (typeof input !== 'string') return false;
  for (let i = 0; i < input.length; i++) {
    if (isControlChar(input.charCodeAt(i))) return false;
  }
  return true;
};

/**
 * Converte entrada numérica, aceitando o formato brasileiro (1.234,56).
 */
export const sanitizeNumericInput = (input: string | number): number => {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;

  const raw = String(input ?? '').trim();
  if (!raw) return 0;

  // Formato pt-BR: ponto como separador de milhar, vírgula como decimal.
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;

  const cleaned = normalized.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Verifica se o comprimento está dentro do limite seguro.
 * Retorna sempre boolean — antes devolvia `''` para entrada vazia, o que
 * contradizia a assinatura declarada e quebrava comparações estritas.
 */
export const isValidLength = (input: string, maxLength: number = 1000): boolean => {
  return typeof input === 'string' && input.length <= maxLength;
};

/**
 * Validação e sanitização combinadas.
 */
export const validateAndSanitizeInput = (
  input: string,
  options: {
    maxLength?: number;
    allowHtml?: boolean;
    isEmail?: boolean;
  } = {}
): { isValid: boolean; sanitized: string; error?: string } => {
  const { maxLength = 1000, allowHtml = false, isEmail = false } = options;

  if (!input || typeof input !== 'string') {
    return { isValid: false, sanitized: '', error: 'Campo obrigatório' };
  }

  if (!isValidLength(input, maxLength)) {
    return { isValid: false, sanitized: '', error: `Texto muito longo (máximo ${maxLength} caracteres)` };
  }

  if (isEmail && !isValidEmail(input)) {
    return { isValid: false, sanitized: '', error: 'E-mail inválido' };
  }

  if (!allowHtml && !isValidTextInput(input)) {
    return { isValid: false, sanitized: '', error: 'O texto contém caracteres não permitidos' };
  }

  const sanitized = allowHtml ? input.trim() : sanitizeInput(input);

  return { isValid: true, sanitized };
};
