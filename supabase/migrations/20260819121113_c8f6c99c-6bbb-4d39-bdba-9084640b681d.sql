ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
GRANT UPDATE ON public.subscriptions TO service_role;