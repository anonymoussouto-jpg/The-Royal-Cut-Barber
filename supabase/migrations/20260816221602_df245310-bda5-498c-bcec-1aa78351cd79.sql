ALTER TABLE public.services ADD COLUMN IF NOT EXISTS owner_percentage integer DEFAULT 50;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS barber_percentage integer DEFAULT 50;

-- Update existing services to have 50/50 split if they don't have it
UPDATE public.services SET owner_percentage = 50, barber_percentage = 50 WHERE owner_percentage IS NULL;
