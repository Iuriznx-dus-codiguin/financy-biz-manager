-- Criar tabela de auditoria para correções de telefone
CREATE TABLE IF NOT EXISTS phone_corrections_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  original_input TEXT NOT NULL,
  normalized_output TEXT NOT NULL,
  corrections_applied JSONB DEFAULT '[]'::jsonb,
  source TEXT NOT NULL CHECK (source IN ('onboarding', 'phone_collection', 'settings')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index para buscar histórico por usuário
CREATE INDEX IF NOT EXISTS idx_phone_corrections_user ON phone_corrections_audit(user_id);

-- Index para buscar por data
CREATE INDEX IF NOT EXISTS idx_phone_corrections_created ON phone_corrections_audit(created_at DESC);

-- Habilitar RLS
ALTER TABLE phone_corrections_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem visualizar suas próprias correções
CREATE POLICY "Users can view their own corrections"
  ON phone_corrections_audit
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Sistema pode inserir correções
CREATE POLICY "System can insert corrections"
  ON phone_corrections_audit
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON TABLE phone_corrections_audit IS 'Auditoria de correções automáticas aplicadas aos números de telefone';
COMMENT ON COLUMN phone_corrections_audit.source IS 'Origem da correção: onboarding, phone_collection ou settings';
COMMENT ON COLUMN phone_corrections_audit.corrections_applied IS 'Array JSON com detalhes das correções aplicadas';