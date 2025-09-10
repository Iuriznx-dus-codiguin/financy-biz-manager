/**
 * Utilitários para migração gradual de localStorage para cookies HttpOnly seguros
 * Implementação incremental para melhor segurança sem quebrar funcionalidades existentes
 */

interface CookieOptions {
  expires?: number; // dias até expirar
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
}

/**
 * Classe para gerenciar cookies de forma segura
 */
export class SecureCookieManager {
  private static instance: SecureCookieManager;

  private constructor() {}

  public static getInstance(): SecureCookieManager {
    if (!SecureCookieManager.instance) {
      SecureCookieManager.instance = new SecureCookieManager();
    }
    return SecureCookieManager.instance;
  }

  /**
   * Define um cookie com configurações de segurança
   */
  setCookie(name: string, value: string, options: CookieOptions = {}): void {
    try {
      // Configurações padrão de segurança
      const defaultOptions: CookieOptions = {
        expires: 7, // 7 dias por padrão
        secure: window.location.protocol === 'https:', // Apenas HTTPS em produção
        sameSite: 'strict',
        path: '/'
      };

      const finalOptions = { ...defaultOptions, ...options };
      
      let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

      if (finalOptions.expires) {
        const date = new Date();
        date.setTime(date.getTime() + (finalOptions.expires * 24 * 60 * 60 * 1000));
        cookieString += `; expires=${date.toUTCString()}`;
      }

      if (finalOptions.path) {
        cookieString += `; path=${finalOptions.path}`;
      }

      if (finalOptions.secure) {
        cookieString += '; secure';
      }

      if (finalOptions.httpOnly) {
        console.warn('⚠️ HttpOnly cookies não podem ser definidos via JavaScript. Use uma API do servidor.');
        return;
      }

      if (finalOptions.sameSite) {
        cookieString += `; samesite=${finalOptions.sameSite}`;
      }

      document.cookie = cookieString;
      
      console.log(`✅ Cookie seguro definido: ${name}`);
    } catch (error) {
      console.error('Erro ao definir cookie:', error);
      throw error;
    }
  }

  /**
   * Obtém um cookie pelo nome
   */
  getCookie(name: string): string | null {
    try {
      const nameEQ = `${encodeURIComponent(name)}=`;
      const cookies = document.cookie.split(';');
      
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(nameEQ) === 0) {
          return decodeURIComponent(cookie.substring(nameEQ.length));
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao ler cookie:', error);
      return null;
    }
  }

  /**
   * Remove um cookie
   */
  removeCookie(name: string, path: string = '/'): void {
    try {
      this.setCookie(name, '', { expires: -1, path });
      console.log(`🗑️ Cookie removido: ${name}`);
    } catch (error) {
      console.error('Erro ao remover cookie:', error);
    }
  }

  /**
   * Verifica se cookies estão habilitados no navegador
   */
  areCookiesEnabled(): boolean {
    try {
      const testCookie = 'test_cookie_support';
      this.setCookie(testCookie, 'test');
      const supported = this.getCookie(testCookie) !== null;
      this.removeCookie(testCookie);
      return supported;
    } catch {
      return false;
    }
  }

  /**
   * Lista todos os cookies disponíveis (para debug)
   */
  listAllCookies(): Record<string, string> {
    const cookies: Record<string, string> = {};
    
    try {
      document.cookie.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          cookies[decodeURIComponent(name)] = decodeURIComponent(value);
        }
      });
    } catch (error) {
      console.error('Erro ao listar cookies:', error);
    }

    return cookies;
  }
}

/**
 * Migração gradual de localStorage para cookies
 */
export class StorageMigration {
  private static sensitiveKeys = [
    'auth_token',
    'refresh_token', 
    'user_session',
    'api_key',
    'subscription_data'
  ];

  private static cookieManager = SecureCookieManager.getInstance();

  /**
   * Migra um item do localStorage para cookie seguro
   */
  static migrateToSecureCookie(key: string): boolean {
    try {
      const value = localStorage.getItem(key);
      
      if (!value) {
        console.warn(`⚠️ Chave '${key}' não encontrada no localStorage`);
        return false;
      }

      // Define configurações de segurança baseadas no tipo de dado
      const options: CookieOptions = {
        expires: this.sensitiveKeys.includes(key) ? 1 : 7, // Dados sensíveis expiram em 1 dia
        secure: true,
        sameSite: 'strict'
      };

      this.cookieManager.setCookie(key, value, options);
      
      // Remove do localStorage após migração bem-sucedida
      localStorage.removeItem(key);
      
      console.log(`🔄 Migrado '${key}' do localStorage para cookie seguro`);
      return true;
    } catch (error) {
      console.error(`Erro ao migrar '${key}':`, error);
      return false;
    }
  }

  /**
   * Migra todas as chaves sensíveis automaticamente
   */
  static migrateAllSensitiveData(): void {
    console.log('🔄 Iniciando migração de dados sensíveis...');
    
    let migrated = 0;
    
    this.sensitiveKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        if (this.migrateToSecureCookie(key)) {
          migrated++;
        }
      }
    });

    if (migrated > 0) {
      console.log(`✅ ${migrated} itens migrados com sucesso para cookies seguros`);
    } else {
      console.log('ℹ️ Nenhum dado sensível encontrado para migração');
    }
  }

  /**
   * Verifica e alerta sobre dados sensíveis ainda no localStorage
   */
  static auditLocalStorage(): { safe: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    this.sensitiveKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        warnings.push(`Dado sensível '${key}' ainda em localStorage - considere migrar para cookie HttpOnly`);
      }
    });

    // Verificar outros padrões suspeitos
    Object.keys(localStorage).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('token') || lowerKey.includes('auth') || lowerKey.includes('session')) {
        if (!this.sensitiveKeys.includes(key)) {
          warnings.push(`Possível dado sensível detectado: '${key}'`);
        }
      }
    });

    const safe = warnings.length === 0;
    
    if (!safe) {
      console.warn('⚠️ Auditoria de segurança encontrou problemas:', warnings);
    } else {
      console.log('✅ Auditoria de segurança: nenhum problema encontrado');
    }

    return { safe, warnings };
  }

  /**
   * Obtém valor priorizando cookie sobre localStorage
   */
  static getSecureValue(key: string): string | null {
    // Primeiro tenta cookie (mais seguro)
    const cookieValue = this.cookieManager.getCookie(key);
    if (cookieValue) {
      return cookieValue;
    }

    // Fallback para localStorage com warning se for dado sensível
    const localValue = localStorage.getItem(key);
    if (localValue && this.sensitiveKeys.includes(key)) {
      console.warn(`⚠️ Dado sensível '${key}' ainda em localStorage. Migre para cookie seguro.`);
    }

    return localValue;
  }

  /**
   * Define valor priorizando cookie quando possível
   */
  static setSecureValue(key: string, value: string): void {
    const isSensitive = this.sensitiveKeys.includes(key);
    
    if (isSensitive && this.cookieManager.areCookiesEnabled()) {
      // Usar cookie para dados sensíveis
      this.cookieManager.setCookie(key, value, {
        expires: 1, // 1 dia para dados sensíveis
        secure: true,
        sameSite: 'strict'
      });
    } else {
      // Fallback para localStorage
      localStorage.setItem(key, value);
      
      if (isSensitive) {
        console.warn(`⚠️ Armazenando dado sensível '${key}' em localStorage. Cookies não disponíveis.`);
      }
    }
  }
}

// Executar migração automática na inicialização
if (typeof window !== 'undefined') {
  // Executar após carregamento da página para não bloquear
  setTimeout(() => {
    StorageMigration.migrateAllSensitiveData();
    StorageMigration.auditLocalStorage();
  }, 1000);
}

// Exportar instância padrão
export const secureCookies = SecureCookieManager.getInstance();
export const storageMigration = StorageMigration;