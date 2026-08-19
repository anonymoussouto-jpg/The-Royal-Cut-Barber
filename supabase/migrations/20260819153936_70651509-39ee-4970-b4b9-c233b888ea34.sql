-- Revoke public execute to fix lint 0028 and 0029
REVOKE EXECUTE ON FUNCTION public.increment_barber_points(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_barber_points(UUID, INTEGER) FROM authenticated;

-- Ensure service_role can still execute it
GRANT EXECUTE ON FUNCTION public.increment_barber_points(UUID, INTEGER) TO service_role;

-- Set search path to fix lint 0011
ALTER FUNCTION public.increment_barber_points(UUID, INTEGER) SET search_path = public;