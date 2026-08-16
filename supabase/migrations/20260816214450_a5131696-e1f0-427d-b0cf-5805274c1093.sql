-- Fixes for booking flow and system settings

-- 1. Modify profiles to support guest users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;

-- 2. Modify appointments to store client info directly and allow guest client_id
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_phone TEXT;

-- 3. Update RLS and Grants for profiles to allow guest creation
GRANT SELECT, INSERT ON public.profiles TO anon;

-- Drop existing policies if they might conflict or we need to replace them
-- (In Supabase migrations, it's safer to use IF NOT EXISTS or DROP/CREATE)
DROP POLICY IF EXISTS "Allow anon to search profiles by phone" ON public.profiles;
CREATE POLICY "Allow anon to search profiles by phone" ON public.profiles
    FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon to create guest profiles" ON public.profiles;
CREATE POLICY "Allow anon to create guest profiles" ON public.profiles
    FOR INSERT TO anon WITH CHECK (is_guest = true);

-- 4. Update RLS and Grants for appointments to allow anon booking
GRANT INSERT ON public.appointments TO anon;

DROP POLICY IF EXISTS "Allow anon to book appointments" ON public.appointments;
CREATE POLICY "Allow anon to book appointments" ON public.appointments
    FOR INSERT TO anon WITH CHECK (true);

-- 5. Fix system_settings grants for anon (if needed for PIX key)
GRANT SELECT ON public.system_settings TO anon;
DROP POLICY IF EXISTS "Allow anon to read pix_key" ON public.system_settings;
CREATE POLICY "Allow anon to read pix_key" ON public.system_settings
    FOR SELECT TO anon USING (key = 'pix_key');
