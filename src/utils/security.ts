/**
 * Security utilities for input validation, sanitization and protection
 */

// Input sanitization for XSS protection
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Text input validation (alphanumeric + basic punctuation)
export const isValidTextInput = (input: string): boolean => {
  const textRegex = /^[a-zA-Z0-9\s\-_.,!?@#$%&*()+=[\]{};:'"<>\/\\|`~^]*$/;
  return textRegex.test(input);
};

// Numeric input sanitization
export const sanitizeNumericInput = (input: string | number): number => {
  const cleaned = String(input).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Length validation
export const isValidLength = (input: string, maxLength: number = 1000): boolean => {
  return input.length <= maxLength;
};

// Comprehensive input validation and sanitization
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
    return { isValid: false, sanitized: '', error: 'Input inválido' };
  }

  if (!isValidLength(input, maxLength)) {
    return { isValid: false, sanitized: '', error: `Input muito longo (máximo ${maxLength} caracteres)` };
  }

  if (isEmail && !isValidEmail(input)) {
    return { isValid: false, sanitized: '', error: 'Email inválido' };
  }

  if (!allowHtml && !isValidTextInput(input)) {
    return { isValid: false, sanitized: '', error: 'Input contém caracteres não permitidos' };
  }

  const sanitized = allowHtml ? input : sanitizeInput(input);
  
  return { isValid: true, sanitized };
};

// Phone number validation and sanitization
export const sanitizePhoneNumber = (phone: string): string => {
  return phone.replace(/[^\d+\-\s()]/g, '');
};

// CPF/CNPJ validation
export const isValidCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  
  if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) {
    return false;
  }

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

  return true;
};

// Security risk assessment for operations
export const assessSecurityRisk = (action: string, data: any): 'low' | 'medium' | 'high' | 'critical' => {
  const sensitiveFields = ['salario', 'senha', 'token', 'api_key', 'password'];
  const highRiskActions = ['delete', 'update_permissions', 'bulk_delete'];
  
  // Critical risk for password/token operations
  if (sensitiveFields.some(field => field in data && data[field])) {
    return 'critical';
  }
  
  // High risk for sensitive operations
  if (highRiskActions.includes(action.toLowerCase())) {
    return 'high';
  }
  
  // Medium risk for financial data
  if ('valor' in data || 'salario' in data) {
    return 'medium';
  }
  
  return 'low';
};

// Generate secure random string
export const generateSecureRandomString = (length: number = 32): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  const values = new Uint32Array(length);
  window.crypto.getRandomValues(values);
  
  for (let i = 0; i < length; i++) {
    result += charset[values[i] % charset.length];
  }
  
  return result;
};

// IP address validation (basic)
export const isValidIP = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

// Data masking for sensitive information
export const maskSensitiveData = (data: string, type: 'email' | 'phone' | 'cpf' | 'salary' = 'email'): string => {
  if (!data) return '';
  
  switch (type) {
    case 'email':
      const [local, domain] = data.split('@');
      if (!domain) return '***';
      return `${local.charAt(0)}***@${domain}`;
      
    case 'phone':
      return data.replace(/(\d{2})(\d{5})(\d{4})/, '($1) *****-$3');
      
    case 'cpf':
      return data.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.**$4');
      
    case 'salary':
      return 'R$ ***.***,**';
      
    default:
      return '***';
  }
};