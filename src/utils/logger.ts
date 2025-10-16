/**
 * Centralized logging utility
 * Prevents sensitive data leakage in production
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * Log informational messages (only in development)
   */
  info: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`ℹ️ ${message}`, data !== undefined ? data : '');
    }
  },

  /**
   * Log warning messages (only in development)
   */
  warn: (message: string, data?: any) => {
    if (isDevelopment) {
      console.warn(`⚠️ ${message}`, data !== undefined ? data : '');
    }
  },

  /**
   * Log error messages (always logged but sanitized)
   */
  error: (message: string, error?: any) => {
    // Always log errors, but sanitize sensitive data
    const sanitizedError = error instanceof Error 
      ? { message: error.message, name: error.name }
      : error;
    
    console.error(`❌ ${message}`, sanitizedError);
  },

  /**
   * Log success messages (only in development)
   */
  success: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`✅ ${message}`, data !== undefined ? data : '');
    }
  }
};
