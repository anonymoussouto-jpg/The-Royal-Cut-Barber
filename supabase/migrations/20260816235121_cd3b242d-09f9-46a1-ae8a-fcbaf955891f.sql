-- 1. Ensure the admin user exists and has the correct role
DO $$ 
DECLARE 
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@theroyalcut.com';
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- 2. Fix user_roles permissions to allow checking roles during login/guard
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- Relax user_roles RLS slightly to allow users to see their own roles 
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Ensure profiles trigger has correct permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 4. Fix potential permission issue in handle_new_user
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER SET search_path = public;

-- 5. Ensure admin can always manage roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
