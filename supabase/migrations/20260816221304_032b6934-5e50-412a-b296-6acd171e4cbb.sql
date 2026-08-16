-- 1. Add 'barber' to app_role enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'barber') THEN
        ALTER TYPE public.app_role ADD VALUE 'barber';
    END IF;
END $$;

-- 2. Update barbers table
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS email text;

-- 3. Update RLS policies
-- Note: Dropping existing policies to recreate them with barber support
DROP POLICY IF EXISTS "Admins can manage all barbers" ON public.barbers;
DROP POLICY IF EXISTS "Barbers can view their own profile" ON public.barbers;
DROP POLICY IF EXISTS "Anyone can view barbers" ON public.barbers;

CREATE POLICY "Admins can manage all barbers"
ON public.barbers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Barbers can view their own profile"
ON public.barbers
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

CREATE POLICY "Anyone can view barbers"
ON public.barbers
FOR SELECT
TO anon, authenticated
USING (true);

-- Appointments policies
DROP POLICY IF EXISTS "Barbers can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Barbers can update their own appointments" ON public.appointments;

CREATE POLICY "Barbers can view their own appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.barbers 
    WHERE id = appointments.barber_id 
    AND auth_user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Barbers can update their own appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.barbers 
    WHERE id = appointments.barber_id 
    AND auth_user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Profiles access
DROP POLICY IF EXISTS "Barbers can view clients who booked with them" ON public.profiles;

CREATE POLICY "Barbers can view clients who booked with them"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.appointments
    JOIN public.barbers ON barbers.id = appointments.barber_id
    WHERE appointments.client_id = profiles.id
    AND barbers.auth_user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
  OR auth.uid() = id
);
