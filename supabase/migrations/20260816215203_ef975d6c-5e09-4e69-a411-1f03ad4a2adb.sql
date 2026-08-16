-- Function to calculate and add barber points
CREATE OR REPLACE FUNCTION public.calculate_barber_points()
RETURNS TRIGGER AS $$
DECLARE
    points_to_add INTEGER;
BEGIN
    -- Only trigger when status changes to 'completed'
    IF (OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed') THEN
        -- Rule: 10 fixed points + 1 point for every R$10,00 of total_price
        points_to_add := 10 + FLOOR(COALESCE(NEW.total_price, 0) / 10);
        
        -- Update the profile
        UPDATE public.profiles
        SET barber_points = COALESCE(barber_points, 0) + points_to_add
        WHERE id = NEW.client_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for points
DROP TRIGGER IF EXISTS on_appointment_completed_add_points ON public.appointments;
CREATE TRIGGER on_appointment_completed_add_points
    AFTER UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_barber_points();

-- Policy to allow admins to update profiles (specifically points)
DROP POLICY IF EXISTS "Admins can update barber points" ON public.profiles;
CREATE POLICY "Admins can update barber points" 
ON public.profiles
FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure columns exist and have defaults
ALTER TABLE public.profiles ALTER COLUMN barber_points SET DEFAULT 0;
UPDATE public.profiles SET barber_points = 0 WHERE barber_points IS NULL;

-- Grants
GRANT UPDATE (barber_points) ON public.profiles TO authenticated;
