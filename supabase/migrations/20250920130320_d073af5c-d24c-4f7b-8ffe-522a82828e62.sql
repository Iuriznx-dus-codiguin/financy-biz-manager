-- Habilitar realtime na tabela subscribers
ALTER TABLE public.subscribers REPLICA IDENTITY FULL;

-- Adicionar à publicação realtime se ainda não estiver
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscribers;