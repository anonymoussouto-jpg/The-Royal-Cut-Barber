DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 1. Get or Create user in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@theroyalcut.com';
  
  IF v_user_id IS NULL THEN
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

    -- Identity record is required for login
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id,
      v_user_id,
      format('{"sub":"%s","email":"admin@theroyalcut.com","email_verified":true}', v_user_id)::jsonb,
      'email',
      now(),
      now(),
      now()
    );
  ELSE
    UPDATE auth.users 
    SET encrypted_password = crypt('RoyalAdmin2026!', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider": "email", "providers": ["email"]}'::jsonb)
    WHERE id = v_user_id;
  END IF;

  -- 2. Ensure Role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Ensure Profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (v_user_id, 'Admin Royal')
  ON CONFLICT (id) DO UPDATE SET full_name = 'Admin Royal';

END $$;