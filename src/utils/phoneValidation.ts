import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';
import { supabase } from '@/integrations/supabase/client';

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  e164?: string;
  formatted?: string;
}

/**
 * Valida um número de telefone com validações robustas
 */
export const validatePhoneNumber = (phone: string, countryCode: CountryCode = 'BR'): PhoneValidationResult => {
  // Remove espaços e caracteres especiais para validação
  const cleanPhone = phone.replace(/\s+/g, '').trim();
  
  if (!cleanPhone || cleanPhone.length === 0) {
    return {
      isValid: false,
      error: 'Número de telefone é obrigatório'
    };
  }

  try {
    // Validar se é um número válido
    if (!isValidPhoneNumber(cleanPhone, countryCode)) {
      return {
        isValid: false,
        error: 'Número de telefone inválido para o país selecionado'
      };
    }

    // Parse do número
    const phoneNumber = parsePhoneNumber(cleanPhone, countryCode);
    
    if (!phoneNumber) {
      return {
        isValid: false,
        error: 'Não foi possível processar o número de telefone'
      };
    }

    // Verificar se é um número móvel (necessário para WhatsApp)
    const type = phoneNumber.getType();
    if (type && type !== 'MOBILE' && type !== 'FIXED_LINE_OR_MOBILE') {
      return {
        isValid: false,
        error: 'O número deve ser um celular válido para WhatsApp'
      };
    }

    // Retornar formato E.164 (padrão internacional)
    const e164 = phoneNumber.format('E.164');
    const formatted = phoneNumber.formatInternational();

    return {
      isValid: true,
      e164,
      formatted
    };
  } catch (error) {
    console.error('Erro ao validar telefone:', error);
    return {
      isValid: false,
      error: 'Formato de telefone inválido'
    };
  }
};

/**
 * Verifica se o número de telefone já está cadastrado
 */
export const checkPhoneDuplicate = async (phone: string, currentUserId?: string): Promise<{ isDuplicate: boolean; error?: string }> => {
  try {
    // Limpar o telefone para comparação consistente
    const cleanPhone = phone.replace(/\s+/g, '').trim();
    
    // Buscar telefones similares (pode estar em diferentes formatos)
    let query = supabase
      .from('profiles')
      .select('id, telefone')
      .or(`telefone.eq.${cleanPhone},telefone.eq.${phone}`);
    
    // Se tem usuário atual, excluir do resultado
    if (currentUserId) {
      query = query.neq('id', currentUserId);
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao verificar duplicata:', error);
      return { 
        isDuplicate: false, 
        error: 'Erro ao verificar telefone no sistema' 
      };
    }

    return { 
      isDuplicate: !!data 
    };
  } catch (error) {
    console.error('Erro inesperado ao verificar duplicata:', error);
    return { 
      isDuplicate: false, 
      error: 'Erro inesperado ao verificar telefone' 
    };
  }
};

/**
 * Formata um número de telefone para exibição
 */
export const formatPhoneForDisplay = (phone: string, countryCode: CountryCode = 'BR'): string => {
  try {
    const phoneNumber = parsePhoneNumber(phone, countryCode);
    if (!phoneNumber) return phone;
    return phoneNumber.formatInternational();
  } catch {
    return phone;
  }
};

/**
 * Sanitiza e formata o número para salvar no banco (E.164)
 */
export const sanitizePhoneForStorage = (phone: string, countryCode: CountryCode = 'BR'): string | null => {
  try {
    const validation = validatePhoneNumber(phone, countryCode);
    return validation.isValid ? validation.e164 || null : null;
  } catch {
    return null;
  }
};
