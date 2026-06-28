ALTER TABLE public.receitas
ADD COLUMN IF NOT EXISTS cakto_transaction_id text;

CREATE UNIQUE INDEX IF NOT EXISTS receitas_user_cakto_transaction_unique
ON public.receitas (user_id, cakto_transaction_id)
WHERE cakto_transaction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payment_notifications_transaction_id_unique
ON public.payment_notifications (transaction_id)
WHERE transaction_id IS NOT NULL;