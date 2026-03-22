
-- Chat sessions table
CREATE TABLE public.ai_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dashboard_id uuid,
  title text NOT NULL DEFAULT 'Nova conversa',
  message_count integer NOT NULL DEFAULT 0,
  ai_version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Chat messages table (normalized)
CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  tool_results jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ai_chat_sessions_user ON public.ai_chat_sessions(user_id, updated_at DESC);
CREATE INDEX idx_ai_chat_messages_session ON public.ai_chat_messages(session_id, created_at ASC);

-- RLS
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Session policies
CREATE POLICY "Users can manage their own chat sessions"
  ON public.ai_chat_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Message policies (through session ownership)
CREATE POLICY "Users can view their own chat messages"
  ON public.ai_chat_messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_chat_sessions s
    WHERE s.id = ai_chat_messages.session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own chat messages"
  ON public.ai_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_chat_sessions s
    WHERE s.id = ai_chat_messages.session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own chat messages"
  ON public.ai_chat_messages FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_chat_sessions s
    WHERE s.id = ai_chat_messages.session_id AND s.user_id = auth.uid()
  ));

-- Auto-update updated_at on sessions
CREATE TRIGGER update_ai_chat_sessions_updated_at
  BEFORE UPDATE ON public.ai_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
