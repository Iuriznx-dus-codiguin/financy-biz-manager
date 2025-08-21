-- Adicionar coluna settings na tabela profiles para armazenar configurações do usuário
ALTER TABLE public.profiles 
ADD COLUMN settings jsonb DEFAULT NULL;