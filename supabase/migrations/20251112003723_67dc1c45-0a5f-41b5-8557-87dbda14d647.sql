-- Adicionar created_at ao profiles se não existir
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Preencher datas para registros existentes (usar data do auth.users)
UPDATE profiles p
SET created_at = u.created_at
FROM auth.users u
WHERE p.id = u.id AND p.created_at IS NULL;

-- Criar tabela de webhooks agendados
CREATE TABLE IF NOT EXISTS scheduled_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'testegratuito3', 'testegratuito1', 'testegratuito0', 'renovacao5', 'renovacao1', 'renovacao0'
  scheduled_date DATE NOT NULL,
  executed BOOLEAN DEFAULT FALSE,
  executed_at TIMESTAMPTZ,
  webhook_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_scheduled_webhooks_user ON scheduled_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_webhooks_date ON scheduled_webhooks(scheduled_date, executed);
CREATE INDEX IF NOT EXISTS idx_scheduled_webhooks_type ON scheduled_webhooks(event_type);

-- RLS
ALTER TABLE scheduled_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own scheduled webhooks" ON scheduled_webhooks;
CREATE POLICY "Users can view their own scheduled webhooks"
  ON scheduled_webhooks FOR SELECT
  USING (auth.uid() = user_id);

-- Comentário para documentação
COMMENT ON TABLE scheduled_webhooks IS 'Tabela para armazenar webhooks agendados para envio em datas específicas. Utilizada para notificações de teste gratuito e renovação de assinaturas.';
COMMENT ON COLUMN scheduled_webhooks.event_type IS 'Tipo do evento: testegratuito3, testegratuito1, testegratuito0 (dias antes do fim), renovacao5, renovacao1, renovacao0 (dias antes da renovação)';