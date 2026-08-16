-- 1. Fix SECURITY DEFINER function permissions for has_role
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon;

-- 2. Fix SECURITY DEFINER function permissions for handle_new_user
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- 3. user_roles policies
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles" ON public.user_roles
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
