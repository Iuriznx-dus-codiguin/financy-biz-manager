import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { celebrate } from '@/shared/lib/celebration';
import { useAtualizarAssinatura } from '@/features/assinatura/useAssinatura';

const INTERVALO_MS = 10_000;

/**
 * Avisa quando o webhook da Cakto confirma um pagamento (payment_notifications) e recarrega a
 * assinatura em todas as telas. Consulta a cada 10 s só enquanto o acesso está bloqueado (quem
 * acabou de pagar) e ao voltar para a aba; antes consultava a cada 10 s o tempo todo.
 */
export const usePaymentSuccess = (aguardandoPagamento = false) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const atualizarAssinatura = useAtualizarAssinatura();
  const avisadasRef = useRef(new Set<string>());

  const verificar = useCallback(async () => {
    if (!user) return;
    const { data: notificacoes, error } = await supabase
      .from('payment_notifications')
      .select('id, plan_name')
      .eq('user_id', user.id)
      .eq('processed', false)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error || !notificacoes?.length) return;

    const notificacao = notificacoes[0];
    if (avisadasRef.current.has(notificacao.id)) return;
    avisadasRef.current.add(notificacao.id);

    await supabase.from('payment_notifications').update({ processed: true }).eq('id', notificacao.id);
    await atualizarAssinatura();

    celebrate({ dedupeKey: `payment:${notificacao.id}` });
    setTimeout(() => {
      toast({
        title: '🎉 Pagamento confirmado!',
        description: `Seu plano ${notificacao.plan_name} está ativo. Obrigado pela confiança!`,
        duration: 8000,
      });
    }, 500);
  }, [user, atualizarAssinatura, toast]);

  useEffect(() => {
    if (!user) return;
    verificar();
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') verificar();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    const intervalo = aguardandoPagamento ? setInterval(verificar, INTERVALO_MS) : undefined;
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar);
      if (intervalo) clearInterval(intervalo);
    };
  }, [user, aguardandoPagamento, verificar]);

  return { triggerConfetti: () => celebrate() };
};
