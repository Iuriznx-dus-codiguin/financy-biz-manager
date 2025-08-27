-- Criar função para obter dados do usuário para personalização do dashboard principal
CREATE OR REPLACE FUNCTION get_user_profile_data(user_id uuid)  
RETURNS TABLE (
  user_type text,
  nome_preferido text,
  subscription_tier text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(od.user_type, 'pessoal') as user_type,
    COALESCE(od.nome_preferido, p.nome_completo, split_part(p.email, '@', 1)) as nome_preferido,
    COALESCE(cs.plan_type, s.subscription_tier, 'free') as subscription_tier
  FROM profiles p
  LEFT JOIN onboarding_data od ON p.id = od.user_id
  LEFT JOIN customer_subscriptions cs ON p.id = cs.user_id OR p.email = cs.email
  LEFT JOIN subscribers s ON p.id = s.user_id OR p.email = s.email
  WHERE p.id = user_id;
END;
$$;