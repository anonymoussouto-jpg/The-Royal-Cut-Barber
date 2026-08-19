-- Add payment columns to appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Grant access
GRANT UPDATE(asaas_payment_id, asaas_customer_id, payment_status) ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
