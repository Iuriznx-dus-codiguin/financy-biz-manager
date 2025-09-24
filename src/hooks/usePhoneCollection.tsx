import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const usePhoneCollection = () => {
  const { user } = useAuth();
  const [hasPhone, setHasPhone] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    checkPhoneStatus();
  }, [user]);

  const checkPhoneStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('telefone')
        .eq('id', user!.id)
        .single();

      if (error) {
        console.error('Erro ao verificar telefone:', error);
        setHasPhone(true); // Em caso de erro, assume que tem telefone para não bloquear
        return;
      }

      // Verifica se existe telefone e se não está vazio
      const phoneExists = data?.telefone && data.telefone.trim() !== '';
      setHasPhone(phoneExists);
    } catch (error) {
      console.error('Erro inesperado ao verificar telefone:', error);
      setHasPhone(true); // Em caso de erro, assume que tem telefone
    } finally {
      setLoading(false);
    }
  };

  const markPhoneAsCollected = () => {
    setHasPhone(true);
  };

  return {
    hasPhone,
    loading,
    markPhoneAsCollected,
    refetch: checkPhoneStatus
  };
};