-- Adicionar colunas para gerenciamento avançado de tutoriais
ALTER TABLE section_tutorials 
ADD COLUMN IF NOT EXISTS skipped BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed TIMESTAMPTZ DEFAULT NOW();

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_section_tutorials_skipped 
  ON section_tutorials(user_id, skipped);

-- Adicionar comentários para documentação
COMMENT ON COLUMN section_tutorials.skipped IS 'Se o usuário pulou o tutorial (não mostra automaticamente novamente)';
COMMENT ON COLUMN section_tutorials.progress IS 'Índice do último passo visto no tutorial';
COMMENT ON COLUMN section_tutorials.last_viewed IS 'Última vez que o tutorial foi visualizado';