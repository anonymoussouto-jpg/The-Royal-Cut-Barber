-- 1. Correct any corrupted metadata for the admin
UPDATE auth.users 
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'admin@theroyalcut.com';

-- 2. Ensure identity is perfectly aligned
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
SELECT id, id, format('{"sub":"%s","email":"admin@theroyalcut.com","email_verified":true}', id)::jsonb, 'email', id, now(), now(), now()
FROM auth.users WHERE email = 'admin@theroyalcut.com'
ON CONFLICT (provider, provider_id) DO NOTHING;

-- 3. Standardize has_role to avoid any schema or permission ambiguities
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
