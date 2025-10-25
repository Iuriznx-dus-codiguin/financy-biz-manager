-- Remover constraint antiga se existir
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS unique_telefone;

-- Criar função de normalização
CREATE OR REPLACE FUNCTION normalize_phone_br(phone_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
  digits_only text;
BEGIN
  IF phone_input IS NULL OR TRIM(phone_input) = '' THEN
    RETURN NULL;
  END IF;
  
  cleaned := REGEXP_REPLACE(phone_input, '[^0-9+]', '', 'g');
  
  IF cleaned LIKE '+55%' THEN
    RETURN cleaned;
  END IF;
  
  digits_only := REGEXP_REPLACE(cleaned, '[^0-9]', '', 'g');
  
  IF digits_only LIKE '55%' AND LENGTH(digits_only) >= 12 THEN
    RETURN '+' || digits_only;
  END IF;
  
  IF LENGTH(digits_only) = 11 THEN
    RETURN '+55' || digits_only;
  END IF;
  
  IF LENGTH(digits_only) = 10 AND digits_only ~ '^[1-9][1-9][0-9]{8}$' THEN
    RETURN '+55' || SUBSTRING(digits_only FROM 1 FOR 2) || '9' || SUBSTRING(digits_only FROM 3);
  END IF;
  
  RETURN NULL;
END;
$$;

-- Criar tabela temporária para identificar duplicatas
CREATE TEMP TABLE temp_phone_normalized AS
SELECT 
  id, 
  telefone as original_phone,
  normalize_phone_br(telefone) as normalized_phone,
  created_at,
  ROW_NUMBER() OVER (PARTITION BY normalize_phone_br(telefone) ORDER BY created_at ASC) as rn
FROM profiles
WHERE telefone IS NOT NULL AND telefone != '';

-- Limpar telefones duplicados (mantém apenas o primeiro cadastrado)
UPDATE profiles
SET telefone = NULL
WHERE id IN (
  SELECT id FROM temp_phone_normalized WHERE normalized_phone IS NOT NULL AND rn > 1
);

-- Log das duplicatas removidas
DO $$
DECLARE
  removed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO removed_count FROM temp_phone_normalized WHERE rn > 1;
  RAISE NOTICE 'Telefones duplicados removidos: %', removed_count;
END $$;

-- Normalizar todos os telefones restantes
UPDATE profiles
SET telefone = normalize_phone_br(telefone)
WHERE telefone IS NOT NULL AND telefone != '';

-- Limpar telefones inválidos que não puderam ser normalizados
UPDATE profiles
SET telefone = NULL
WHERE telefone IS NOT NULL 
  AND telefone != ''
  AND normalize_phone_br(telefone) IS NULL;

-- Criar índice único
CREATE UNIQUE INDEX idx_profiles_telefone_unique 
ON profiles(telefone) 
WHERE telefone IS NOT NULL AND telefone != '';

-- Criar trigger para normalizar automaticamente
CREATE OR REPLACE FUNCTION trigger_normalize_phone_before_save()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.telefone IS NOT NULL AND NEW.telefone != '' THEN
    NEW.telefone := normalize_phone_br(NEW.telefone);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_phone_trigger ON profiles;

CREATE TRIGGER normalize_phone_trigger
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_normalize_phone_before_save();

COMMENT ON FUNCTION normalize_phone_br IS 'Normaliza números de telefone brasileiros para o formato E.164 (+55DDDNÚMERO)';
COMMENT ON INDEX idx_profiles_telefone_unique IS 'Garante que não haja telefones duplicados no sistema';