/**
 * Armazenamento local com expiração.
 *
 * Correções em relação à versão anterior:
 *
 * 1. O valor era escapado com `sanitizeInput` **antes** de gravar e devolvido
 *    escapado na leitura. Como `/` também era escapado, qualquer valor com
 *    barra — URL, data DD/MM/AAAA, base64, token JWT — voltava corrompido e
 *    sem possibilidade de recuperação. Escapar HTML não protege nada aqui:
 *    localStorage guarda texto, não marcação. A gravação agora é fiel.
 *
 * 2. A chave também era sanitizada, então uma chave com `/` ou `:` gravava num
 *    lugar e lia de outro. Agora a chave é usada como veio.
 *
 * 3. `cookieStorage.setSecureCookie` usava `process.env.NODE_ENV`, que não
 *    existe no navegador — a chamada lançava `ReferenceError` num bundle Vite.
 *    Passou a usar `import.meta.env.DEV`.
 *
 * 4. Todo acesso está em try/catch: em janela privativa, com dados de site
 *    bloqueados ou cota esgotada, o próprio `localStorage` lança.
 *
 * Importante: isto NÃO é um cofre. Qualquer script na página lê o que está
 * aqui. Não guarde token de sessão nem dado sensível — a sessão do Supabase já
 * é gerenciada pelo próprio client.
 */

interface SecureStorageOptions {
  expirationDays?: number;
}

interface StoredEnvelope {
  value: string;
  timestamp: number;
  expiresAt: number | null;
}

const SENSITIVE_KEY_PATTERN = /token|auth|senha|password|secret/i;

export const secureStorage = {
  /**
   * Grava um valor, opcionalmente com prazo de validade.
   */
  setItem(key: string, value: string, options: SecureStorageOptions = {}): void {
    if (!key || typeof key !== 'string') {
      console.warn('secureStorage.setItem: chave inválida, gravação ignorada');
      return;
    }
    if (typeof value !== 'string') {
      console.warn('secureStorage.setItem: valor deve ser string, gravação ignorada');
      return;
    }

    if (SENSITIVE_KEY_PATTERN.test(key)) {
      console.warn(
        `⚠️ secureStorage: "${key}" parece sensível. localStorage é legível por qualquer script da página — prefira deixar a sessão com o client do Supabase.`
      );
    }

    const envelope: StoredEnvelope = {
      value,
      timestamp: Date.now(),
      expiresAt: options.expirationDays
        ? Date.now() + options.expirationDays * 24 * 60 * 60 * 1000
        : null,
    };

    try {
      localStorage.setItem(key, JSON.stringify(envelope));
    } catch (error) {
      // Janela privativa, cota esgotada ou dados de site bloqueados.
      console.error('secureStorage: falha ao gravar', error);
    }
  },

  /**
   * Lê um valor, removendo-o se estiver expirado.
   * Retorna `null` quando ausente, expirado ou ilegível.
   */
  getItem(key: string): string | null {
    if (!key || typeof key !== 'string') return null;

    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch (error) {
      console.error('secureStorage: falha ao ler', error);
      return null;
    }
    if (raw === null) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Valor gravado fora deste módulo: devolve como está.
      return raw;
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as StoredEnvelope).value !== 'string'
    ) {
      return raw;
    }

    const envelope = parsed as StoredEnvelope;
    if (envelope.expiresAt !== null && Date.now() > envelope.expiresAt) {
      this.removeItem(key);
      return null;
    }

    return envelope.value;
  },

  /**
   * Remove um item.
   */
  removeItem(key: string): void {
    if (!key || typeof key !== 'string') return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('secureStorage: falha ao remover', error);
    }
  },

  /**
   * Remove apenas as chaves informadas.
   *
   * Substitui o antigo `clear()`, que chamava `localStorage.clear()` e apagaria
   * também a sessão do Supabase e as preferências de tema — derrubando o login
   * de quem só queria limpar um cache.
   */
  removeMany(keys: string[]): void {
    keys.forEach((key) => this.removeItem(key));
  },
};

/**
 * Cookies com atributos de segurança.
 *
 * `HttpOnly` é impossível a partir do JavaScript por definição (o atributo
 * existe justamente para esconder o cookie do JS) — só o servidor consegue
 * definir. O que dá para fazer aqui é `Secure`, `SameSite` e `Path`.
 */
export const cookieStorage = {
  setSecureCookie(
    name: string,
    value: string,
    options: { maxAgeSeconds?: number; sameSite?: 'Strict' | 'Lax' | 'None' } = {}
  ): void {
    if (typeof document === 'undefined') return;

    const { maxAgeSeconds, sameSite = 'Lax' } = options;
    const isHttps = window.location.protocol === 'https:';

    const parts = [
      `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
      'Path=/',
      `SameSite=${sameSite}`,
    ];
    if (isHttps) parts.push('Secure');
    if (maxAgeSeconds) parts.push(`Max-Age=${maxAgeSeconds}`);

    if (import.meta.env.DEV) {
      console.log('cookieStorage: gravando cookie', { name, secure: isHttps, sameSite });
    }

    document.cookie = parts.join('; ');
  },
};
