
// Input validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  }
  if (!/\d/.test(password)) {
    errors.push('Senha deve conter pelo menos um número');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateNumericInput = (value: string, min: number = 0, max: number = 999999999): { isValid: boolean; error?: string } => {
  if (!value.trim()) {
    return { isValid: false, error: 'Campo obrigatório' };
  }
  
  const numValue = parseFloat(value);
  
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Valor deve ser numérico' };
  }
  
  if (numValue < min) {
    return { isValid: false, error: `Valor deve ser maior que ${min}` };
  }
  
  if (numValue > max) {
    return { isValid: false, error: `Valor deve ser menor que ${max}` };
  }
  
  return { isValid: true };
};

export const validateTextInput = (value: string, maxLength: number = 255, allowHtml: boolean = false): { isValid: boolean; error?: string } => {
  if (!value.trim()) {
    return { isValid: false, error: 'Campo obrigatório' };
  }
  
  if (value.length > maxLength) {
    return { isValid: false, error: `Texto deve ter no máximo ${maxLength} caracteres` };
  }
  
  if (!allowHtml && /<[^>]*>/.test(value)) {
    return { isValid: false, error: 'HTML não é permitido neste campo' };
  }
  
  return { isValid: true };
};

export const sanitizeText = (text: string): string => {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const validateDate = (date: string): { isValid: boolean; error?: string } => {
  if (!date) {
    return { isValid: false, error: 'Data é obrigatória' };
  }
  
  const dateObj = new Date(date);
  const today = new Date();
  const maxDate = new Date();
  maxDate.setFullYear(today.getFullYear() + 10);
  
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: 'Data inválida' };
  }
  
  if (dateObj > maxDate) {
    return { isValid: false, error: 'Data não pode ser superior a 10 anos no futuro' };
  }
  
  return { isValid: true };
};
