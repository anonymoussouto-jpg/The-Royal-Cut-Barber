-- Revoke public access to fix linter warnings
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Clean up the old admin if needed
DELETE FROM auth.users WHERE email = 'old_admin@theroyalcut.com';
