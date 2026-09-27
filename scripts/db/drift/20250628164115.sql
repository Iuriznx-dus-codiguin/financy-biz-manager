-- profiles.telefone foi criada direto no banco (sem migração).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefone text;
