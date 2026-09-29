import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';
import { supabase } from '@/integrations/supabase/client';

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  e164?: string;
  formatted?: string;
}

/**
 * Verifica se o número de telefone já está cadastrado.
 * Atenção: a RLS de `profiles` só deixa ler o próprio perfil, então esta consulta não enxerga outros
 * usuários e na prática nunca encontra duplicata. A garantia real é a constraint única do banco —
 * concluir_onboarding devolve "Este número de telefone já está cadastrado". Checagem antecipada exige
 * decisão (D-19 em docs/ARQUITETURA-ALVO.md): uma RPC de disponibilidade permitiria enumerar telefones.
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
