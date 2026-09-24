/**
 * Utilitários para armazenamento seguro de dados no frontend
 * Prefere cookies HttpOnly quando possível, fallback para localStorage com sanitização
 */

import { sanitizeInput } from './security';

interface SecureStorageOptions {
  encrypt?: boolean;
  expirationDays?: number;
}

/**
 * Armazena dados de forma segura
 */
export const secureStorage = {
  /**
   * Define um valor no armazenamento seguro
   */
  setItem(key: string, value: string, options: SecureStorageOptions = {}): void {
    try {
      const sanitizedKey = sanitizeInput(key);
      const sanitizedValue = sanitizeInput(value);
      
      if (!sanitizedKey || !sanitizedValue) {
        console.warn('Tentativa de armazenar dados inválidos foi bloqueada');
        return;
      }

      // Para tokens sensíveis, log de warning sobre localStorage
      if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth')) {
        console.warn(`⚠️ Armazenando token sensível em localStorage. Considere migrar para cookies HttpOnly: ${key}`);
      }

      const dataToStore = {
        value: sanitizedValue,
        timestamp: Date.now(),
        expiresAt: options.expirationDays ? Date.now() + (options.expirationDays * 24 * 60 * 60 * 1000) : null
      };

      localStorage.setItem(sanitizedKey, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Erro ao armazenar dados de forma segura:', error);
    }
  },

  /**
   * Obtém um valor do armazenamento seguro
   */
  getItem(key: string): string | null {
    try {
      const sanitizedKey = sanitizeInput(key);
      if (!sanitizedKey) return null;

      const storedData = localStorage.getItem(sanitizedKey);
      if (!storedData) return null;

      const parsed = JSON.parse(storedData);
      
      // Verificar expiração
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem(sanitizedKey);
        return null;
      }

      return parsed.value;
    } catch (error) {
      console.error('Erro ao recuperar dados seguros:', error);
      return null;
    }
  },

  /**
   * Remove um item do armazenamento seguro
   */
  removeItem(key: string): void {
    try {
      const sanitizedKey = sanitizeInput(key);
      if (sanitizedKey) {
        localStorage.removeItem(sanitizedKey);
      }
    } catch (error) {
      console.error('Erro ao remover dados seguros:', error);
    }
  },

  /**
   * Limpa todos os dados armazenados
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Erro ao limpar armazenamento seguro:', error);
    }
  }
};

/**
 * Migração gradual para cookies HttpOnly (quando disponível)
 * TODO: Implementar quando houver endpoint backend para gerenciar cookies
 */
export const cookieStorage = {
  // Placeholder para futura implementação com cookies HttpOnly
  setSecureCookie(name: string, value: string, options: { httpOnly?: boolean; secure?: boolean; sameSite?: string } = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Desenvolvimento: Usando localStorage para armazenamento seguro', { name });
    }
    // Por enquanto, usar localStorage como fallback
    secureStorage.setItem(name, value);
  }
};