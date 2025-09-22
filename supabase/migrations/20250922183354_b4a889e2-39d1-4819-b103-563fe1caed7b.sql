-- Atualizar função handle_new_user para incluir telefone
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, nome_completo, telefone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nome_completo', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'telefone', '')
  );
  RETURN NEW;
END;
$function$;