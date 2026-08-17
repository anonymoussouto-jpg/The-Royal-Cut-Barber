-- Fix for security linter warning 0029
-- Revoke execution from authenticated users for has_role
-- The function should only be executed by the backend/server-side code using elevated privileges if necessary, 
-- or via RLS which uses the owner's privileges.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;

-- Ensure service_role still has access
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
