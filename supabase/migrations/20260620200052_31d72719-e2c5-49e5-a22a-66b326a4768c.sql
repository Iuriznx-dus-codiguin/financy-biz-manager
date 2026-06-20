-- Defense-in-depth on equipe_membros: ensure RLS, revoke anon, document grants explicitly.
-- Existing policies and RLS are already in place; this migration only documents and tightens.

ALTER TABLE public.equipe_membros ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.equipe_membros FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipe_membros TO authenticated;
GRANT ALL ON public.equipe_membros TO service_role;

-- Drop unused masked-data RPC functions (RLS on receitas/despesas already enforces user isolation).
DROP FUNCTION IF EXISTS public.get_receitas_masked();
DROP FUNCTION IF EXISTS public.get_despesas_masked();