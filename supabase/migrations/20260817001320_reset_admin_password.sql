-- Update the admin user password explicitly
UPDATE auth.users 
SET encrypted_password = crypt('RoyalAdmin2026!', gen_salt('bf')),
    updated_at = now()
WHERE email = 'admin@theroyalcut.com';

-- Ensure the identity is also correctly linked
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@theroyalcut.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Ensure identity exists
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (v_user_id, v_user_id, format('{"sub":"%s","email":"admin@theroyalcut.com","email_verified":true}', v_user_id)::jsonb, 'email', v_user_id, now(), now(), now())
    ON CONFLICT (provider, provider_id) DO NOTHING;
    
    -- Ensure admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Grant permissions (standard block)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
