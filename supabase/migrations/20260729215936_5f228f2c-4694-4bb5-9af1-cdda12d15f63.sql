-- Conversas de suporte
CREATE TABLE public.support_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticket_id TEXT,
  subject TEXT,
  state TEXT NOT NULL DEFAULT 'open',
  rating SMALLINT,
  rating_comment TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.support_conversations TO authenticated;
GRANT ALL ON public.support_conversations TO service_role;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_conversations_select_own" ON public.support_conversations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "support_conversations_insert_own" ON public.support_conversations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "support_conversations_update_own" ON public.support_conversations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_support_conversations_user ON public.support_conversations(user_id, updated_at DESC);

CREATE TRIGGER update_support_conversations_updated_at
  BEFORE UPDATE ON public.support_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mensagens de suporte
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  matched_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_messages_select_own" ON public.support_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.support_conversations c
    WHERE c.id = conversation_id
      AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));
CREATE POLICY "support_messages_insert_own" ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.support_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  ));

CREATE INDEX idx_support_messages_conversation ON public.support_messages(conversation_id, created_at);

-- Escalonamentos para equipe humana
CREATE TABLE public.support_escalations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  ticket_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  error_code TEXT,
  severity TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.support_escalations TO authenticated;
GRANT ALL ON public.support_escalations TO service_role;
ALTER TABLE public.support_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_escalations_select_own" ON public.support_escalations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "support_escalations_admin_update" ON public.support_escalations
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_support_escalations_status ON public.support_escalations(status, created_at DESC);

CREATE TRIGGER update_support_escalations_updated_at
  BEFORE UPDATE ON public.support_escalations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();