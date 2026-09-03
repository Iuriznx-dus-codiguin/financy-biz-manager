ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS author_id UUID;

CREATE POLICY "support_messages_insert_admin" ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "support_escalations_admin_insert" ON public.support_escalations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.request_human_support(p_conversation_id uuid, p_reason text DEFAULT 'Usuário solicitou atendimento humano')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv record;
  v_ticket text;
BEGIN
  SELECT * INTO v_conv FROM public.support_conversations
  WHERE id = p_conversation_id AND user_id = auth.uid();

  IF v_conv IS NULL THEN
    RAISE EXCEPTION 'Conversa não encontrada';
  END IF;

  v_ticket := COALESCE(v_conv.ticket_id, 'FY-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 900000) + 100000)::text, 6, '0'));

  UPDATE public.support_conversations
  SET state = 'escalated', ticket_id = v_ticket
  WHERE id = p_conversation_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.support_escalations
    WHERE conversation_id = p_conversation_id AND status = 'open'
  ) THEN
    INSERT INTO public.support_escalations (conversation_id, user_id, ticket_id, reason, context)
    VALUES (p_conversation_id, auth.uid(), v_ticket, p_reason, jsonb_build_object('origem', 'solicitacao_do_usuario'));
  END IF;

  INSERT INTO public.support_messages (conversation_id, role, content)
  VALUES (p_conversation_id, 'assistant',
    'Certo! Encaminhei seu atendimento para a nossa equipe. Chamado **' || v_ticket || '**. Assim que um atendente responder, a mensagem aparecerá aqui nesta conversa.');

  RETURN v_ticket;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_human_support(uuid, text) TO authenticated;