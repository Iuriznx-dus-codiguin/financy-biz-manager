/**
 * Security utilities for input sanitization and validation
 */

/**
 * Sanitizes user input to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates that a string contains only alphanumeric characters and basic punctuation
 */
export const isValidTextInput = (input: string): boolean => {
  const textRegex = /^[a-zA-Z0-9\s.,!?@#$%&*()_+-=\[\]{}|;:'"<>?`~\n\r]*$/;
  return textRegex.test(input);
};

/**
 * Sanitizes numeric input
 */
export const sanitizeNumericInput = (input: string | number): number => {
  if (typeof input === 'number') return isNaN(input) ? 0 : input;
  
  const cleaned = String(input).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Checks if input length is within safe limits
 */
export const isValidLength = (input: string, maxLength: number = 1000): boolean => {
  return input && input.length <= maxLength;
};

/**
 * Comprehensive input validation and sanitization
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
    return { isValid: false, sanitized: '', error: 'Input is required' };
  }

  if (!isValidLength(input, maxLength)) {
    return { isValid: false, sanitized: '', error: `Input too long (max ${maxLength} characters)` };
  }

  if (isEmail && !isValidEmail(input)) {
    return { isValid: false, sanitized: '', error: 'Invalid email format' };
  }

  if (!allowHtml && !isValidTextInput(input)) {
    return { isValid: false, sanitized: '', error: 'Input contains invalid characters' };
  }

  const sanitized = allowHtml ? input.trim() : sanitizeInput(input);
  
  return { isValid: true, sanitized };
};