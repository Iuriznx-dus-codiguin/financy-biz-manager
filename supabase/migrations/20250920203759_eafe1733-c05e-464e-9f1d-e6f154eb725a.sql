-- Fix security issues with masked views by replacing them with secure views
-- Drop existing unsafe views
DROP VIEW IF EXISTS public.receitas_masked CASCADE;
DROP VIEW IF EXISTS public.despesas_masked CASCADE;

-- Create secure receitas_masked view with RLS-like behavior
CREATE OR REPLACE VIEW public.receitas_masked
WITH (security_barrier = true)
AS
SELECT 
  id,
  user_id,
  data,
  valor,
  categoria,
  categoria_personalizada,
  forma_pagamento,
  status,
  recorrente,
  created_at,
  dashboard_id,
  mask_sensitive_data(descricao, 'partial') as descricao,
  mask_sensitive_data(cliente, 'partial') as cliente
FROM public.receitas
WHERE user_id = auth.uid();

-- Create secure despesas_masked view with RLS-like behavior
CREATE OR REPLACE VIEW public.despesas_masked
WITH (security_barrier = true)
AS
SELECT 
  id,
  user_id,
  data,
  valor,
  categoria,
  categoria_personalizada,
  forma_pagamento,
  status,
  recorrente,
  created_at,
  dashboard_id,
  mask_sensitive_data(descricao, 'partial') as descricao,
  mask_sensitive_data(fornecedor, 'partial') as fornecedor
FROM public.despesas
WHERE user_id = auth.uid();