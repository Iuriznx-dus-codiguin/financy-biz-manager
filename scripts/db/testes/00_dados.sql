-- Dados de teste (rodam como postgres, fora de transação de teste).
-- A = Plus Pessoal ativo; B = aguardando pagamento; C = PRO Empresarial ativo; D = desenvolvedor.
INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@teste.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@teste.com'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@teste.com'),
  ('dddddddd-0000-0000-0000-000000000004', 'd@teste.com')
ON CONFLICT (id) DO NOTHING;

UPDATE public.user_subscriptions SET status = 'active', subscription_type = 'personal',
  plan_id = 'personal_plus_monthly', plan_name = 'Plus Pessoal - Mensal', expires_at = now() + interval '20 days',
  features = '{"max_dashboards": 1, "ai_requests_per_month": -1, "team_members": 1, "whatsapp_integration": true}'
WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';

UPDATE public.user_subscriptions SET status = 'active', subscription_type = 'business',
  plan_id = 'business_pro_monthly', plan_name = 'PRO Empresarial - Mensal', expires_at = now() + interval '20 days',
  features = '{"max_dashboards": 2, "ai_requests_per_month": -1, "team_members": -1, "whatsapp_integration": true}'
WHERE user_id = 'cccccccc-0000-0000-0000-000000000003';

INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier)
VALUES ('dddddddd-0000-0000-0000-000000000004', 'd@teste.com', true, 'developer')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.user_dashboards (id, user_id, name, type, is_default) VALUES
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Pessoal', 'personal', true),
  ('bbbbbbbb-1111-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'Dashboard Principal', 'business', true),
  ('cccccccc-1111-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000003', 'Empresa', 'business', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.receitas (user_id, dashboard_id, data, descricao, categoria, valor, forma_pagamento)
SELECT 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', current_date, 'Salário', 'salario', 5000, 'pix'
WHERE NOT EXISTS (SELECT 1 FROM public.receitas WHERE descricao = 'Salário');
