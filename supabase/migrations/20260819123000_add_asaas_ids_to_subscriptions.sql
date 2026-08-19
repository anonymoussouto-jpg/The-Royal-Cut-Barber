ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

GRANT ALL ON public.subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
