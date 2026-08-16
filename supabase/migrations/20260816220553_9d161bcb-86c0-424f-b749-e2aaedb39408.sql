-- Update orders table for Asaas integration
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT,
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS net_value DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('PIX', 'CREDIT_CARD', 'BOLETO', 'IN_PERSON'));
