/**
 * Sistema de Validação e Normalização de Telefone para Evolution API
 * 
 * Garante que todos os números sejam salvos no formato: +55DDDNÚMERO
 * Detecta e corrige automaticamente o erro comum do "9 duplicado"
 */

import { supabase } from '@/integrations/supabase/client';

// DDDs válidos do Brasil (11-99)
const VALID_DDDS = [
  '11', '12', '13', '14', '15', '16', '17', '18', '19', // SP
  '21', '22', '24', // RJ
  '27', '28', // ES
  '31', '32', '33', '34', '35', '37', '38', // MG
  '41', '42', '43', '44', '45', '46', // PR
  '47', '48', '49', // SC
  '51', '53', '54', '55', // RS
  '61', // DF
  '62', '64', // GO
  '63', // TO
  '65', '66', // MT
  '67', // MS
  '68', // AC
  '69', // RO
  '71', '73', '74', '75', '77', // BA
  '79', // SE
  '81', '87', // PE
  '82', // AL
  '83', // PB
  '84', // RN
  '85', '88', // CE
  '86', '89', // PI
  '91', '93', '94', // PA
  '92', '97', // AM
  '95', // RR
  '96', // AP
  '98', '99', // MA
];

export interface CorrectionType {
  type: 'removed_leading_zero' | 'removed_duplicate_9' | 'added_country_code' | 'normalized_55' | 'removed_extra_55';
  message: string;
  before: string;
  after: string;
}

export interface PhoneValidationResult {
  isValid: boolean;
  normalized?: string; // +55DDDNÚMERO
  original: string;
  corrections: CorrectionType[];
  error?: string;
  warning?: string;
}

/**
 * Remove todos os caracteres não numéricos, exceto o + inicial
 */
function cleanInput(input: string): { digits: string; hadPlus: boolean } {
  const trimmed = input.trim();
  const hadPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return { digits, hadPlus };
}

/**
 * Remove zeros à esquerda antes do DDD
 */
function removeLeadingZeros(digits: string): { result: string; hadLeadingZero: boolean } {
  const original = digits;
  let result = digits;
  
  // Se começa com 0, remover zeros até encontrar dígito diferente
  while (result.startsWith('0') && result.length > 1) {
    result = result.substring(1);
  }
  
  return {
    result,
    hadLeadingZero: original !== result
  };
}

/**
 * Normaliza o código do país (55)
 */
function normalizeCountryCode(digits: string): {
  result: string;
  correction?: CorrectionType;
  isInternational: boolean;
} {
  // Se não começa com 55, verificar se é número internacional
  if (!digits.startsWith('55')) {
    // Se começa com outro código de país (mais de 11 dígitos e não é 55)
    if (digits.length >= 11 && /^[1-9][0-9]/.test(digits)) {
      const possibleCountryCode = digits.substring(0, 2);
      if (possibleCountryCode !== '55') {
        return {
          result: digits,
          isInternational: true
        };
      }
    }
    
    // Adicionar 55 automaticamente
    return {
      result: '55' + digits,
      correction: {
        type: 'added_country_code',
        message: 'Código do país (+55) adicionado automaticamente',
        before: digits,
        after: '55' + digits
      },
      isInternational: false
    };
  }
  
  // Se começa com 5555 ou mais, normalizar
  if (digits.startsWith('5555')) {
    let normalized = digits;
    while (normalized.startsWith('5555')) {
      normalized = '55' + normalized.substring(4);
    }
    
    return {
      result: normalized,
      correction: {
        type: 'normalized_55',
        message: 'Código do país duplicado foi normalizado',
        before: digits,
        after: normalized
      },
      isInternational: false
    };
  }
  
  return {
    result: digits,
    isInternational: false
  };
}

/**
 * Detecta e remove o "9 duplicado" no início do número do assinante
 */
function handleDuplicate9(digits: string): {
  result: string;
  correction?: CorrectionType;
  isAmbiguous: boolean;
} {
  // Extrair DDD e subscriber
  const ddd = digits.substring(2, 4);
  const subscriber = digits.substring(4);
  
  // Se subscriber começa com 99, remover um 9
  if (subscriber.startsWith('99')) {
    const corrected = '55' + ddd + subscriber.substring(1);
    return {
      result: corrected,
      correction: {
        type: 'removed_duplicate_9',
        message: '⚠️ Corrigido automaticamente: remoção de 9 duplicado no início',
        before: digits,
        after: corrected
      },
      isAmbiguous: false
    };
  }
  
  // Se subscriber tem 10 dígitos mas NÃO começa com 99, é ambíguo
  return {
    result: digits,
    isAmbiguous: true
  };
}

/**
 * Valida o DDD
 */
function validateDDD(ddd: string): boolean {
  return VALID_DDDS.includes(ddd);
}

/**
 * Função principal: valida e normaliza número de telefone
 */
export function validateAndNormalizePhone(input: string): PhoneValidationResult {
  const corrections: CorrectionType[] = [];
  const original = input;
  
  // 1. Limpar entrada
  const { digits: cleanedDigits } = cleanInput(input);
  
  if (!cleanedDigits) {
    return {
      isValid: false,
      original,
      corrections,
      error: '❌ Número vazio. Por favor, insira um número de telefone.'
    };
  }
  
  // 2. Remover zeros à esquerda
  const { result: digitsWithoutZeros, hadLeadingZero } = removeLeadingZeros(cleanedDigits);
  
  if (hadLeadingZero) {
    corrections.push({
      type: 'removed_leading_zero',
      message: '⚠️ Removido zero à esquerda antes do DDD',
      before: cleanedDigits,
      after: digitsWithoutZeros
    });
  }
  
  // 3. Normalizar código do país
  const { result: normalizedDigits, correction: countryCorrection, isInternational } = 
    normalizeCountryCode(digitsWithoutZeros);
  
  if (isInternational) {
    return {
      isValid: false,
      original,
      corrections,
      error: '❌ Apenas números brasileiros (+55) são aceitos.'
    };
  }
  
  if (countryCorrection) {
    corrections.push(countryCorrection);
  }
  
  // 4. Contar dígitos finais
  const len_digits = normalizedDigits.length;
  
  // 5. Análise por comprimento
  
  // Caso: 14 dígitos (suspeita de 9 duplicado)
  if (len_digits === 14) {
    const { result, correction, isAmbiguous } = handleDuplicate9(normalizedDigits);
    
    if (isAmbiguous) {
      return {
        isValid: false,
        original,
        corrections,
        error: '❌ Número ambíguo (não foi possível corrigir automaticamente). Ajuste manualmente. Ex.: +5587999083662'
      };
    }
    
    if (correction) {
      corrections.push(correction);
    }
    
    // Validar DDD do número corrigido
    const ddd = result.substring(2, 4);
    if (!validateDDD(ddd)) {
      return {
        isValid: false,
        original,
        corrections,
        error: '❌ DDD inválido. Deve ter 2 dígitos válidos.'
      };
    }
    
    return {
      isValid: true,
      normalized: '+' + result,
      original,
      corrections
    };
  }
  
  // Caso: 13 dígitos (padrão celular correto)
  if (len_digits === 13) {
    const ddd = normalizedDigits.substring(2, 4);
    
    if (!validateDDD(ddd)) {
      return {
        isValid: false,
        original,
        corrections,
        error: '❌ DDD inválido. Deve ter 2 dígitos válidos.'
      };
    }
    
    return {
      isValid: true,
      normalized: '+' + normalizedDigits,
      original,
      corrections
    };
  }
  
  // Caso: 12 dígitos (possível fixo)
  if (len_digits === 12) {
    const ddd = normalizedDigits.substring(2, 4);
    
    if (!validateDDD(ddd)) {
      return {
        isValid: false,
        original,
        corrections,
        error: '❌ DDD inválido. Deve ter 2 dígitos válidos.'
      };
    }
    
    return {
      isValid: true,
      normalized: '+' + normalizedDigits,
      original,
      corrections,
      warning: '⚠️ Número fixo detectado (8 dígitos). Confirme se é fixo ou celular.'
    };
  }
  
  // Caso: 11 ou menos dígitos
  if (len_digits <= 11) {
    return {
      isValid: false,
      original,
      corrections,
      error: '❌ Número muito curto. Verifique se digitou todos os dígitos. Ex.: +5587999083662'
    };
  }
  
  // Caso: 15+ dígitos
  if (len_digits >= 15) {
    return {
      isValid: false,
      original,
      corrections,
      error: '❌ Número muito longo. Verifique se há dígitos extras.'
    };
  }
  
  // Fallback para qualquer outro caso
  return {
    isValid: false,
    original,
    corrections,
    error: '❌ Formato de número não reconhecido. Use o formato: +5587999083662'
  };
}

/**
 * Formata número E.164 para exibição amigável
 * +5587999083662 → (87) 99908-3662
 */
export function formatPhoneForDisplay(e164Phone: string): string {
  if (!e164Phone || !e164Phone.startsWith('+55')) {
    return e164Phone;
  }
  
  const digits = e164Phone.replace(/\D/g, '');
  const ddd = digits.substring(2, 4);
  const subscriber = digits.substring(4);
  
  // Se tem 9 dígitos (celular)
  if (subscriber.length === 9) {
    return `(${ddd}) ${subscriber.substring(0, 5)}-${subscriber.substring(5)}`;
  }
  
  // Se tem 8 dígitos (fixo)
  if (subscriber.length === 8) {
    return `(${ddd}) ${subscriber.substring(0, 4)}-${subscriber.substring(4)}`;
  }
  
  return e164Phone;
}

/**
 * Gera mensagem de feedback formatada para exibir ao usuário
 */
export function getValidationMessage(result: PhoneValidationResult): {
  title: string;
  description: string;
  variant: 'success' | 'warning' | 'error';
} {
  if (!result.isValid) {
    return {
      title: 'Número inválido',
      description: result.error || 'Formato de número não reconhecido.',
      variant: 'error'
    };
  }
  
  // Se tem warnings
  if (result.warning) {
    const correctionMsgs = result.corrections.map(c => c.message).join('\n');
    return {
      title: 'Número salvo com aviso',
      description: `${result.warning}${correctionMsgs ? '\n\n' + correctionMsgs : ''}`,
      variant: 'warning'
    };
  }
  
  // Se tem correções
  if (result.corrections.length > 0) {
    const correctionMsgs = result.corrections.map(c => c.message).join('\n');
    return {
      title: 'Número salvo com correções',
      description: `${correctionMsgs}\n\nSalvo como: ${result.normalized}`,
      variant: 'warning'
    };
  }
  
  // Número perfeito
  return {
    title: '✅ Número válido',
    description: `Salvo como: ${result.normalized}`,
    variant: 'success'
  };
}

/**
 * Salva log de auditoria de correção de telefone
 */
export async function savePhoneCorrection(
  userId: string,
  original: string,
  normalized: string,
  corrections: CorrectionType[],
  source: 'onboarding' | 'phone_collection' | 'settings'
): Promise<void> {
  try {
    // Usar type assertion para contornar problema temporário dos types não atualizados
    const { error } = await (supabase as any)
      .from('phone_corrections_audit')
      .insert({
        user_id: userId,
        original_input: original,
        normalized_output: normalized,
        corrections_applied: corrections,
        source
      });
    
    if (error) {
      console.error('Erro ao salvar auditoria de correção de telefone:', error);
    }
  } catch (error) {
    console.error('Erro inesperado ao salvar auditoria:', error);
  }
}

/**
 * Busca histórico de correções do usuário
 */
export async function getPhoneCorrectionsHistory(userId: string): Promise<any[]> {
  try {
    // Usar type assertion para contornar problema temporário dos types não atualizados
    const { data, error } = await (supabase as any)
      .from('phone_corrections_audit')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar histórico de correções:', error);
    return [];
  }
}
