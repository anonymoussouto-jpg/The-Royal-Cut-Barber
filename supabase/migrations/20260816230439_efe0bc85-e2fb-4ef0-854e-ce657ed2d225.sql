
-- 1. Add is_active to services
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. Add is_available and rating to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 4.5;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'products_rating_check') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_rating_check CHECK (rating >= 0 AND rating <= 5);
  END IF;
END $$;

-- 3. Add payment_status to appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'appointments_payment_status_check') THEN
    ALTER TABLE public.appointments ADD CONSTRAINT appointments_payment_status_check CHECK (payment_status IN ('pending', 'paid', 'refunded', 'waived'));
  END IF;
END $$;
