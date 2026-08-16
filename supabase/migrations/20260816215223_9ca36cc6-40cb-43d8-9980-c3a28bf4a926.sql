-- Hardening the calculate_barber_points function
ALTER FUNCTION public.calculate_barber_points() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.calculate_barber_points() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.calculate_barber_points() TO service_role;
