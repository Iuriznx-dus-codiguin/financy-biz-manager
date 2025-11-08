-- Criar tabela de notificações de pagamento
CREATE TABLE IF NOT EXISTS payment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  plan_name TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  transaction_id TEXT,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

-- Política para usuários visualizarem suas próprias notificações
CREATE POLICY "Users can view their own payment notifications"
  ON payment_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Política para sistema inserir notificações
CREATE POLICY "System can insert payment notifications"
  ON payment_notifications FOR INSERT
  WITH CHECK (true);

-- Política para usuários atualizarem suas notificações
CREATE POLICY "Users can update their own payment notifications"
  ON payment_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_payment_notifications_user_processed 
  ON payment_notifications(user_id, processed);

-- Comentários para documentação
COMMENT ON TABLE payment_notifications IS 'Armazena notificações de pagamentos bem-sucedidos para feedback ao usuário';
COMMENT ON COLUMN payment_notifications.processed IS 'Indica se a notificação já foi exibida ao usuário';