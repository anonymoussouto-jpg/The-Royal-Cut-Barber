DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 1. Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@theroyalcut.com';
  
  -- 2. Delete existing user and identities to be 100% fresh
  IF v_user_id IS NOT NULL THEN
    DELETE FROM auth.identities WHERE user_id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;

  -- 3. Create fresh user (letting confirmed_at be DEFAULT)
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_super_admin
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'admin@theroyalcut.com',
    crypt('RoyalAdmin2026!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Admin Royal"}',
    now(),
    now(),
    false
  );

  -- 4. Create the identity record (Crucial for signInWithPassword)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_user_id,
    format('{"sub":"%s","email":"admin@theroyalcut.com","email_verified":true}', v_user_id)::jsonb,
    'email',
    v_user_id,
    now(),
    now(),
    now()
  );

  -- 5. Link role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 6. Ensure profile exists (linked to new ID)
  INSERT INTO public.profiles (id, full_name)
  VALUES (v_user_id, 'Admin Royal')
  ON CONFLICT (id) DO UPDATE SET full_name = 'Admin Royal';

END $$;