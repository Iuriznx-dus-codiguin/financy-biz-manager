DROP INDEX IF EXISTS public.payment_notifications_transaction_id_unique;

CREATE UNIQUE INDEX IF NOT EXISTS payment_notifications_transaction_id_unique
ON public.payment_notifications (transaction_id);