-- ========================================
-- PARTE 1: Remover função problemática
-- ========================================

DROP FUNCTION IF EXISTS public.notify_n8n() CASCADE;

-- ========================================
-- PARTE 2: Criar trigger para auto-criar profiles
-- ========================================

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar o trigger que executa a função quando um usuário é criado
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- PARTE 3: Sincronizar usuários existentes sem perfil
-- ========================================

-- Inserir profiles para todos os usuários que não têm perfil
INSERT INTO public.profiles (id, email, nome_completo, created_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'nome_completo', ''),
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;